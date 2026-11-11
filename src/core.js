export const DAY = 86400000;
export function parseRepo(value) {
  let input = String(value).trim();
  if (input.startsWith('https://')) {
    let u;
    try { u = new URL(input); } catch { throw new Error('올바른 GitHub 저장소 URL을 입력하세요.'); }
    if (u.hostname !== 'github.com' || u.port || u.username || u.password || u.search || u.hash) throw new Error('https://github.com/owner/repo 형식만 허용합니다.');
    input = u.pathname.replace(/^\//, '').replace(/\/$/, '');
  }
  input = input.replace(/\.git$/, '');
  const parts = input.split('/');
  if (parts.length !== 2 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(parts[0]) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(parts[1]) || /^\.{1,2}$/.test(parts[1])) throw new Error('GitHub URL 또는 owner/repo를 입력하세요. 하위 경로는 허용하지 않습니다.');
  return parts.join('/').toLowerCase();
}
export function parseToken(value) {
  const s = String(value).trim();
  if (!s) return '';
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) throw new Error('Solana 주소는 Base58로 인코딩된 32바이트 공개키여야 합니다.');
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(alphabet.indexOf(c));
  let length = 0;
  while (n > 0n) { length++; n >>= 8n; }
  length += s.match(/^1*/)[0].length;
  if (length !== 32) throw new Error('Solana 주소의 디코딩 길이가 32바이트가 아닙니다.');
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
export function compareSnapshots(previous, current) {
  if (!previous) return null;
  if (previous.schema !== 1 || previous.repo !== current.repo || previous.token !== current.token || previous.branch !== current.branch || previous.source !== current.source) return null;
  if (!Array.isArray(previous.commits) || !previous.metrics?.[30] || !Number.isFinite(Date.parse(previous.fetchedAt))) return null;
  const old = new Set(previous.commits.map(x => x.sha));
  const fresh = new Set(current.commits.map(x => x.sha));
  const start = Date.parse(current.fetchedAt) - 30 * DAY;
  return {
    previousAt: previous.fetchedAt,
    observed: current.commits.filter(x => !old.has(x.sha)).map(x => x.sha),
    missing: previous.commits.filter(x => Date.parse(x.date) >= start && !fresh.has(x.sha)).map(x => x.sha),
    commitDelta: current.metrics[30].commits - previous.metrics[30].commits,
    partial: !current.coverage.commits || !previous.coverage?.commits,
    note: '새로 관측된 SHA는 신규 개발의 증명이 아닙니다. 조회 기간 이동·히스토리 변경·지연 반영·수집 한계가 차이에 영향을 줍니다. 미관측 SHA는 삭제 또는 조작의 증거가 아닙니다.'
  };
}
export function safeLink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['github.com', 'api.github.com', 'solscan.io'].includes(u.hostname) && !u.username && !u.password && !u.port ? u.href : null; } catch { return null; }
}
