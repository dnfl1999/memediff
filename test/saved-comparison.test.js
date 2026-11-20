import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { comparePeriods } from '../src/period-comparison.js';
import { MAX_PERIOD_JSON_BYTES, periodExportData } from '../src/period-export.js';
import { parseSavedComparison, readSavedComparison } from '../src/saved-comparison.js';

const original = readFileSync(new URL('./fixtures/v21-period-comparison.json', import.meta.url));
const historical = () => JSON.parse(original);
const parse = value => parseSavedComparison(JSON.stringify(value));
const sha = character => character.repeat(40);

function partialComparison() {
  const report = { source: 'github-live', repo: 'example/project', branch: 'main', token: '',
    since: '2024-02-01T12:00:00.250Z', fetchedAt: '2024-03-02T12:00:00.250Z',
    coverage: { commits: false, releases: true, maxCommits: 1000, maxReleases: 500 },
    commits: [{ sha: sha('a'), date: '2024-02-29T00:00:00Z', author: 'Example' }],
    releases: [{ id: 1, date: '2024-03-01T00:00:00Z', name: '<em>Release</em>', prerelease: true,
      url: 'https://github.com/example/project/releases/tag/v1' }] };
  const selected = { a: { start: '2024-02-01', end: '2024-02-29' }, b: { start: '2024-02-29', end: '2024-03-02' } };
  return periodExportData(report, selected, comparePeriods(report, selected));
}

test('opens the exact v2.1 public export repeatedly with stable observed counts and original evidence', async () => {
  assert.equal(createHash('sha256').update(original).digest('hex'), 'a4f840bc9964547da58d6ebace027596d518700a535c81a21fa791853fcdffa5');
  const file = new File([original], 'memediff-period-comparison-dnfl1999-memediff-2026-11-20.json');
  const first = await readSavedComparison(file), second = await readSavedComparison(file);
  assert.deepEqual(first, second);
  assert.notEqual(first.comparison, second.comparison);
  assert.equal(first.repository.name, 'dnfl1999/memediff');
  assert.equal(first.observedAt, '2026-11-20T08:25:25.774Z');
  assert.deepEqual([first.comparison.a.commits.count, first.comparison.b.commits.count, first.comparison.delta.commits], [31, 14, -17]);
  assert.equal(first.collection.apiEvidence.length, 3);
  assert.ok(first.comparison.a.commits.rows.every(row => row.url === `https://github.com/dnfl1999/memediff/commit/${row.sha}`));
});

test('rejects wrong file types, unsafe JSON keys and excessively nested or large data', async () => {
  assert.throws(() => parse({ schema: 1 }), /Snapshot files/);
  assert.throws(() => parse({ ...historical(), format: 'other' }), /Choose a MemeDiff/);
  assert.throws(() => parse({ ...historical(), version: 2 }), /Unsupported/);
  assert.throws(() => parse({ ...historical(), unexpected: true }), /unsupported fields/);
  assert.throws(() => parseSavedComparison(''), /non-empty/);
  assert.throws(() => parseSavedComparison('['.repeat(9) + ']'.repeat(9)), /nested too deeply/);
  assert.throws(() => parseSavedComparison('{"nested":{"__proto__":{"injected":true}}}'), /unsafe object keys/);
  assert.throws(() => parseSavedComparison('{"\\u0063onstructor":{}}'), /unsafe object keys/);
  assert.throws(() => parseSavedComparison('é'.repeat(MAX_PERIOD_JSON_BYTES / 2 + 1)), /2 MiB/);
  await assert.rejects(readSavedComparison(new File([], 'empty.json')), /non-empty/);
  await assert.rejects(readSavedComparison({ name: 'big.json', size: MAX_PERIOD_JSON_BYTES + 1, text() { throw Error('must not read'); } }), /2 MiB/);
  await assert.rejects(readSavedComparison(new File([original], 'misleading.txt')), /\.json/);
});

test('validates repository, branch, CA, source, observation timestamps and collection limits', () => {
  for (const [mutate, message] of [
    [f => { f.repository.name = 'GitHub.com'; }, /repository/i],
    [f => { f.repository.branch = 'bad branch'; }, /branch/],
    [f => { f.userSuppliedTokenCA = '0'.repeat(32); }, /Solana/],
    [f => { f.source = 'unknown'; }, /observation/],
    [f => { f.observedAtUtc = '2026-02-31T10:00:00.000Z'; }, /observation/],
    [f => { f.collection.durationDays = 29; }, /30-day/],
    [f => { f.collection.limits.commits = 1001; }, /limits/],
    [f => { f.collection.coverage.commitsComplete = false; }, /coverage/]
  ]) {
    const f = historical(); mutate(f); assert.throws(() => parse(f), message);
  }
  const real = historical();
  real.userSuppliedTokenCA = 'DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
  assert.equal(parse(real).token, real.userSuppliedTokenCA);
});

test('checks periods and every observed aggregate against normalized evidence', () => {
  for (const [mutate, issue] of [
    [f => { f.periods.a.commits[0].sha = 'invalid'; }, /SHA/],
    [f => { f.periods.a.commits.push(f.periods.a.commits[0]); }, /Duplicate commit SHA/],
    [f => { f.periods.a.commits[0].committedAtUtc = '2026-11-20T00:00:00.000Z'; }, /outside its period/],
    [f => { f.periods.a.commits[0].committedAtUtc = '2026-11-11T00:00:00+02:00'; }, /timestamp/],
    [f => { f.periods.a.counts.commits = 0; }, /totals/],
    [f => { f.periods.a.counts.releases = null; }, /totals/],
    [f => { f.periods.a.authors = []; }, /totals/],
    [f => { f.periods.b.selected.endDateUtc = '2026-11-21'; }, /period dates/],
    [f => { f.periods.b.effective.endExclusiveUtc = f.periods.b.effective.lastIncludedUtc; }, /UTC boundaries/],
    [f => { f.periods.b.durationMs++; }, /duration/],
    [f => { f.difference.commits++; }, /differences/],
    [f => { f.overlap.exists = true; }, /Overlap/]
  ]) {
    const f = historical(); mutate(f); assert.throws(() => parse(f), issue);
  }
});

test('keeps leap-day overlap, partial observation and confirmed zero distinct', () => {
  const value = partialComparison();
  const { comparison } = parse(value);
  assert.equal(comparison.a.from, Date.parse(value.collection.startUtc));
  assert.equal(comparison.b.until - 1, Date.parse(value.observedAtUtc));
  assert.equal(comparison.a.commits.complete, false);
  assert.deepEqual([comparison.a.releases.count, comparison.b.releases.count], [0, 1]);
  assert.deepEqual([comparison.overlap.commits, comparison.overlap.releases], [1, 0]);
  const noCommits = structuredClone(value);
  for (const period of Object.values(noCommits.periods)) {
    period.commits = []; period.authors = [];
    period.counts.commits = null; period.counts.authors = null; period.counts.unlinkedCommits = null;
  }
  noCommits.overlap.observedSharedCommits = null;
  noCommits.difference.commits = null;
  assert.equal(parse(noCommits).comparison.overlap.commits, null);
  noCommits.periods.a.counts.commits = 0;
  assert.throws(() => parse(noCommits), /totals/);

  const mismatch = partialComparison();
  mismatch.periods.a.commits = [];
  assert.throws(() => parse(mismatch), /absent/);
  const conflict = partialComparison();
  conflict.periods.a.commits[0].author = 'Different';
  assert.throws(() => parse(conflict), /differs between/);
  const duplicate = partialComparison();
  duplicate.periods.b.releases.push(duplicate.periods.b.releases[0]);
  assert.throws(() => parse(duplicate), /Duplicate release ID/);
});

test('rejects untrusted commit, release, author and API URLs', () => {
  for (const [edit, error] of [
    [f => { f.periods.a.commits[0].url += '?token=anything'; }, /GitHub link/],
    [f => { f.periods.a.authors[0].url = 'https://evil.test/Example'; }, /author/],
    [f => { f.periods.b.releases[0].url = 'https://user@github.com/example/project/releases/tag/v1'; }, /release/],
    [f => { f.periods.b.releases[0].url = 'https://github.com/other/project/releases/tag/v1'; }, /release/],
    [f => { f.periods.b.releases[0].url = 'https://github.com/example/project/releases/tag/v1#fragment'; }, /release/],
    [f => { f.periods.b.releases[0].url = 'javascript:alert(1)'; }, /release/],
    [f => { f.collection.apiEvidence = ['https://api.github.com/repos/example/project/releases?token=x']; }, /API evidence/],
    [f => { f.collection.apiEvidence = ['https://api.github.com/repos/example/project/releases?page=1&page=2']; }, /API evidence/],
    [f => { f.collection.apiEvidence = ['https://api.github.com/repos/example/project/releases?page=6']; }, /API evidence/],
    [f => { f.collection.apiEvidence = ['https://api.github.com/repos/example/project/commits?sha=other']; }, /API evidence/]
  ]) {
    const f = partialComparison(); edit(f); assert.throws(() => parse(f), error);
  }
});
