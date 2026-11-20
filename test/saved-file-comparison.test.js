import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DAY } from '../src/core.js';
import { comparePeriods } from '../src/period-comparison.js';
import { MAX_PERIOD_JSON_BYTES, periodExportData } from '../src/period-export.js';
import { parseSavedComparison } from '../src/saved-comparison.js';
import { compareSavedFiles, readComparisonSlot, savedWindows } from '../src/saved-file-comparison.js';

const sha = key => key.repeat(40);
const day = (start, end = start) => ({ start, end });
const url = (name, tag) => `https://github.com/${name}/releases/tag/${tag}`;
const millis = value => Date.parse(value);
const commit = (key, date, author = 'owner') => ({ sha: sha(key), date, author });
const release = (id, date, name, prerelease = false) => ({ id, date, name, prerelease, url: url('sample/project', name) });
const ca = 'DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
const otherCA = 'So11111111111111111111111111111111111111112';
const realFiles = ['v21-period-comparison.json', 'v22-public-period-comparison.json'].map(name =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

function sample(a, b, extras = {}) {
  const fetchedAt = extras.fetchedAt ?? '2024-03-02T12:00:00.250Z';
  const report = { repo: 'sample/project', branch: 'main', token: '', source: 'github-live', fetchedAt,
    since: new Date(millis(fetchedAt) - 30 * DAY).toISOString(), commits: [], releases: [],
    coverage: { commits: true, releases: true, maxCommits: 1000, maxReleases: 500 }, ...extras };
  const selected = { a, b };
  return parseSavedComparison(JSON.stringify(periodExportData(report, selected, comparePeriods(report, selected))));
}

test('compares the two original public exports with verified bytes and preserves the recorded counts', async () => {
  assert.deepEqual(realFiles.map(bytes => createHash('sha256').update(bytes).digest('hex')), [
    'a4f840bc9964547da58d6ebace027596d518700a535c81a21fa791853fcdffa5',
    '2b67ef1e4411de61aa4c75d52a19ec371eba6ea96c3c973da446fb3ce5f5e301'
  ]);
  const [a, b] = await Promise.all(realFiles.map(bytes => readComparisonSlot(new File([bytes], 'evidence.json'))));
  const comparison = compareSavedFiles(a, b);
  assert.equal(comparison.observationOrder, 1);
  assert.equal(compareSavedFiles(b, a).observationOrder, -1);
  assert.equal(comparison.sameFile, false);
  assert.deepEqual(comparison.shared, [{ from: millis('2026-11-07T00:00:00Z'), until: millis('2026-11-20T08:25:25.775Z') }]);
  assert.deepEqual(comparison.commits.totals, { both: 45, first: 0, second: 0 });
  assert.equal(comparison.commits.rows.filter(row => row.category === 'outside').length, 3);
  assert.deepEqual(comparison.releases.totals, { both: 0, first: 0, second: 0 });
  assert.deepEqual([a.comparison.b.commits.count, b.comparison.b.commits.count], [14, 17]);
  const again = await readComparisonSlot(new File([realFiles[0]], 'different-name.json'));
  assert.equal(compareSavedFiles(a, again).sameFile, true);
  assert.equal(compareSavedFiles(a, again).observationOrder, 0);
});

test('requires the same repository and concrete branch, and reports CA differences independently', () => {
  const a = day('2024-02-10'), b = day('2024-02-15');
  const left = sample(a, b, { token: ca });
  assert.match(compareSavedFiles(left, sample(a, b, { repo: 'other/project' })).blocked, /repositories/);
  assert.match(compareSavedFiles(left, sample(a, b, { branch: 'release' })).blocked, /branches/);
  assert.match(compareSavedFiles(left, sample(a, b, { branch: null })).blocked, /recorded GitHub branch/);
  assert.equal(compareSavedFiles(left, sample(a, b, { token: otherCA })).ca, 'different');
  assert.equal(compareSavedFiles(left, sample(a, b)).ca, 'one');
  assert.equal(compareSavedFiles(left, left).ca, 'same');
});

test('keeps two separate intersections and excludes gaps and the exact exclusive endpoint', () => {
  const left = sample(day('2024-02-01', '2024-02-04'), day('2024-02-10', '2024-02-14'),
    { commits: [commit('a', '2024-02-01T12:00:00.250Z'), commit('b', '2024-02-04T00:00:00Z'), commit('c', '2024-02-14T00:00:00Z')] });
  const right = sample(day('2024-02-01', '2024-02-02'), day('2024-02-12', '2024-02-13'),
    { fetchedAt: '2024-03-02T12:00:00.251Z', commits: [commit('d', '2024-02-01T12:00:00.251Z')] });
  const result = compareSavedFiles(left, right);
  assert.deepEqual(result.shared, [
    { from: millis('2024-02-01T12:00:00.251Z'), until: millis('2024-02-03T00:00:00Z') },
    { from: millis('2024-02-12T00:00:00Z'), until: millis('2024-02-14T00:00:00Z') }
  ]);
  assert.equal(result.commits.rows.find(row => row.id === sha('d')).category, 'second');
  for (const id of ['a', 'b', 'c']) {
    const row = result.commits.rows.find(row => row.id === sha(id));
    assert.equal(row.category, 'outside');
    assert.equal(row.sources[1].status, 'excluded');
  }
});

test('keeps N/A for disjoint retained selections and disjoint collections', () => {
  const left = sample(day('2024-02-01'), day('2024-02-02'), { commits: [commit('a', '2024-02-02T00:00:00Z')] });
  assert.equal(savedWindows(left).length, 1);
  for (const right of [
    sample(day('2024-02-03'), day('2024-02-04')),
    sample(day('2024-04-02'), day('2024-04-03'), { fetchedAt: '2024-04-20T11:00:00.000Z' })
  ]) {
    const result = compareSavedFiles(left, right);
    assert.deepEqual(result.shared, []);
    assert.deepEqual(result.commits.totals, { both: null, first: null, second: null });
    assert.equal(result.commits.rows[0].category, 'outside');
  }
});

test('keeps dates, authors and release details by source when identities match', () => {
  const a = day('2024-02-14', '2024-02-17');
  const left = sample(a, day('2024-02-22'), {
    commits: [commit('a', '2024-02-14T00:00:00Z', 'first'), commit('b', '2024-02-15T00:00:00Z')],
    releases: [release(7, '2024-02-14T10:00:00Z', 'v7')]
  });
  const right = sample(a, day('2024-02-26'), {
    commits: [commit('a', '2024-02-16T00:00:00Z', 'second'), commit('b', '2024-02-26T00:00:00Z')],
    releases: [release(7, '2024-02-15T10:00:00Z', 'v7-preview', true)]
  });
  const { commits, releases } = compareSavedFiles(left, right);
  const pair = commits.rows.find(row => row.id === sha('a'));
  assert.equal(pair.category, 'both');
  assert.deepEqual(pair.conflicting, ['date', 'author']);
  assert.deepEqual(pair.sources.map(s => s.row.author), ['first', 'second']);
  const shifted = commits.rows.find(row => row.id === sha('b'));
  assert.equal(shifted.category, 'differentScope');
  assert.deepEqual(shifted.sources.map(s => s.status), ['shared', 'outside']);
  const tag = releases.rows[0];
  assert.deepEqual(tag.conflicting, ['date', 'name', 'prerelease', 'url']);
  assert.deepEqual(tag.sources.map(s => s.row.url), [url('sample/project', 'v7'), url('sample/project', 'v7-preview')]);
});

test('partial coverage keeps missing evidence Unknown while confirming complete zeros', () => {
  const a = day('2024-02-14', '2024-02-17'), b = day('2024-02-18');
  const left = sample(a, b, { commits: [commit('a', '2024-02-14T00:00:00Z')] });
  const partial = sample(a, b, { coverage: { commits: false, releases: true, maxCommits: 1000, maxReleases: 500 } });
  const result = compareSavedFiles(left, partial);
  assert.equal(result.commits.rows[0].category, 'unknown');
  assert.equal(result.commits.rows[0].sources[1].status, 'unavailable');
  assert.deepEqual(result.commits.totals, { both: null, first: null, second: null });
  assert.deepEqual(result.releases.totals, { both: 0, first: 0, second: 0 });
  assert.deepEqual(compareSavedFiles(left, sample(a, b)).commits.totals, { both: 0, first: 1, second: 0 });
});

test('slot reading rejects unsafe JSON, off-repository links and oversized input', async () => {
  await assert.rejects(readComparisonSlot(new File(['{"__proto__":true}'], 'unsafe.json')), /unsafe object keys/);
  const file = JSON.parse(realFiles[0]);
  file.periods.a.commits[0].url = 'https://github.com/another/project/commit/' + file.periods.a.commits[0].sha;
  await assert.rejects(readComparisonSlot(new File([JSON.stringify(file)], 'bad-url.json')), /GitHub link/);
  await assert.rejects(readComparisonSlot({ name: 'big.json', size: MAX_PERIOD_JSON_BYTES + 1 }), /2 MiB/);
});
