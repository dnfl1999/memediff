import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY } from '../src/core.js';
import { comparePeriods, defaultPeriods, periodBounds } from '../src/period-comparison.js';

const iso = millis => new Date(millis).toISOString();
const day = (start, end = start) => ({ start, end });
const commit = (id, date, author = null) => ({ sha: id.repeat(40), date, author });
const release = (id, date, prerelease = false) => ({ id, date, prerelease });
function report(fetchedAt = '2024-03-02T12:00:00.250Z', extras = {}) {
  return { fetchedAt, since: iso(Date.parse(fetchedAt) - 30 * DAY), commits: [], releases: [],
    coverage: { commits: true, releases: true }, ...extras };
}
const pair = (snapshot, a, b) => comparePeriods(snapshot, { a, b });

test('equal and overlapping periods disclose shared unique records and B minus A', () => {
  const result = report(undefined, { commits: [commit('a', '2024-02-28T00:00:00Z'), commit('b', '2024-02-29T00:00:00Z'),
    commit('c', '2024-03-01T00:00:00Z'), commit('d', '2024-03-01T23:59:59.999Z')],
  releases: [release(1, '2024-02-28T00:00:00Z'), release(2, '2024-02-29T00:00:00Z')] });
  const same = pair(result, day('2024-02-29'), day('2024-02-29'));
  assert.deepEqual([same.a.commits.count, same.b.commits.count, same.overlap.commits, same.overlap.releases], [1, 1, 1, 1]);
  assert.deepEqual(same.delta, { commits: 0, releases: 0 });
  const overlapping = pair(result, day('2024-02-28', '2024-02-29'), day('2024-02-29', '2024-03-01'));
  assert.equal(overlapping.overlap.commits, 1);
  assert.equal(overlapping.unequal, false);
  assert.deepEqual(overlapping.delta, { commits: 1, releases: -1 });
});

test('adjacent leap dates, December year rollover and exact UTC midnight are counted once', () => {
  for (const [previous, midnight] of [['2024-02-29', '2024-03-01'], ['2025-12-31', '2026-01-01']]) {
    const at = Date.parse(midnight);
    const snapshot = report(iso(at + 7 * DAY), { commits: [commit('a', iso(at - 1)), commit('b', iso(at)), commit('c', iso(at + DAY))],
      releases: [release(1, iso(at - 1)), release(2, iso(at))] });
    const result = pair(snapshot, day(previous), day(midnight));
    assert.equal(result.overlap, null);
    assert.equal(result.a.until, result.b.from);
    assert.equal(result.a.durationMs, DAY);
    assert.deepEqual(result.a.commits.rows.map(row => row.sha), ['a'.repeat(40)]);
    assert.deepEqual(result.b.commits.rows.map(row => row.sha), ['b'.repeat(40)]);
    assert.deepEqual([result.a.releases.count, result.b.releases.count], [1, 1]);
  }
});

test('first and last UTC dates are clipped to the report, including its actual last millisecond', () => {
  const snapshot = report();
  const bounds = periodBounds(snapshot);
  snapshot.commits = [commit('a', snapshot.since), commit('b', snapshot.fetchedAt)];
  const result = pair(snapshot, day(bounds.minDate), day(bounds.maxDate));
  assert.deepEqual([result.a.from, result.b.until - 1], [bounds.start, bounds.end]);
  assert.deepEqual([result.a.commits.count, result.b.commits.count], [1, 1]);
  assert.equal(result.a.clipped, true);
  assert.equal(result.b.clipped, true);
  assert.equal(result.unequal, true);
  assert.equal(result.overlap, null);
  assert.deepEqual(defaultPeriods(bounds), { a: day('2024-02-17', '2024-02-23'), b: day('2024-02-24', '2024-03-01') });
  const midnight = report('2024-03-02T00:00:00.000Z', { releases: [release(1, '2024-03-02T00:00:00.000Z')] });
  const exact = pair(midnight, day('2024-03-01'), day('2024-03-02'));
  assert.equal(exact.b.releases.count, 1);
  assert.equal(exact.b.durationMs, 0);
});

test('invalid calendars, reversed dates, future dates and dates outside collection are rejected', () => {
  const snapshot = report();
  const b = day('2024-02-29');
  for (const [selection, field, message] of [
    [day('2024-02-30'), 'start', /valid UTC/], [day('2023-02-29'), 'start', /valid UTC/],
    [day('2024-3-01'), 'start', /valid UTC/], [day('2024-02-03', ''), 'end', /valid UTC/],
    [day('2024-02-29', '2024-02-28'), 'end', /on or after/],
    [day('2024-01-01'), 'start', /within/], [day('2024-03-03'), 'start', /Future/]
  ]) {
    const result = pair(snapshot, b, selection);
    assert.equal(result.period, 'b');
    assert.equal(result.field, field);
    assert.match(result.error, message);
  }
  assert.equal(periodBounds({ ...snapshot, since: '2024-01-01T00:00:00Z' }), null);
});

test('deduplicates SHA and release identities, normalizes author identity and preserves release types', () => {
  const date = '2024-02-29T13:00:00Z';
  const snapshot = report(undefined, { commits: [commit('A', date, 'First'), commit('a', date, 'Same'),
    commit('b', date, 'same'), commit('c', date), commit('d', date, 'deps[bot]'), commit('e', date, 'not/an/account')],
  releases: [release(1, date), release(1, date, true), release(2, date)] });
  const { a, b } = pair(snapshot, day('2024-02-29'), day('2024-02-28'));
  assert.deepEqual([a.commits.count, a.authors.count, a.authors.unlinked, a.releases.count, a.releases.general, a.releases.prereleases], [5, 2, 2, 2, 1, 1]);
  assert.deepEqual([b.commits.count, b.releases.count, b.authors.count], [0, 0, 0]);
  assert.ok(a.releases.rows.every(row => !Object.hasOwn(row, 'sha')));
  assert.equal(snapshot.commits.at(-1).author, 'not/an/account');
});

test('incomplete coverage keeps observed positives, unknown zeros and unknown deltas separate', () => {
  const snapshot = report(undefined, { commits: [commit('a', '2024-02-29T13:00:00Z')], coverage: { commits: false, releases: false } });
  const result = pair(snapshot, day('2024-02-29'), day('2024-02-28'));
  assert.deepEqual([result.a.commits.count, result.a.authors.count, result.a.authors.unlinked, result.a.releases.count], [1, null, 1, null]);
  assert.deepEqual([result.b.commits.count, result.b.releases.count, result.b.authors.count], [null, null, null]);
  assert.deepEqual(result.delta, { commits: null, releases: null });
  assert.equal(result.a.commits.complete, false);
  const invalid = report(undefined, { commits: [commit('g', '2024-02-29T13:00:00Z')] });
  assert.equal(pair(invalid, day('2024-02-29'), day('2024-02-29')).a.commits.count, null);
});
