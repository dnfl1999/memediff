import { parseRepo, parseToken } from './core.js';
import { formatDate } from './format.js';

export async function searchRepositories(input, { fetcher = fetch, signal } = {}) {
  const query = String(input).trim();
  if (!/^[\p{L}\p{N}_. -]{2,80}$/u.test(query)) throw new Error('Enter 2–80 letters, numbers, spaces, dots, hyphens or underscores. Use the repository field for a URL.');
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query + ' in:name is:public')}&per_page=10`;
  let response;
  try { response = await fetcher(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: {Accept:'application/vnd.github+json'} }); }
  catch { throw new Error(signal?.aborted ? 'Search timed out or was canceled.' : 'Could not reach GitHub search. Check your network connection.'); }
  if ([403,429].includes(response.status)) {
    const reset = Number(response.headers.get('x-ratelimit-reset')), retry = response.headers.get('retry-after');
    throw new Error(`GitHub search is limited or access was denied (${response.status}). ${retry ? `Retry after ${retry} seconds.` : reset ? `Retry after ${formatDate(reset*1000)}.` : 'Please try again later.'}`);
  }
  if (!response.ok) throw new Error(`GitHub search failed (${response.status}). Try a repository URL directly.`);
  let data;
  try { data = await response.json(); } catch { throw new Error('GitHub search returned unreadable data.'); }
  if (!Array.isArray(data.items)) throw new Error('GitHub search returned an unexpected response.');
  const items = [];
  for (const item of data.items.slice(0,10)) {
    if (item.private !== false || typeof item.full_name !== 'string') continue;
    try {
      const repo = parseRepo(item.full_name);
      if (!items.some(i=>i.repo===repo)) items.push({repo, description:String(item.description || '').slice(0,240), fork:Boolean(item.fork), archived:Boolean(item.archived)});
    } catch { /* Never turn malformed search results into links. */ }
  }
  return {items, incomplete:data.incomplete_results === true};
}

// Only explicit, exact-mint associations from the official API are indexed.
export function createForksIndex(recent, pinned, checkedAt) {
  if (recent?.ok !== true || !Array.isArray(recent.tokens) || pinned?.ok !== true || !Array.isArray(pinned.tokens)) throw new Error('Invalid official Forks API response');
  const mappings = new Map();
  for (const item of [...recent.tokens,...pinned.tokens]) {
    try {
      const mint=parseToken(item.mint), repo=parseRepo(item.repo);
      if (!mint || typeof item.repo !== 'string' || item.repo.includes('://')) continue;
      if (!mappings.has(mint)) mappings.set(mint,new Set());
      mappings.get(mint).add(repo);
    } catch { /* No name, ticker or description matching. */ }
  }
  return {schema:1, checkedAt, scope:'Recent Forks API listings plus the official MemeDiff repository; not a complete token directory.', sources:['https://forks.wiki/api/tokens/recent','https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff'], entries:[...mappings].filter(([,repos])=>repos.size===1).map(([mint,repos])=>({mint,repo:[...repos][0]}))};
}

export function lookupMint(input,index) {
  const mint=parseToken(input);
  if (!mint) throw new Error('Enter a Solana token contract address.');
  if (index?.schema !== 1 || !Array.isArray(index.entries) || !Number.isFinite(Date.parse(index.checkedAt)) || Date.parse(index.checkedAt)>Date.now()+60000) throw new Error('The Forks association index is unavailable. Use a verified repository URL directly.');
  const matches=index.entries.filter(item=>item.mint===mint);
  if(matches.length!==1) return null;
  try { return {mint,repo:parseRepo(matches[0].repo),checkedAt:index.checkedAt}; }
  catch { throw new Error('The indexed repository is invalid. No match was selected.'); }
}
