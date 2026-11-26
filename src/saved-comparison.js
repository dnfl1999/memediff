import { DAY, isGitBranch, parseRepo, parseToken, safeLink, utcMillis } from './core.js';
import { comparePeriods } from './period-comparison.js';
import { authorSource, githubLogin, iso, periodExportFormat, periodKeys, releaseSource, savedFilesExportFormat } from './period-evidence.js';
import { MAX_PERIOD_JSON_BYTES, periodExportData } from './period-export.js';
import { checkJsonDepth, hasExactKeys as exact, parseUntrustedJSON, readLocalJSONText } from './local-json.js';
import { commitSource } from './sha-explorer.js';

const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (value, expected) => exact(value, Object.keys(expected)) && Object.entries(expected).every(([key, other]) => value[key] === other);
const timestamp = value => {
  const number = utcMillis(value);
  return Number.isFinite(number) && value === iso(number);
};
const boundedText = (value, max) => typeof value === 'string' && value.length <= max;
const boundedList = (value, max) => Array.isArray(value) && value.length <= max;
const safeInteger = value => Number.isSafeInteger(value) && value > 0;
const flag = value => typeof value === 'boolean';

function validAPI(value, { repo, branch, since, fetchedAt }) {
  if (!boundedText(value, 2048) || safeLink(value) !== value || value.includes('#')) return false;
  const url = new URL(value), path = url.pathname.toLowerCase(), root = `/repos/${repo}`;
  if (url.hostname !== 'api.github.com') return false;
  if (path === root) return !value.includes('?');
  const commits = path === `${root}/commits`;
  if (!commits && path !== `${root}/releases`) return false;
  const params = [...url.searchParams];
  if (new Set(params.map(([key]) => key)).size !== params.length) return false;
  const allowed = {
    per_page: item => item === '100',
    page: item => /^\d{1,2}$/.test(item) && Number(item) >= 1 && Number(item) <= (commits ? 10 : 5)
  };
  if (commits && branch) {
    // v2.1 widens server bounds to whole seconds, then filters using exact UTC milliseconds.
    allowed.sha = item => item === branch;
    allowed.since = item => utcMillis(item) === Math.floor(utcMillis(since) / 1000) * 1000;
    allowed.until = item => utcMillis(item) === Math.ceil(utcMillis(fetchedAt) / 1000) * 1000;
  }
  return (!commits || branch !== null) && params.every(([key, item]) => Object.hasOwn(allowed, key) && allowed[key](item));
}

function reportFields(file) {
  const { repository, collection, observedAtUtc, userSuppliedTokenCA } = file;
  if (!exact(repository, ['name', 'branch', 'url']) || !boundedText(repository.name, 140) ||
      repository.url !== `https://github.com/${repository.name}` ||
      (repository.branch !== null && !isGitBranch(repository.branch))) fail('Invalid repository, branch, or GitHub source link.');
  let repo;
  try { repo = parseRepo(repository.name); } catch { fail('Invalid GitHub repository.'); }
  if (repo !== repository.name) fail('Use the canonical GitHub repository name.');
  if (userSuppliedTokenCA !== null) {
    if (!boundedText(userSuppliedTokenCA, 44) || !userSuppliedTokenCA) fail('Invalid user-supplied Solana address.');
    if (parseToken(userSuppliedTokenCA) !== userSuppliedTokenCA) fail('Invalid user-supplied Solana address.');
  }
  if (file.source !== 'github-live' || !timestamp(observedAtUtc) ||
      !exact(collection, ['startUtc', 'endInclusiveUtc', 'durationDays', 'coverage', 'limits', 'apiEvidence']) ||
      !timestamp(collection.startUtc) || collection.endInclusiveUtc !== observedAtUtc ||
      utcMillis(observedAtUtc) - utcMillis(collection.startUtc) !== 30 * DAY || collection.durationDays !== 30) {
    fail('Invalid observation or 30-day UTC collection range.');
  }
  if (!exact(collection.coverage, ['commitsComplete', 'releasesComplete']) ||
      !Object.values(collection.coverage).every(flag) ||
      !exact(collection.limits, ['commits', 'releases']) ||
      ![null, 1000].includes(collection.limits.commits) || ![null, 500].includes(collection.limits.releases)) {
    fail('Invalid collection coverage or limits.');
  }
  const report = { repo, branch: repository.branch, token: userSuppliedTokenCA ?? '', source: file.source,
    since: collection.startUtc, fetchedAt: observedAtUtc, evidence: collection.apiEvidence };
  if (!boundedList(report.evidence, 16) || new Set(report.evidence).size !== report.evidence.length ||
      !report.evidence.every(value => validAPI(value, report))) fail('Invalid or unrelated GitHub API evidence URL.');
  return report;
}

function commitRecord(row, { repo }) {
  if (!exact(row, ['sha', 'committedAtUtc', 'url', 'author']) || typeof row.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(row.sha) ||
      !timestamp(row.committedAtUtc) || row.url !== commitSource(repo, row.sha) ||
      (row.author !== null && githubLogin(row.author) !== row.author)) fail('Invalid commit SHA, timestamp, author or GitHub link.');
  return { ...row, date: row.committedAtUtc };
}

function validReleaseLink(repo, url) {
  if (url === null) return true;
  if (typeof url !== 'string' || /[?#]/.test(url) || releaseSource(repo, url) !== url) return false;
  const path = new URL(url).pathname.toLowerCase(), prefix = `/${repo}/releases/tag/`;
  return path.startsWith(prefix) && path.length > prefix.length;
}

function releaseRecord(row, { repo }) {
  if (!exact(row, ['id', 'name', 'publishedAtUtc', 'prerelease', 'url']) || !safeInteger(row.id) ||
      (row.name !== null && !boundedText(row.name, 180)) || !timestamp(row.publishedAtUtc) ||
      (row.prerelease !== null && !flag(row.prerelease)) || !validReleaseLink(repo, row.url)) fail('Invalid release ID, timestamp or GitHub link.');
  return { ...row, date: row.publishedAtUtc };
}

function authorRecord(row) {
  if (!exact(row, ['login', 'url']) || !githubLogin(row.login) || row.url !== authorSource(row.login)) fail('Invalid linked GitHub author.');
  return row;
}

function recordMap(rows, max, label, decode, identity, report) {
  if (!boundedList(rows, max)) fail(`Invalid ${label} list or collection limit exceeded.`);
  const map = new Map();
  for (const entry of rows) {
    const row = decode(entry, report), id = identity(row);
    if (map.has(id)) fail(`Duplicate ${label} evidence.`);
    map.set(id, row);
  }
  return map;
}

const keysOf = (a, b) => a.size === b.length && b.every(id => a.has(id));

export function validSavedPeriodCoverage(coverage, collection) {
  return exact(coverage, ['commitsComplete', 'releasesComplete', 'releaseTypesComplete']) &&
    Object.values(coverage).every(flag) &&
    (!coverage.commitsComplete || collection.coverage.commitsComplete) &&
    (!coverage.releasesComplete || collection.coverage.releasesComplete);
}

function inspectPeriod(period, report, collection) {
  if (!exact(period, ['selected', 'effective', 'durationMs', 'clipped', 'coverage', 'counts', 'commits', 'releases', 'authors']) ||
      !exact(period.selected, ['startDateUtc', 'endDateUtc']) ||
      !validSavedPeriodCoverage(period.coverage, collection)) fail('Invalid period structure or collection coverage.');
  return {
    dates: { start: period.selected.startDateUtc, end: period.selected.endDateUtc },
    commits: recordMap(period.commits, collection.limits.commits ?? 1000, 'commit SHA', commitRecord, row => row.sha.toLowerCase(), report),
    releases: recordMap(period.releases, collection.limits.releases ?? 500, 'release ID', releaseRecord, row => row.id, report),
    authors: recordMap(period.authors, collection.limits.commits ?? 1000, 'author', authorRecord, row => row.login.toLowerCase(), report)
  };
}

function union(first, second, max) {
  const rows = new Map(first);
  for (const [id, row] of second) {
    if (rows.has(id) && !same(row, rows.get(id))) fail('The same evidence differs between the two periods.');
    if (!rows.has(id)) rows.set(id, row);
  }
  if (rows.size > max) fail('Combined evidence exceeds the collection limit.');
  return [...rows.values()];
}

function validateSavedComparison(file) {
  if (object(file) && file.schema === 1) fail('Choose a Period Comparison JSON. Snapshot files open in Import Previous Report.');
  if (file?.format === savedFilesExportFormat) fail('This file is a Saved Files Comparison export. Choose an original version 1 Period Comparison JSON.');
  if (!object(file) || file.format !== periodExportFormat) fail('Choose a MemeDiff Period Comparison JSON.');
  if (file.version !== 1) fail('Unsupported Period Comparison version. Choose a version 1 JSON.');
  if (!exact(file, ['format', 'version', 'repository', 'userSuppliedTokenCA', 'source', 'observedAtUtc', 'collection',
    'periods', 'difference', 'unequalDurations', 'overlap', 'notes']) ||
    !exact(file.periods, periodKeys) || !boundedList(file.notes, 5) || !file.notes.every(note => boundedText(note, 512))) {
    fail('Invalid comparison structure or unsupported fields.');
  }
  const report = reportFields(file);
  const a = inspectPeriod(file.periods.a, report, file.collection), b = inspectPeriod(file.periods.b, report, file.collection);
  const { commitsComplete, releasesComplete } = file.periods.a.coverage;
  if (commitsComplete !== file.periods.b.coverage.commitsComplete || releasesComplete !== file.periods.b.coverage.releasesComplete) {
    fail('The periods use inconsistent collection coverage.');
  }
  report.commits = union(a.commits, b.commits, file.collection.limits.commits ?? 1000);
  report.releases = union(a.releases, b.releases, file.collection.limits.releases ?? 500);
  if (report.branch === null && report.commits.length) fail('Commit evidence requires a GitHub branch.');
  report.coverage = { commits: commitsComplete, releases: releasesComplete };
  const selected = { a: a.dates, b: b.dates };
  const comparison = comparePeriods(report, selected);
  if (comparison.error) fail(`Invalid period dates. ${comparison.error}`);
  const expected = periodExportData(report, selected, comparison);
  for (const [key, observed] of [['a', a], ['b', b]]) {
    const period = file.periods[key], projected = expected.periods[key], result = comparison[key];
    if (!same(period.effective, projected.effective) || period.durationMs !== projected.durationMs || period.clipped !== projected.clipped) {
      fail(`Period ${key.toUpperCase()} has inconsistent UTC boundaries or duration.`);
    }
    if (!keysOf(observed.commits, result.commits.rows.map(row => row.sha.toLowerCase())) ||
        !keysOf(observed.releases, result.releases.rows.map(row => row.id))) {
      fail('Evidence is outside its period or absent from a period that includes it.');
    }
    const linked = new Set(result.commits.rows.map(row => row.author).filter(Boolean));
    if (!keysOf(observed.authors, result.authors.rows.map(login => login.toLowerCase())) ||
        [...observed.authors.values()].some(row => !linked.has(row.login)) ||
        !same(period.coverage, projected.coverage) || !same(period.counts, projected.counts)) {
      fail('Observed totals or coverage do not match the evidence.');
    }
  }
  if (!same(file.difference, expected.difference) || file.unequalDurations !== expected.unequalDurations) fail('Period differences do not match the evidence.');
  if (!exact(file.overlap, Object.keys(expected.overlap)) ||
      file.overlap.exists !== expected.overlap.exists || file.overlap.observedSharedCommits !== expected.overlap.observedSharedCommits ||
      file.overlap.observedSharedReleases !== expected.overlap.observedSharedReleases ||
      (expected.overlap.effective ? !same(file.overlap.effective, expected.overlap.effective) : file.overlap.effective !== null)) {
    fail('Overlap does not match the UTC periods and evidence.');
  }
  return { repository: file.repository, token: file.userSuppliedTokenCA, observedAt: file.observedAtUtc,
    collection: file.collection, selected, comparison };
}

export function parseSavedComparison(raw) {
  if (typeof raw !== 'string' || !raw.trim()) fail('Choose a non-empty Period Comparison JSON.');
  if (raw.length > MAX_PERIOD_JSON_BYTES || new TextEncoder().encode(raw).byteLength > MAX_PERIOD_JSON_BYTES) fail('File exceeds the 2 MiB limit.');
  checkJsonDepth(raw, 8);
  let file;
  try { file = parseUntrustedJSON(raw); }
  catch { fail('Invalid JSON or unsafe object keys.'); }
  return validateSavedComparison(file);
}

export async function readSavedComparison(file) {
  return parseSavedComparison(await readLocalJSONText(file, MAX_PERIOD_JSON_BYTES));
}

export { reportFields as savedReportFields, commitRecord as savedCommitRecord, releaseRecord as savedReleaseRecord, timestamp as isRecordedUtc };
