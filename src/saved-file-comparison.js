import { utcMillis } from './core.js';
import { periodKeys } from './period-evidence.js';
import { readSavedComparison } from './saved-comparison.js';

export async function readComparisonSlot(file) {
  const preview = await readSavedComparison(file);
  if (!globalThis.crypto?.subtle) return preview;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { ...preview, fingerprint };
}

function merge(intervals) {
  const result = [];
  for (const interval of intervals.sort((a, b) => a.from - b.from)) {
    const last = result.at(-1);
    if (last && interval.from <= last.until) last.until = Math.max(last.until, interval.until);
    else result.push({ ...interval });
  }
  return result;
}

export function savedWindows(file) {
  const start = utcMillis(file.collection.startUtc), end = utcMillis(file.collection.endInclusiveUtc) + 1;
  return merge(periodKeys.map(key => {
    const { from, until } = file.comparison[key];
    return { from: Math.max(start, from), until: Math.min(end, until) };
  }).filter(interval => interval.from < interval.until));
}

function sharedWindows(first, second) {
  return merge(first.flatMap(a => second.map(b => ({ from: Math.max(a.from, b.from), until: Math.min(a.until, b.until) })))
    .filter(interval => interval.from < interval.until));
}

const within = (windows, at) => windows.some(({ from, until }) => at >= from && at < until);
const identities = {
  commits: row => row.sha.toLowerCase(),
  releases: row => row.id
};
const differences = {
  commits: ['date', 'author'],
  releases: ['date', 'name', 'prerelease', 'url']
};

function evidence(file, kind) {
  const key = identities[kind];
  return new Map(periodKeys.flatMap(period => file.comparison[period][kind].rows.map(row => [key(row), row])));
}

function collectRows(files, start, shared, kind) {
  const maps = files.map(file => evidence(file, kind));
  const coverage = files.map(file => periodKeys.every(key => file.comparison[key][kind].complete));
  const ids = [...new Set(maps.flatMap(map => [...map.keys()]))];
  const rows = ids.map(id => {
    const records = maps.map(map => map.get(id) ?? null);
    const inside = records.map(row => row !== null && within(shared, row.at));
    const date = records.find(Boolean).at;
    const sources = records.map((row, i) => {
      if (row) return { row, status: inside[i] ? 'shared' : 'outside' };
      if (!within(start[i], date)) return { row, status: 'excluded' };
      return { row, status: coverage[i] ? 'unobserved' : 'unavailable' };
    });
    let category;
    if (inside.every(Boolean)) category = 'both';
    else if (!inside.some(Boolean)) category = 'outside';
    else if (records.every(Boolean)) category = 'differentScope';
    else {
      const i = inside[0] ? 0 : 1;
      category = sources[1 - i].status === 'unobserved' ? (i === 0 ? 'first' : 'second') : 'unknown';
    }
    const conflicting = records.every(Boolean) ? differences[kind].filter(key => records[0][key] !== records[1][key]) : [];
    return { id, sources, category, conflicting, latest: Math.max(...records.filter(Boolean).map(row => row.at)) };
  }).sort((a, b) => b.latest - a.latest || String(a.id).localeCompare(String(b.id), 'en-US'));
  const totals = Object.fromEntries(['both', 'first', 'second'].map(category => {
    const observed = rows.filter(row => row.category === category).length;
    return [category, shared.length && (observed > 0 || coverage.every(Boolean)) ? observed : null];
  }));
  return { rows, coverage, totals };
}

export function compareSavedFiles(first, second) {
  const a = utcMillis(first.observedAt), b = utcMillis(second.observedAt);
  const sameFile = typeof first.fingerprint === 'string' && first.fingerprint === second.fingerprint;
  const ca = first.token === second.token ? (first.token ? 'same' : 'absent') : (first.token && second.token ? 'different' : 'one');
  const context = { sameFile, ca, observationOrder: Math.sign(b - a) };
  if (first.repository.name !== second.repository.name) return { ...context, blocked: 'The files use different GitHub repositories.' };
  if (!first.repository.branch || !second.repository.branch) return { ...context, blocked: 'The files need a recorded GitHub branch for a shared activity comparison.' };
  if (first.repository.branch !== second.repository.branch) return { ...context, blocked: 'The files use different GitHub branches.' };
  const files = [first, second], windows = files.map(savedWindows);
  const shared = sharedWindows(...windows);
  return { ...context, shared, commits: collectRows(files, windows, shared, 'commits'), releases: collectRows(files, windows, shared, 'releases') };
}
