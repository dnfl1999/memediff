import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DAY, compareSnapshots, summarize } from '../src/core.js';
import { importedComparison, parseImport } from '../src/import.js';
import { commitSource, overlapSHAs } from '../src/sha-explorer.js';

const end = Date.parse('2024-03-03T00:00:00.001Z');
const iso = ms => new Date(ms).toISOString();
const sha = c => c.repeat(40);
const record = (id, ms, extra) => ({ sha: sha(id), date: iso(ms), ...extra });
function snapshot(at = end, commits = [], coverage = { commits: true, releases: true }) {
  return { schema: 1, source: 'github-live', repo: 'a/b', branch: 'main', token: '', fetchedAt: iso(at),
    since: iso(at - 30 * DAY), commits, releases: [], metrics: summarize(commits, [], at), coverage };
}

test('identical 30-day windows include both endpoints and preserve SHA classifications', () => {
  const old = snapshot(end, [record('a', end), record('b', end-30*DAY)]);
  const current = snapshot(end, [record('a', end), record('c', end-30*DAY)]);
  const comparison = compareSnapshots(old, current);
  const before = JSON.stringify({old, current, comparison});
  const rows = overlapSHAs(old, current, comparison);
  assert.deepEqual(rows.map(r => [r.sha[0], r.category]), [['a','both'], ['b','missing'], ['c','new']]);
  assert.deepEqual(rows[0].sources.map(s => s.key), ['previous', 'current']);
  assert.equal(JSON.stringify({old, current, comparison}), before);
});

test('global membership precedes overlap, with independent dates and explicit unavailable legacy details', () => {
  const oldEnd = end-2*DAY, start = end-30*DAY;
  const old = snapshot(oldEnd, [record('a', start-1), record('b', oldEnd, {date:'2024-02-30T00:00:00Z'}), record('c', oldEnd-1)]);
  const current = snapshot(end, [record('a', oldEnd), record('b', oldEnd, {author:'dev[bot]', message:'<img>'.repeat(60)}), record('d', end)]);
  const comparison = compareSnapshots(old, current);
  assert.deepEqual(comparison.observed, [sha('d')]);
  assert.deepEqual(comparison.missing, [sha('c')]);
  const rows = overlapSHAs(old, current, comparison);
  assert.deepEqual(rows.map(r => [r.sha[0],r.category]), [['a','both'], ['b','both'], ['c','missing']]);
  assert.deepEqual(rows[0].sources.map(s => [s.date, s.inOverlap]), [[iso(start-1),false],[iso(oldEnd),true]]);
  assert.deepEqual(rows[1].sources.map(s => [s.date, s.author, s.message.length]), [[null,null,0],[iso(oldEnd),'dev[bot]',240]]);
});

test('touching windows select only the exact instant and disjoint windows return N/A', () => {
  const boundary = end - 30*DAY;
  const old = snapshot(boundary, [record('a', boundary), record('b', boundary-1)]);
  const current = snapshot(end, [record('c', boundary), record('d', boundary+1)]);
  const rows = overlapSHAs(old, current, compareSnapshots(old, current));
  assert.deepEqual(rows.map(r => r.sha), [sha('a'),sha('c')]);
  const disjoint = snapshot(boundary-1);
  assert.equal(overlapSHAs(disjoint, current, compareSnapshots(disjoint, current)), null);
});

test('bad SHA and noncanonical repository values never create source links', () => {
  const old = snapshot(end, [{ date: iso(end), sha: '../../issues/1' }], { commits: false, releases: true });
  const current = snapshot(end, [{ date: iso(end), sha: 'short' }, record('a', end, {url:'https://example.com/ignored'})]);
  const comparison = compareSnapshots(old, current);
  assert.equal(comparison.partial, true);
  assert.deepEqual(overlapSHAs(old, current, comparison).map(r => r.sha), [sha('a')]);
  assert.equal(commitSource('a/b',sha('a')), `https://github.com/a/b/commit/${sha('a')}`);
  for (const [repo, value] of [['a/b','short'], ['a/b','../../issues/1'], ['https://github.com/a/b',sha('a')], ['a/b#frag',sha('a')]]) {
    assert.equal(commitSource(repo, value), null);
  }
});

for (const filename of ['memediff-source-2026-11-11.json', 'memediff-v1.1-2026-11-12.json']) {
  test(`historical schema 1 ${filename} keeps its source data and unverified provenance`, async () => {
    const raw = await readFile(new URL(`../docs/examples/${filename}`, import.meta.url), 'utf8');
    const historical = JSON.parse(raw);
    const at = Date.parse(historical.fetchedAt)+DAY;
    const current = { ...historical, fetchedAt: iso(at), since: iso(at-30*DAY) };
    const previous = parseImport(raw, current);
    const comparison = importedComparison(previous, current);
    const rows = overlapSHAs(previous, current, comparison);
    assert.ok(rows.length > 0);
    assert.equal(comparison.baselineOrigin, 'imported-json');
    assert.ok(rows.every(row => row.category === 'both' && row.sources[0].observedAt === historical.fetchedAt));
    const exported = parseImport(JSON.stringify({ ...historical, comparison, selectedDays: 7 }), current);
    assert.deepEqual(exported, previous);
  });
}
