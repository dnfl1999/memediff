import { formatDate, formatNumber } from './format.js';
import { drawReceipt } from './receipt.js';
import { parseRepo, parseToken, compareSnapshots, inWindow, safeLink, DAY } from './core.js';
import { fetchReport } from './github.js';
const $ = id => document.getElementById(id);
let report = null, comparison = null, days = 30, controller = null;
let externalLock = false;
export function lockAnalysis(value) { externalLock = value; for (const id of ['analyze','repo','token']) $(id).disabled = value || Boolean(controller); }
function el(tag, text, className) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; }
function link(text, url) { const a = el('a', text); const safe = safeLink(url); if (safe) { a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; }
function key() { return `memediff:v1:${report.repo}:${report.branch}:${report.token}`; }
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function loadBaseline() {
  try { const raw = localStorage.getItem(key()); comparison = compareSnapshots(raw ? JSON.parse(raw) : null, report); }
  catch { comparison = null; status('Could not read the baseline. Browser storage may be blocked or the saved record damaged.', true); }
}
function renderComparison() {
  const box = $('comparison'); box.replaceChildren();
  if (!comparison) { box.append(el('p', 'No saved baseline yet. Save this report, then analyze again to compare observed SHA values.')); return; }
  box.append(el('p', `Baseline: ${formatDate(comparison.previousAt)}`));
  box.append(el('strong', `${formatNumber(comparison.observed.length)} newly observed`));
  box.append(el('p', `30-day commit observation change: ${comparison.commitDelta >= 0 ? '+' : ''}${formatNumber(comparison.commitDelta)} · No longer observed in overlap: ${formatNumber(comparison.missing.length)}`));
  if (comparison.partial) box.append(el('p', 'This comparison includes incomplete collection. Count differences do not measure changes in work performed.', 'warning'));
  box.append(el('p', comparison.note, 'small'));
  if (comparison.observed.length) {
    const list = el('ul', null, 'source-list');
    comparison.observed.slice(0, 5).forEach(sha => { const li = el('li'); li.append(link(sha.slice(0, 12), `https://github.com/${report.repo}/commit/${sha}`)); list.append(li); });
    box.append(list, el('p', 'Showing up to 5 newly observed SHA values · Export JSON for the full comparison', 'small'));
  }
}
function render() {
  $('report').hidden = false; $('empty').hidden = true;
  $('report-title').replaceChildren(link(report.repo, `https://github.com/${report.repo}`));
  $('report-meta').textContent = `Observed at ${formatDate(report.fetchedAt)} · ${report.branch || 'No branch'}${report.fork ? ' · Fork' : ''}${report.archived ? ' · Archived repository' : ''}`;
  $('description').textContent = report.description;
  $('token-note').textContent = report.token ? `User-supplied token: ${report.token} · Repository association and mint existence are not verified` : 'No token address recorded · This report analyzes repository activity only.';
  $('warnings').replaceChildren(...report.warnings.map(w => el('p', w, 'warning')));
  const m = report.metrics[days];
  $('metrics').replaceChildren(...[['Commits', m.commits, report.coverage.commits, 'Default branch · committer date'], ['Releases', m.releases, report.coverage.releases, 'Public · published_at date'], ['Contributors', m.contributors, report.coverage.commits, `Linked accounts · ${formatNumber(m.unattributed)} unlinked-author commits`]].map(([name, count, complete, note]) => { const n = el('article', null, 'metric'); n.append(el('h3', name), el('strong', `${formatNumber(count)}${complete ? '' : '+'}`), el('p', `${complete ? '' : 'Incomplete observation · '}${note}`)); return n; }));
  const now = Date.parse(report.fetchedAt);
  const commits = report.commits.filter(c => inWindow(c.date, now, days)).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const releases = report.releases.filter(c => inWindow(c.date, now, days));
  // A rolling window can span days+1 UTC calendar dates; include both edges.
  const firstDay = new Date(now - days * DAY).toISOString().slice(0,10);
  const buckets = Array.from({length: days + 1}, (_, i) => { const date = new Date(Date.parse(firstDay) + i * DAY).toISOString().slice(0,10); return { date, count: commits.filter(c => c.date.slice(0,10) === date).length }; });
  const max = Math.max(1,...buckets.map(x => x.count));
  $('chart').replaceChildren(...buckets.map(b => { const bar = el('div', null, 'bar'); bar.style.setProperty('--bar-height', `${Math.max(1, b.count / max * 100)}%`); bar.title = `${b.date}: ${formatNumber(b.count)} commits`; return bar; }));
  $('chart').setAttribute('aria-label', buckets.map(b => `${b.date}: ${formatNumber(b.count)} commits`).join(', '));
  $('chart-start').textContent = firstDay; $('chart-end').textContent = new Date(now).toISOString().slice(0,10);
  $('commits').replaceChildren(...commits.slice(0,20).map(c => { const li = el('li'); li.append(link(c.message || c.sha.slice(0,7), c.url), el('small', `${c.sha.slice(0,7)} · ${c.author || 'No linked GitHub account'} · ${formatDate(c.date)}`)); return li; }));
  if (!commits.length) $('commits').append(el('li', report.coverage.commits ? 'No commits observed in the selected window.' : 'Commits could not be confirmed due to collection errors or limits.'));
  $('releases').replaceChildren(...releases.slice(0,20).map(r => { const li = el('li'); li.append(link(r.name, r.url), el('small', `${r.date.slice(0,10)}${r.prerelease ? ' · Prerelease' : ''}`)); return li; }));
  if (!releases.length) $('releases').append(el('li', report.coverage.releases ? 'No public releases observed in the selected window.' : 'Releases could not be confirmed due to collection errors or limits.'));
  if (releases.length > 20) $('releases').append(el('li', 'Showing the latest 20 · Export JSON for all collected data'));
  const authors = [...new Set(commits.map(c => c.author).filter(Boolean))];
  $('contributors').replaceChildren(...authors.slice(0,50).map(a => link(a, `https://github.com/${encodeURIComponent(a)}`)));
  if (!authors.length) $('contributors').append(el('span', 'No linked accounts observed', 'small'));
  if (authors.length > 50) $('contributors').append(el('span', 'Showing up to 50 accounts', 'small'));
  $('coverage').textContent = `${report.methodology} Commit collection: ${report.coverage.commits ? 'complete' : 'incomplete'}, Release collection: ${report.coverage.releases ? 'complete' : 'incomplete'}. API requests remaining: ${report.remaining ?? 'unknown'}.`;
  $('sources').replaceChildren(...report.evidence.map(url => { const li = el('li'); li.append(link(url, url)); return li; }));
  renderComparison();
}
export function clearReport() { report = null; comparison = null; $('report').hidden = true; $('empty').hidden = true; }
export function cancelAnalysis() { controller?.abort(); }
export async function analyzeRepository(repoInput, tokenInput = '') {
  let repo, token;
  try { repo = parseRepo(repoInput); token = parseToken(tokenInput); } catch(e) { status(e.message, true); return false; }
  if (controller) return;
  controller = new AbortController(); const timer = setTimeout(() => controller?.abort(), 45000);
  $('analyze').disabled = true; $('cancel').hidden = false; $('repo').disabled = true; $('token').disabled = true;
  $('report').hidden = true; status('Collecting public GitHub evidence…');
  try { report = await fetchReport(repo, token, { signal: controller.signal }); status(`Live GitHub query complete · API requests remaining: ${report.remaining ?? 'unknown'}`); loadBaseline(); render(); return true; }
  catch(e) { report = null; $('empty').hidden = false; status(e.message, true); return false; }
  finally { clearTimeout(timer); controller = null; lockAnalysis(externalLock); $('cancel').hidden = true; }
}
$('query').addEventListener('submit', async event => { event.preventDefault(); if(externalLock)return; $('token-result').hidden = true; await analyzeRepository($('repo').value, $('token').value); });
$('cancel').addEventListener('click', () => controller?.abort());
document.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => { days = Number(b.dataset.days); document.querySelectorAll('[data-days]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (report) render(); }));
$('save').addEventListener('click', () => { if (!report) return; try { localStorage.setItem(key(), JSON.stringify(report)); loadBaseline(); renderComparison(); status('Report saved as the baseline in this browser. It will be used for the next query.'); } catch { status('Could not save the baseline. Check browser storage and privacy settings.', true); } });
$('clear').addEventListener('click', () => { if (!report) return; try { localStorage.removeItem(key()); comparison = null; renderComparison(); status('Local baseline cleared for this project.'); } catch { status('Could not access browser storage.', true); } });
function download(blob, extension, snapshot = report) { const url = URL.createObjectURL(blob); const a = el('a'); a.href = url; a.download = `memediff-${snapshot.repo.replace('/', '-')}-${snapshot.fetchedAt.slice(0,10)}.${extension}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
$('json').addEventListener('click', () => { if (report) { download(new Blob([JSON.stringify({ ...report, comparison, selectedDays: days }, null, 2)], { type:'application/json' }), 'json'); status('JSON export requested. Check your browser downloads.'); } });
$('png').addEventListener('click', () => {
  if (!report) return;
  const snapshot = report;
  try {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1020;
    drawReceipt(canvas.getContext('2d'), snapshot, days, comparison);
    canvas.toBlob(blob => { if (blob) { download(blob,'png',snapshot); status('PNG export requested. Check your browser downloads.'); } else status('Could not generate the PNG.',true); },'image/png');
  } catch { status('This browser could not generate the PNG. Use JSON export instead.', true); }
});
