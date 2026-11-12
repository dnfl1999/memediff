export const DAY = 86400000;
export function parseRepo(value) {
  let input = String(value).trim();
  if (input.startsWith('https://')) {
    let u;
    try { u = new URL(input); } catch { throw new Error('Enter a valid GitHub repository URL.'); }
    if (u.hostname !== 'github.com' || u.port || u.username || u.password || u.search || u.hash) throw new Error('Use https://github.com/owner/repo without credentials, query parameters or fragments.');
    input = u.pathname.replace(/^\//, '').replace(/\/$/, '');
  }
  input = input.replace(/\.git$/, '');
  const parts = input.split('/');
  if (parts.length !== 2 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(parts[0]) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(parts[1]) || /^\.{1,2}$/.test(parts[1])) throw new Error('Enter a GitHub repository URL or owner/repo. Subpaths are not supported.');
  return parts.join('/').toLowerCase();
}
export function parseToken(value) {
  const s = String(value).trim();
  if (!s) return '';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) throw new Error('A Solana address must be a Base58-encoded 32-byte public key.');
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(alphabet.indexOf(c));
  let length = 0;
  while (n > 0n) { length++; n >>= 8n; }
  length += s.match(/^1*/)[0].length;
  if (length !== 32) throw new Error('The Solana address does not decode to 32 bytes.');
  return s;
}
export function inWindow(date, now, days) {
  const time = Date.parse(date);
  return Number.isFinite(time) && time >= now - days * DAY && time <= now;
}
export function summarize(commits, releases, now) {
  return Object.fromEntries([7, 30].map(days => {
    const c = commits.filter(x => inWindow(x.date, now, days));
    const r = releases.filter(x => inWindow(x.date, now, days));
    return [days, { commits: c.length, releases: r.length, contributors: new Set(c.map(x => x.author).filter(Boolean)).size, unattributed: c.filter(x => !x.author).length }];
  }));
}
// UTC calendar validation avoids Date.parse silently normalizing invalid dates.
export function utcMillis(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms >= 0 && new Date(ms).toISOString() === (value.length === 20 ? value.replace('Z', '.000Z') : value) ? ms : NaN;
}
export function observationWindows(previous, current) {
  function window(snapshot) {
    const end = utcMillis(snapshot?.fetchedAt), start = end - 30 * DAY;
    // Old browser baselines may omit since; their collection was also 30 days.
    if (!Number.isFinite(end) || start < 0 || (snapshot.since !== undefined && utcMillis(snapshot.since) !== start)) return null;
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  }
  const a = window(previous), b = window(current);
  if (!a || !b || a.end > b.end) return null;
  const start = b.start, end = a.end, durationMs = Date.parse(end) - Date.parse(start);
  return { previous: a, current: b,
    overlap: durationMs >= 0 ? { start, end, durationMs } : null,
    relation: durationMs > 0 ? 'overlap' : durationMs === 0 ? 'touching' : 'disjoint',
    gapMs: Math.max(0, -durationMs) };
}
export function compareSnapshots(previous, current) {
  if (!previous) return null;
  if (previous.schema !== 1 || previous.repo !== current.repo || previous.token !== current.token || previous.branch !== current.branch || previous.source !== current.source) return null;
  if (!Array.isArray(previous.commits) || !previous.metrics?.[30] || !Number.isFinite(Date.parse(previous.fetchedAt))) return null;
  const windows = observationWindows(previous, current);
  if (!windows) return null;
  const old = new Set(previous.commits.map(x => x.sha));
  const fresh = new Set(current.commits.map(x => x.sha));
  return {
    previousAt: previous.fetchedAt,
    windows,
    observed: current.commits.filter(x => !old.has(x.sha)).map(x => x.sha),
    missing: previous.commits.filter(x => windows.overlap && Date.parse(x.date) >= Date.parse(windows.overlap.start) && Date.parse(x.date) <= Date.parse(windows.overlap.end) && !fresh.has(x.sha)).map(x => x.sha),
    commitDelta: current.metrics[30].commits - previous.metrics[30].commits,
    partial: !current.coverage.commits || !previous.coverage?.commits || current.coverage.releases === false || previous.coverage?.releases === false,
    note: 'Newly observed SHA values do not prove new work. Rolling windows, history changes, delayed updates and collection limits affect differences. Missing observations do not prove deletion or manipulation.'
  };
}
export function safeLink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['github.com', 'api.github.com', 'solscan.io'].includes(u.hostname) && !u.username && !u.password && !u.port ? u.href : null; } catch { return null; }
}
