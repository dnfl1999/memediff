import { formatDate } from './format.js';
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
    catch (e) { if (signal?.aborted) throw new Error('The query was canceled or exceeded the 45-second timeout.'); throw new Error('Could not connect to GitHub. Check your network connection.'); }
    remaining = r.headers.get('x-ratelimit-remaining') ?? remaining;
    if (!r.ok) {
      if (r.status === 403 || r.status === 429) {
        const reset = Number(r.headers.get('x-ratelimit-reset'));
        const retry = r.headers.get('retry-after');
        throw new Error(`GitHub API rate limit or access denied (${r.status}). ${retry ? `Retry after ${retry} seconds.` : reset ? `Retry after ${formatDate(reset * 1000)}.` : 'Please try again later.'}`);
      }
      if (r.status === 404) throw new Error('Public repository not found (404). Check the address and whether the repository is public.');
      if (r.status === 409 && allowEmptyRepository) return { data: [], next: false, empty: true };
      throw new Error(`GitHub response error (${r.status}). Please try again later.`);
    }
    return { data: await r.json(), next: /rel="next"/.test(r.headers.get('link') || '') };
  }
  const { data: info } = await request(`/repos/${requested}`);
  if (!info.full_name || info.private) throw new Error('Invalid public repository metadata.');
  const repo = parseRepo(info.full_name);
  const branch = info.default_branch;
  const until = new Date(now).toISOString(), since = new Date(now - 30 * DAY).toISOString();
  async function pages(path, limit, allowEmptyRepository = false) {
    const data = [];
    for (let page = 1; page <= limit; page++) {
      try {
        const r = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, allowEmptyRepository);
        if (!Array.isArray(r.data)) throw new Error('Unexpected GitHub list response.');
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
  if (!cs.complete) warnings.push('Commit collection is incomplete. Showing observations up to the 1,000-commit cap or API error.');
  if (!rs.complete) warnings.push('Release collection is incomplete. Showing observations within the 500-release cap.');
  return { schema: 1, source: 'github-live', repo, token, branch, fetchedAt: until, since, description: String(info.description || '').slice(0,400), fork: Boolean(info.fork), parent: info.parent?.full_name || null, archived: Boolean(info.archived), commits, releases, metrics: summarize(commits, releases, now), coverage: { commits: cs.complete, releases: rs.complete, maxCommits: 1000, maxReleases: 500 }, remaining, evidence, warnings, methodology: 'Rolling 7/30-day windows ending at the observation time, using default-branch committer timestamps. Contributors are linked GitHub author accounts, including bots and excluding unlinked authors. Public releases use published_at and include prereleases. Code quality, originality, actual work time and token association are not verified.' };
}
