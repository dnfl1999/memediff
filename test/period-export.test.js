import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY } from '../src/core.js';
import { validateImport } from '../src/import.js';
import { comparePeriods } from '../src/period-comparison.js';
import { MAX_PERIOD_JSON_BYTES, periodExportData, periodFilename, periodJSON } from '../src/period-export.js';
import { drawPeriodComparison, periodImage } from '../src/period-export-png.js';

const stamp = '2024-03-02T12:00:00.250Z';
const iso = time => new Date(time).toISOString();
const sha = value => value.repeat(40);
const range = (start, end = start) => ({ start, end });
const commit = (key, date, author = null) => ({ sha: sha(key), date, author, url: 'https://other.test/commit/injected' });
const release = (id, date, url, prerelease = false) => ({ id, date, name: '<em>Release</em>', url, prerelease });
const repo = 'fixture/project';
const validRelease = `https://github.com/${repo}/releases/tag/1%2F2`;
const token = 'DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
function report(fields = {}) {
  return { schema: 1, source: 'github-live', repo, branch: 'main', token, fetchedAt: stamp,
    since: iso(Date.parse(stamp) - 30 * DAY), coverage: { commits: true, releases: true }, commits: [], releases: [], ...fields };
}

function exported(snapshot, a, b) {
  const dates = { a, b };
  return periodExportData(snapshot, dates, comparePeriods(snapshot, dates));
}

test('versioned comparison export preserves chosen dates, effective UTC milliseconds, overlap and unique evidence', async () => {
  const date = '2024-02-29T00:00:00Z';
  const source = 'https://api.github.com/repos/fixture/project/commits?page=1';
  const snapshot = report({ commits: [commit('a', date, 'maintainer'), commit('a', date, 'maintainer'), commit('b', stamp)],
    releases: [release(1, date, validRelease), release(1, date, validRelease, true)],
    evidence: [source, source, 'https://api.github.com/repos/fixture/project/commits?token=private',
      'https://api.github.com/repos/other/project/commits?page=1', 'https://example.test/fixture/project/releases'] });
  const before = JSON.stringify(snapshot);
  const data = exported(snapshot, range('2024-02-29'), range('2024-02-29', '2024-03-02'));
  assert.deepEqual([data.format, data.version, data.source, data.userSuppliedTokenCA], ['memediff-period-comparison', 1, 'github-live', token]);
  assert.deepEqual(data.repository, { name: repo, branch: 'main', url: 'https://github.com/fixture/project' });
  assert.equal(data.collection.startUtc, snapshot.since);
  assert.equal(data.collection.endInclusiveUtc, stamp);
  assert.deepEqual(data.collection.apiEvidence, [source]);
  assert.deepEqual(data.periods.b.selected, { startDateUtc: '2024-02-29', endDateUtc: '2024-03-02' });
  assert.deepEqual(data.periods.b.effective, { startUtc: '2024-02-29T00:00:00.000Z',
    lastIncludedUtc: stamp, endExclusiveUtc: '2024-03-02T12:00:00.251Z' });
  assert.equal(data.periods.a.durationMs, DAY);
  assert.equal(data.periods.b.durationMs, 2 * DAY + DAY / 2 + 250);
  assert.equal(data.unequalDurations, true);
  assert.deepEqual(data.difference, { direction: 'b-minus-a', commits: 1, releases: 0 });
  assert.deepEqual([data.overlap.exists, data.overlap.observedSharedCommits, data.overlap.observedSharedReleases], [true, 1, 1]);
  assert.deepEqual(data.periods.b.counts, { commits: 2, releases: 1, authors: 1, unlinkedCommits: 1, generalReleases: 0, prereleases: 1 });
  assert.equal(data.periods.a.commits[0].url, `https://github.com/${repo}/commit/${sha('a')}`);
  assert.deepEqual(data.periods.a.releases, [{ id: 1, name: '<em>Release</em>', publishedAtUtc: '2024-02-29T00:00:00.000Z', prerelease: true, url: validRelease }]);
  assert.deepEqual(data.periods.a.authors, [{ login: 'maintainer', url: 'https://github.com/maintainer' }]);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(JSON.parse(await periodJSON(data).text()), data);
  assert.match(periodFilename(data, 'json'), /^memediff-period-comparison-fixture-project-2024-03-02\.json$/);
  assert.throws(() => validateImport(data, snapshot), /Period Comparison export.*schema 1/);
});

test('clipped first date, unknown versus zero, invalid links and oversized output remain explicit', () => {
  const snapshot = report({ token: '', coverage: { commits: false, releases: true } });
  const first = snapshot.since.slice(0, 10);
  snapshot.commits = [commit('a', snapshot.since, 'unrelated/path')];
  snapshot.releases = [
    release(1, snapshot.since, 'https://api.github.com/repos/fixture/project/releases/1'),
    release(2, snapshot.since, 'https://github.com/other/project/releases/tag/1'),
    release(3, snapshot.since, 'https://example.test/fixture/project/releases/tag/1'),
    release(4, snapshot.since, 'https://github.com/fixture/project/releases/tag/1?token=secret'),
    release(5, snapshot.since, 'https://user@github.com/fixture/project/releases/tag/1'),
    release(6, snapshot.since, 'javascript:alert(0)')
  ];
  const data = exported(snapshot, range(first), range('2024-03-01'));
  assert.equal(data.userSuppliedTokenCA, null);
  assert.equal(data.periods.a.effective.startUtc, snapshot.since);
  assert.equal(data.periods.a.clipped, true);
  assert.equal(data.periods.a.coverage.commitsComplete, false);
  assert.equal(data.periods.a.commits[0].author, null);
  assert.ok(data.periods.a.releases.every(row => row.url === null));
  assert.deepEqual([data.periods.b.counts.commits, data.periods.b.counts.releases, data.difference.commits], [null, 0, null]);
  assert.deepEqual(data.overlap, { exists: false, effective: null, observedSharedCommits: 0, observedSharedReleases: 0 });
  assert.throws(() => periodJSON({ payload: 'x'.repeat(MAX_PERIOD_JSON_BYTES) }), /2 MiB/);
  assert.throws(() => exported(report({ source: 'local' }), range(first), range(first)), /current live/);
});

test('PNG draws both observed values, partial markers, logo and the complete long source URL', () => {
  const snapshot = report({ repo: 'a'.repeat(39) + '/' + 'w'.repeat(100), coverage: { commits: false, releases: true },
    commits: [commit('a', '2024-02-29T00:00:00Z', 'user')] });
  const data = exported(snapshot, range('2024-02-28', '2024-02-29'), range('2024-02-29', '2024-03-02'));
  const texts = [], rectangles = [], images = [];
  const canvas = {
    measureText(value) { return { width: parseInt(this.font, 10) * 0.63 * value.length }; },
    fillText(value, x, y) { texts.push({ value, x, y }); },
    fillRect(x, y, width, height) { rectangles.push({ x, y, width, height }); },
    drawImage(...args) { images.push(args); }
  };
  drawPeriodComparison(canvas, data, { complete: true, naturalWidth: 80, naturalHeight: 60 });
  assert.equal(images.length, 1);
  assert.equal(rectangles[0].width, periodImage.width);
  assert.equal(rectangles[0].height, periodImage.height);
  assert.deepEqual(texts.filter(x => [605, 641].includes(x.y) && x.x === 562).map(x => x.value), ['1+', '1+']);
  assert.match(texts.find(x => x.y === 731).value, /Shared commit SHAs 1/);
  assert.match(texts.find(x => x.y === 486).value, /Commits incomplete/);
  assert.equal(texts.filter(x => x.x === 60 && x.y >= 929 && x.y < 995).map(x => x.value).join(''), data.repository.url);
  assert.equal(texts.filter(x => x.x === 60 && x.y >= 166 && x.y < 244).map(x => x.value).join(''), data.repository.name);
  assert.ok(texts.every(x => x.y < periodImage.height));
});
