import { parseRepo, utcMillis } from './core.js';

const validSHA = sha => typeof sha === 'string' && /^[0-9a-f]{40}$/i.test(sha);

export function commitSource(repo, sha) {
  if (!validSHA(sha)) return null;
  try {
    return parseRepo(repo) === repo ? `https://github.com/${repo}/commit/${sha}` : null;
  } catch {
    return null;
  }
}

export function overlapSHAs(previous, current, comparison) {
  const overlap = comparison?.windows.overlap;
  if (!overlap) return null;
  const start = utcMillis(overlap.start), end = utcMillis(overlap.end);
  const bySHA = snapshot => new Map(snapshot.commits.filter(c => validSHA(c?.sha)).map(c => [c.sha, c]));
  const before = bySHA(previous), after = bySHA(current);
  const newlyObserved = new Set(comparison.observed), missing = new Set(comparison.missing);
  const rows = [];
  for (const sha of new Set([...before.keys(), ...after.keys()])) {
    const sources = [];
    for (const [key, record, observedAt] of [
      ['previous', before.get(sha), previous.fetchedAt], ['current', after.get(sha), current.fetchedAt]
    ]) {
      if (!record) continue;
      const date = utcMillis(record.date);
      const inOverlap = date >= start && date <= end;
      sources.push({ key, observedAt, date: Number.isFinite(date) ? new Date(date).toISOString() : null, inOverlap,
        message: typeof record.message === 'string' ? record.message.slice(0, 240) : '',
        author: typeof record.author === 'string' && /^[a-z0-9-]+(?:\[bot\])?$/i.test(record.author) ? record.author.slice(0, 100) : null });
    }
    const matching = sources.filter(source => source.inOverlap);
    if (!matching.length) continue;
    const category = newlyObserved.has(sha) ? 'new' : missing.has(sha) ? 'missing' : sources.length === 2 ? 'both' : null;
    if (!category) continue;
    rows.push({ sha, category, sources, newest: Math.max(...matching.map(source => utcMillis(source.date))) });
  }
  return rows.sort((a, b) => b.newest - a.newest || (a.sha < b.sha ? -1 : 1));
}
