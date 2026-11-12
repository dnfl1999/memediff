import { DAY, parseRepo, parseToken, summarize, compareSnapshots } from './core.js';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const fail = message => { throw new Error(message); };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function shape(x, required, optional = []) {
  if (!object(x) || required.some(k => !Object.hasOwn(x, k)) || Object.keys(x).some(k => ![...required, ...optional].includes(k))) fail('Invalid report structure or unsupported fields.');
}
function text(x, max, label) { if (typeof x !== 'string' || x.length > max) fail(`Invalid ${label}.`); }
function date(x) {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x)) fail('Invalid date: use a UTC ISO timestamp.');
  const ms = Date.parse(x);
  if (!Number.isFinite(ms) || ms < 0 || new Date(ms).toISOString() !== (x.length === 20 ? x.replace('Z', '.000Z') : x)) fail('Invalid calendar date.');
  return ms;
}
function list(x, max) { if (!Array.isArray(x) || x.length > max) fail('Invalid array or collection limit exceeded.'); }
function url(value, host, prefix) {
  text(value, 4096, 'evidence URL');
  let u; try { u = new URL(value); } catch { fail('Invalid evidence URL.'); }
  if (u.protocol !== 'https:' || u.hostname !== host || u.port || u.username || u.password || !u.pathname.toLowerCase().startsWith(prefix.toLowerCase())) fail('Invalid or unrelated evidence URL.');
}
export function validateImport(data, current) {
  shape(data, ['schema','source','repo','token','branch','fetchedAt','since','description','fork','parent','archived','commits','releases','metrics','coverage','remaining','evidence','warnings','methodology'], ['comparison','selectedDays','baselineOrigin']);
  if (data.schema !== 1) fail('Unsupported schema. Choose a MemeDiff schema 1 JSON report.');
  if (data.source !== 'github-live') fail('Unsupported source. Expected github-live. This label does not authenticate a file.');
  text(data.repo, 140, 'repository');
  if (parseRepo(data.repo) !== data.repo || data.repo.includes('://')) fail('Invalid canonical repository.');
  text(data.token, 44, 'token CA');
  if (parseToken(data.token) !== data.token) fail('Invalid token CA.');
  if (data.branch !== null) { text(data.branch, 1024, 'branch'); if (!data.branch || data.branch.startsWith('-') || /[\x00-\x20\x7f~^:?*\[\\]|\.\.|@\{|\/\/|\/$|^\/|\.$/.test(data.branch) || data.branch.split('/').some(p=>p.startsWith('.') || p.endsWith('.lock'))) fail('Invalid branch.'); }
  if (!current || current.source !== 'github-live') fail('Load a current live GitHub report first.');
  for (const [key, label] of [['repo','repository'],['token','token CA'],['branch','branch']]) if (data[key] !== current[key]) fail(`Different ${label}. Import must match the current report exactly, including an empty CA.`);
  const observed = date(data.fetchedAt), since = date(data.since);
  if (observed > date(current.fetchedAt)) fail('The previous report is newer than the current observation. Run a new live query first.');
  if (observed - since !== 30 * DAY) fail('Invalid date range: the report must cover a 30-day collection window.');
  for (const k of ['fork','archived']) if (typeof data[k] !== 'boolean') fail(`Invalid ${k}.`);
  if (data.parent !== null) { text(data.parent, 140, 'parent repository'); parseRepo(data.parent); }
  text(data.description, 400, 'description'); text(data.methodology, 4096, 'methodology');
  shape(data.coverage, ['commits','releases','maxCommits','maxReleases']);
  if (typeof data.coverage.commits !== 'boolean' || typeof data.coverage.releases !== 'boolean' || data.coverage.maxCommits !== 1000 || data.coverage.maxReleases !== 500) fail('Invalid collection coverage.');
  list(data.commits, 1000); list(data.releases, 500);
  const shas = new Set(), ids = new Set();
  for (const c of data.commits) {
    shape(c, ['sha','date','message','author','url']);
    if (typeof c.sha !== 'string' || !/^[0-9a-f]{40}$/.test(c.sha) || shas.has(c.sha)) fail('Invalid or duplicate commit SHA.');
    shas.add(c.sha); text(c.message, 240, 'commit message');
    if (c.author !== null) { text(c.author, 100, 'author'); if (!/^[a-zA-Z0-9-]+(?:\[bot\])?$/.test(c.author)) fail('Invalid author.'); }
    if (c.url !== `https://github.com/${data.repo}/commit/${c.sha}`) fail('Invalid commit evidence URL.');
    const t = date(c.date); if (t < since || t > observed) fail('Commit date is outside the observation window.');
  }
  if (data.branch === null && data.commits.length) fail('Commits require a branch.');
  for (const r of data.releases) {
    shape(r, ['id','name','date','prerelease','url']);
    if (!Number.isSafeInteger(r.id) || r.id <= 0 || ids.has(r.id)) fail('Invalid or duplicate release ID.');
    ids.add(r.id); text(r.name, 180, 'release name');
    if (typeof r.prerelease !== 'boolean') fail('Invalid prerelease flag.');
    const t = date(r.date); if (t < since || t > observed) fail('Release date is outside the observation window.');
    url(r.url, 'github.com', `/${data.repo}/releases/`);
  }
  shape(data.metrics, ['7','30']);
  const metrics = summarize(data.commits, data.releases, observed);
  for (const days of [7,30]) {
    shape(data.metrics[days], ['commits','releases','contributors','unattributed']);
    for (const k of Object.keys(metrics[days])) if (!Number.isSafeInteger(data.metrics[days][k]) || data.metrics[days][k] !== metrics[days][k]) fail('Damaged report: metrics do not match the observed records.');
  }
  if (data.remaining !== null && !(typeof data.remaining === 'string' && /^\d{1,10}$/.test(data.remaining))) fail('Invalid remaining API request count.');
  list(data.evidence, 16); for (const u of data.evidence) { url(u, 'api.github.com', '/repos/'); }
  list(data.warnings, 32); for (const w of data.warnings) text(w, 4096, 'warning');
  if (Object.hasOwn(data,'selectedDays') && ![7,30].includes(data.selectedDays)) fail('Invalid selected window.');
  if (Object.hasOwn(data,'comparison') && data.comparison !== null && !object(data.comparison)) fail('Invalid comparison structure.');
  if (Object.hasOwn(data,'baselineOrigin') && data.baselineOrigin !== 'imported-json') fail('Invalid baseline origin.');
  // Drop exported comparison and window selection: always recompute, never trust them.
  const { comparison, selectedDays, baselineOrigin, ...snapshot } = data;
  return snapshot;
}
export function parseImport(raw, current) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES) fail('File exceeds the 2 MiB limit.');
  let data;
  try { data = JSON.parse(raw, (k, v) => { if (['__proto__','prototype','constructor'].includes(k)) fail('Unsafe JSON key.'); return v; }); }
  catch { fail('Invalid JSON or unsafe structure. Choose an unmodified MemeDiff export.'); }
  return validateImport(data, current);
}
export async function readImportFile(file, current) {
  if (!file || file.size === 0 || file.size > MAX_IMPORT_BYTES) fail('Choose a non-empty JSON file up to 2 MiB.');
  if (!/\.json$/i.test(file.name)) fail('Choose a .json report file.');
  let raw; try { raw = await file.text(); } catch { fail('Could not read the selected file.'); }
  return parseImport(raw, current);
}
export function importedComparison(previous, current) {
  const result = compareSnapshots(previous, current);
  if (!result) fail('This imported report cannot be compared with the current report.');
  return { ...result, partial: result.partial || !previous.coverage.releases || !current.coverage.releases, baselineOrigin: 'imported-json', note: 'Baseline from imported JSON: unverified and editable, not an official or signed certificate. ' + result.note };
}
