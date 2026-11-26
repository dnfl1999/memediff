import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DAY } from '../src/core.js';
import { validateImport } from '../src/import.js';
import { comparePeriods } from '../src/period-comparison.js';
import { MAX_PERIOD_JSON_BYTES, periodExportData } from '../src/period-export.js';
import { parseSavedComparison } from '../src/saved-comparison.js';
import { compareSavedFiles, readComparisonSlot, savedWindows } from '../src/saved-file-comparison.js';
import { MAX_SAVED_FILES_JSON_BYTES, savedFilesExportData, savedFilesFilename, savedFilesJSON } from '../src/saved-files-export.js';
import { layoutSavedFilesPng, savedFilesImageWidth } from '../src/saved-files-export-png.js';

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

const createdAt = '2026-11-26T03:00:00.123Z';
const reportData = (first, second) => savedFilesExportData([first, second], compareSavedFiles(first, second), millis(createdAt));

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

  const data = reportData(a, b);
  const output = await savedFilesJSON(data).text();
  assert.deepEqual(JSON.parse(output), data);
  assert.doesNotMatch(output, /evidence\.json|different-name\.json/);
  assert.deepEqual([data.format, data.version, data.createdAtUtc, data.source],
    ['memediff-saved-files-comparison', 1, createdAt, 'Local file · Unverified']);
  assert.deepEqual(data.repository, { name: 'dnfl1999/memediff', branch: 'main', url: 'https://github.com/dnfl1999/memediff' });
  assert.deepEqual(data.files.map(file => file.sha256), [a.fingerprint, b.fingerprint]);
  assert.deepEqual(data.files.map(file => file.observedAtUtc), [a.observedAt, b.observedAt]);
  assert.deepEqual(data.files[0].collection, a.collection);
  assert.equal(data.files[0].periods.b.effective.endExclusiveUtc, '2026-11-20T08:25:25.775Z');
  assert.equal(data.files[0].periods.b.effective.lastIncludedUtc, a.observedAt);
  assert.deepEqual(data.files[0].periods.b.selected, { startDateUtc: '2026-11-14', endDateUtc: '2026-11-20' });
  assert.equal(data.commits.records.length, 48);
  for (const record of data.commits.records.flatMap(item => item.sources.map(source => source.record)).filter(Boolean)) {
    assert.equal(record.url, `https://github.com/dnfl1999/memediff/commit/${record.sha}`);
    if (record.author) assert.equal(record.authorUrl, `https://github.com/${record.author}`);
  }
  assert.deepEqual(data.commits.sharedCounts, comparison.commits.totals);
  assert.deepEqual(data.releases.sharedCounts, comparison.releases.totals);
  assert.equal(data.commits.otherRecordedCounts.outside, 3);
  assert.deepEqual(reportData(a, again).context, { sameFile: true, userSuppliedTokenCA: comparison.ca, observationOrder: 0 });
  assert.equal(savedFilesFilename(data, 'json'), 'memediff-saved-files-comparison-dnfl1999-memediff-2026-11-26.json');
  assert.throws(() => parseSavedComparison(output), /Saved Files Comparison export.*original/);
  assert.throws(() => validateImport(data, {}), /Saved Files Comparison export.*schema 1/);
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
  for (const fields of [{ repo: 'other/project' }, { branch: 'release' }, { branch: null }]) {
    assert.throws(() => reportData(left, sample(a, b, fields)), /valid saved file comparison/);
  }
  assert.deepEqual(reportData(left, sample(a, b, { token: otherCA })).files.map(file => file.userSuppliedTokenCA), [ca, otherCA]);
  assert.equal(reportData(left, left).context.userSuppliedTokenCA, 'same');
  assert.equal(reportData(left, left).files[0].sha256, null);
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
  const data = reportData(left, right);
  assert.deepEqual(data.sharedUtc, { status: 'available', intervals: [
    { startUtc: '2024-02-01T12:00:00.251Z', endExclusiveUtc: '2024-02-03T00:00:00.000Z', lastIncludedUtc: '2024-02-02T23:59:59.999Z' },
    { startUtc: '2024-02-12T00:00:00.000Z', endExclusiveUtc: '2024-02-14T00:00:00.000Z', lastIncludedUtc: '2024-02-13T23:59:59.999Z' }
  ], gaps: [
    { startUtc: '2024-02-03T00:00:00.000Z', endExclusiveUtc: '2024-02-12T00:00:00.000Z', lastIncludedUtc: '2024-02-11T23:59:59.999Z' }
  ] });
  assert.deepEqual(data.commits.sharedCounts, { both: 0, first: 0, second: 1 });
  assert.equal(data.commits.records.find(row => row.id === sha('d')).category, 'second');
  assert.equal(data.files[0].retainedUtc.gaps.length, 1);
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
    const data = reportData(left, right);
    assert.deepEqual(data.sharedUtc, { status: 'not-applicable', intervals: [], gaps: [] });
    assert.deepEqual(data.commits.sharedCounts, { both: null, first: null, second: null });
    assert.equal(data.commits.otherRecordedCounts.outside, 1);
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
  const data = reportData(left, right);
  assert.deepEqual(data.releases.records[0], { id: 7, category: 'both', conflicting: ['date', 'name', 'prerelease', 'url'], sources: [
    { status: 'shared', record: { id: 7, publishedAtUtc: '2024-02-14T10:00:00.000Z', name: 'v7', prerelease: false, url: url('sample/project', 'v7') } },
    { status: 'shared', record: { id: 7, publishedAtUtc: '2024-02-15T10:00:00.000Z', name: 'v7-preview', prerelease: true, url: url('sample/project', 'v7-preview') } }
  ] });
  assert.equal(data.commits.otherRecordedCounts.differentScope, 1);
  assert.deepEqual(data.commits.records.find(row => row.id === sha('a')).conflicting, ['date', 'author']);
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
  const data = reportData(left, partial);
  assert.equal(data.sharedUtc.status, 'available');
  assert.deepEqual(data.commits.collectionCompleteByFile, [true, false]);
  assert.deepEqual(data.commits.sharedCounts, { both: null, first: null, second: null });
  assert.deepEqual(data.commits.records[0].sources[1], { status: 'unavailable', record: null });
  assert.deepEqual(data.releases.sharedCounts, { both: 0, first: 0, second: 0 });
  assert.equal(reportData(left, sample(a, b)).commits.sharedCounts.first, 1);
});

test('slot reading rejects unsafe JSON, off-repository links and oversized input', async () => {
  await assert.rejects(readComparisonSlot(new File(['{"__proto__":true}'], 'unsafe.json')), /unsafe object keys/);
  const file = JSON.parse(realFiles[0]);
  file.periods.a.commits[0].url = 'https://github.com/another/project/commit/' + file.periods.a.commits[0].sha;
  await assert.rejects(readComparisonSlot(new File([JSON.stringify(file)], 'bad-url.json')), /GitHub link/);
  await assert.rejects(readComparisonSlot({ name: 'big.json', size: MAX_PERIOD_JSON_BYTES + 1 }), /2 MiB/);
  assert.throws(() => savedFilesJSON({ evidence: 'x'.repeat(MAX_SAVED_FILES_JSON_BYTES) }), /8 MiB export limit/);
});

function pngText(data) {
  const lines = [], rectangles = [], logos = [];
  const context = {
    measureText(value) { return { width: parseInt(this.font, 10) * 0.63 * value.length }; },
    fillText(value, x, y) { lines.push({ value, x, y, width: this.measureText(value).width, size: parseInt(this.font, 10) }); },
    fillRect(...args) { rectangles.push(args); },
    drawImage(...args) { logos.push(args); }
  };
  const layout = layoutSavedFilesPng(context, data, { complete: true, naturalWidth: 80, naturalHeight: 60 });
  layout.draw();
  assert.deepEqual(rectangles[0], [0, 0, savedFilesImageWidth, layout.height]);
  assert.equal(logos.length, 1);
  assert.ok(lines.every(line => line.x + line.width <= savedFilesImageWidth - 60 && line.y + line.size < layout.height));
  return lines.map(line => line.value);
}

test('PNG preserves each shared UTC interval, gaps and long GitHub source text end to end', () => {
  const repo = `${'a'.repeat(39)}/${'w'.repeat(100)}`, branch = 'feature/' + 'x'.repeat(1016);
  const a = day('2024-02-14'), b = day('2024-02-18');
  const file = sample(a, b, { repo, branch });
  const data = reportData(file, file);
  const lines = pngText(data);
  assert.ok(lines.includes('Local files · Unverified'));
  assert.equal(lines.filter(line => /^\d\. .*end exclusive/.test(line)).length, 2);
  assert.ok(lines.some(line => /^Gap {2}2024-02-15T00:00:00.000Z → 2024-02-18T00:00:00.000Z/.test(line)));
  assert.ok(lines.join('').includes(data.repository.url));
  assert.ok(lines.join('').includes(branch));
  assert.ok(lines.join('').includes(repo));
  assert.ok(lines.some(line => line.includes('https://dnfl1999.github.io/memediff/')));
});

test('PNG renders Unknown for incomplete shared counts and N/A for disjoint shared counts', () => {
  const a = day('2024-02-14'), b = day('2024-02-18');
  const file = sample(a, b);
  const partial = sample(a, b, { coverage: { commits: false, releases: true } });
  // Original collection metadata can be more optimistic than the validated period rows.
  partial.collection.coverage.commitsComplete = true;
  const overlap = pngText(reportData(file, partial));
  assert.equal(overlap.filter(line => line === 'Unknown').length, 3);
  assert.equal(overlap.filter(line => line === '0').length, 3);
  assert.ok(overlap.includes('Commits incomplete · Releases complete'));
  const disjoint = pngText(reportData(file, sample(day('2024-02-19'), day('2024-02-21'))));
  assert.ok(disjoint.includes('N/A · No shared UTC interval.'));
  assert.equal(disjoint.filter(line => line === 'N/A').length, 6);
  assert.equal(disjoint.filter(line => line === '0' || line === 'Unknown').length, 0);
});
