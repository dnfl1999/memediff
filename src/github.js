import { parseRepo, parseToken, summarize, inWindow, DAY } from './core.js';
const API = 'https://api.github.com';
export async function fetchReport(repoInput, tokenInput = '', { fetcher = fetch, now = Date.now(), signal } = {}) {
  const requested = parseRepo(repoInput), token = parseToken(tokenInput);
  const evidence = [], warnings = [];
  let remaining = null;
  async function request(path, allowEmptyRepository = false) {
    const url = API + path;
    evidence.push(url);
    let r;
    try { r = await fetcher(url, { headers: { Accept: 'application/vnd.github+json' }, signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); }
    catch (e) { if (signal?.aborted) throw new Error('조회가 취소되었거나 45초 제한을 초과했습니다.'); throw new Error('GitHub에 연결하지 못했습니다. 네트워크를 확인하세요.'); }
    remaining = r.headers.get('x-ratelimit-remaining') ?? remaining;
    if (!r.ok) {
      if (r.status === 403 || r.status === 429) {
        const reset = Number(r.headers.get('x-ratelimit-reset'));
        const retry = r.headers.get('retry-after');
        throw new Error(`GitHub API 제한 또는 접근 거부 (${r.status}). ${retry ? `${retry}초 뒤 재시도.` : reset ? `${new Date(reset * 1000).toLocaleString()} 이후 재시도.` : '잠시 후 재시도하세요.'}`);
      }
      if (r.status === 404) throw new Error('공개 저장소를 찾을 수 없습니다 (404). 주소·공개 여부를 확인하세요.');
      if (r.status === 409 && allowEmptyRepository) return { data: [], next: false, empty: true };
      throw new Error(`GitHub 응답 오류 (${r.status}). 잠시 후 재시도하세요.`);
    }
    return { data: await r.json(), next: /rel="next"/.test(r.headers.get('link') || '') };
  }
  const { data: info } = await request(`/repos/${requested}`);
  if (!info.full_name || info.private) throw new Error('공개 저장소 메타데이터가 유효하지 않습니다.');
  const repo = parseRepo(info.full_name);
  const branch = info.default_branch;
  const until = new Date(now).toISOString(), since = new Date(now - 30 * DAY).toISOString();
  async function pages(path, limit, allowEmptyRepository = false) {
    const data = [];
    for (let page = 1; page <= limit; page++) {
      try {
        const r = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, allowEmptyRepository);
        if (!Array.isArray(r.data)) throw new Error('예상하지 못한 GitHub 목록 응답입니다.');
        data.push(...r.data);
        if (!r.next) return { data, complete: true };
      } catch (e) {
        if (signal?.aborted) throw e;
        warnings.push(e.message);
        return { data, complete: false };
      }
    }
    return { data, complete: false };
  }
  const cs = info.size === 0 && !branch ? { data: [], complete: true } : await pages(`/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${since}&until=${until}`, 10, true);
  const rs = await pages(`/repos/${repo}/releases`, 5);
  const commits = [...new Map(cs.data.map(c => [c.sha, { sha: c.sha, date: c.commit?.committer?.date, message: String(c.commit?.message || '').split('\n')[0].slice(0,240), author: c.author?.login || null, url: `https://github.com/${repo}/commit/${c.sha}` }])).values()];
  const releases = [...new Map(rs.data.map(r => [r.id, r])).values()]
    .filter(r => !r.draft && inWindow(r.published_at, now, 30))
    .map(r => ({ id: r.id, name: String(r.name || r.tag_name).slice(0,180), date: r.published_at, prerelease: r.prerelease, url: r.html_url }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  if (!cs.complete) warnings.push('커밋 수집이 불완전합니다. 최대 1,000개 또는 API 오류까지의 관측치만 표시합니다.');
  if (!rs.complete) warnings.push('릴리스 수집이 불완전합니다. 최대 500개 조회 범위 내의 관측치만 표시합니다.');
  return { schema: 1, source: 'github-live', repo, token, branch, fetchedAt: until, since, description: String(info.description || '').slice(0,400), fork: Boolean(info.fork), parent: info.parent?.full_name || null, archived: Boolean(info.archived), commits, releases, metrics: summarize(commits, releases, now), coverage: { commits: cs.complete, releases: rs.complete, maxCommits: 1000, maxReleases: 500 }, remaining, evidence, warnings, methodology: '기본 브랜치의 committer timestamp 기준, 조회 시각에 끝나는 7/30일 구간. 기여자는 연결된 GitHub author 계정 수(봇 포함), 미연결 작성자는 제외. 공개 릴리스는 published_at 기준이며 사전 릴리스 포함. 코드 품질·독창성·실제 작업 시점·토큰 연관성을 검증하지 않음.' };
}
