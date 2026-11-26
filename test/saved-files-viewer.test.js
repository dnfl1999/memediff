import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MAX_PERIOD_JSON_BYTES } from '../src/period-export.js';
import { MAX_SAVED_FILES_JSON_BYTES } from '../src/saved-files-export.js';
import { iso } from '../src/period-evidence.js';
import { readSavedComparison } from '../src/saved-comparison.js';
import { parseSavedFilesReport, readSavedFilesReport } from '../src/saved-files-viewer.js';
import { generatedSavedFilesReport, literalReleaseName } from './fixtures/generated-saved-files-viewer.js';

const read = relative => readFileSync(new URL(relative, import.meta.url));
const historic = read('./fixtures/v24-public-saved-files-comparison.json');
const parse = report => parseSavedFilesReport(JSON.stringify(report));
const change = (edit, message, base = JSON.parse(historic)) => {
  edit(base);
  assert.throws(() => parse(base), message);
};

test('rebuilds the original v2.4 PC download and verifies the recorded evidence and UTC boundaries', async () => {
  assert.equal(historic.length, 53584);
  assert.equal(createHash('sha256').update(historic).digest('hex'), 'b48b5ff76d5306ad93c53cb665d42968554e285e0b1db245e07320ae4872bd2a');
  const { files, comparison, createdAtUtc } = await readSavedFilesReport(new File([historic], 'original.json'));
  assert.equal(createdAtUtc, JSON.parse(historic).createdAtUtc);
  assert.deepEqual(files[0].repository, { name: 'dnfl1999/memediff', branch: 'main', url: 'https://github.com/dnfl1999/memediff' });
  assert.deepEqual(files.map(file => file.fingerprint), [
    'a4f840bc9964547da58d6ebace027596d518700a535c81a21fa791853fcdffa5',
    '2b67ef1e4411de61aa4c75d52a19ec371eba6ea96c3c973da446fb3ce5f5e301'
  ]);
  assert.deepEqual(comparison.shared.map(({ from, until }) => [iso(from), iso(until)]),
    [['2026-11-07T00:00:00.000Z', '2026-11-20T08:25:25.775Z']]);
  assert.equal(comparison.observationOrder, 1);
  assert.deepEqual(comparison.commits.totals, { both: 45, first: 0, second: 0 });
  assert.equal(comparison.commits.rows.length, 48);
  assert.equal(comparison.commits.rows.filter(row => row.category === 'outside' && row.sources[1].status === 'outside').length, 3);
  assert.deepEqual(comparison.releases.totals, { both: 0, first: 0, second: 0 });
});

test('enforces the format and version and distinguishes the two existing import types', () => {
  change(data => { data.format = 'other'; }, /Choose a MemeDiff/);
  change(data => { data.version = '1'; }, /Unsupported/);
  change(data => { data.version = 2; }, /Unsupported/);
  change(data => { data.additional = true; }, /structure/);
  assert.throws(() => parseSavedFilesReport(read('./fixtures/v21-period-comparison.json').toString()), /individual Period Comparison/);
  assert.throws(() => parseSavedFilesReport(read('../docs/examples/memediff-v1.1-2026-11-12.json').toString()), /Import Previous Report/);
});

test('checks 8 MiB before reading or parsing while the original input limit remains 2 MiB', async () => {
  const max = MAX_SAVED_FILES_JSON_BYTES;
  const full = historic.toString() + ' '.repeat(max - historic.length);
  assert.equal(parseSavedFilesReport(full).comparison.commits.rows.length, 48);
  assert.throws(() => parseSavedFilesReport(full + ' '), /8 MiB/);
  assert.throws(() => parseSavedFilesReport(historic.toString() + 'é'.repeat(max / 2)), /8 MiB/);
  await assert.rejects(readSavedFilesReport({ name: 'oversize.json', size: max + 1, text: () => assert.fail('read oversized file') }), /8 MiB/);
  await assert.rejects(readSavedComparison({ name: 'oversize.json', size: MAX_PERIOD_JSON_BYTES + 1 }), /2 MiB/);
});

test('rejects invalid repository, branch, token, times and source metadata', () => {
  change(data => { data.repository.branch = null; }, /GitHub branch/);
  change(data => { data.repository.name = 'dnfl1999/MemeDiff'; }, /repository/i);
  change(data => { data.repository.url = 'https://example.test/dnfl1999/memediff'; }, /GitHub source/);
  change(data => { data.files[0].userSuppliedTokenCA = 'fake-address'; }, /Solana|address/i);
  change(data => { data.createdAtUtc = '2026-11-31T00:00:00.000Z'; }, /UTC export/);
  change(data => { data.files[0].collection.startUtc = '2026-10-21T08:25:25.775Z'; }, /30-day/);
  change(data => { data.files[0].periods.b.selected.startDateUtc = '2026-02-29'; }, /period dates/);
  change(data => { data.files[0].sha256 = 'z'.repeat(64); }, /SHA-256/);
  change(data => { data.files[0].provenance = 'Verified'; }, /Source metadata/);
  change(data => { data.context.observationOrder = -1; }, /observation order/);
});

test('recomputes source period, retained and shared intervals with exact millisecond bounds and gaps', () => {
  change(data => { data.files[0].periods.b.effective.endExclusiveUtc = '2026-11-20T08:25:25.774Z'; }, /UTC boundaries/);
  change(data => { data.files[1].retainedUtc.intervals.pop(); }, /UTC boundaries/);
  change(data => { data.sharedUtc.intervals[0].endExclusiveUtc = '2026-11-20T08:25:25.774Z'; }, /Shared UTC intervals/);
  const generated = generatedSavedFilesReport();
  assert.equal(parse(generated).comparison.shared.length, 2);
  assert.deepEqual(generated.sharedUtc.gaps, [{ startUtc: '2024-02-14T00:00:00.000Z',
    endExclusiveUtc: '2024-02-19T00:00:00.000Z', lastIncludedUtc: '2024-02-18T23:59:59.999Z' }]);
  change(data => { data.sharedUtc.gaps = []; }, /Shared UTC intervals or gaps/, generated);
});

test('rejects manipulated aggregates, categories, source states and coverage declarations', () => {
  change(data => { data.commits.sharedCounts.both++; }, /totals/);
  change(data => { data.commits.otherRecordedCounts.outside = 0; }, /totals/);
  change(data => { data.commits.records[0].category = 'both'; }, /classifications/);
  change(data => { data.commits.records[0].sources[1].status = 'shared'; }, /classifications/);
  change(data => { data.commits.collectionCompleteByFile[1] = false; }, /totals/);
  change(data => { data.files[0].collection.coverage.commitsComplete = false; }, /coverage/);
  change(data => { data.files[1].periods.b.coverage.releasesComplete = false; }, /inconsistent collection coverage/);
  change(data => { data.files[0].periods.a.coverage.releaseTypesComplete = false; }, /coverage/);
});

test('bounds input records and rejects duplicate SHA or release IDs and mismatched source identities', () => {
  change(data => { data.commits.records.push(data.commits.records[0]); }, /duplicate comparison evidence identity/);
  change(data => { data.commits.records[0].id = 'b'.repeat(40); }, /comparison identity/);
  change(data => { data.commits.records[0].sources.forEach(source => { source.record = null; }); }, /needs recorded evidence/);
  change(data => { data.commits.records = Array(2001).fill(null); }, /collection limit/);
  change(data => { data.releases.records.push(data.releases.records[0]); }, /duplicate comparison evidence identity/, generatedSavedFilesReport());
  change(data => { data.releases.records[0].id = '7'; }, /comparison identity/, generatedSavedFilesReport());
});

test('retains release conflicts and validates each GitHub link as strictly as original period imports', () => {
  const release = parse(generatedSavedFilesReport()).comparison.releases.rows[0];
  assert.deepEqual(release.conflicting, ['date', 'name', 'prerelease', 'url']);
  assert.equal(release.sources[0].row.name, literalReleaseName);
  assert.equal(release.sources[1].row.url, 'https://github.com/fixture/project/releases/tag/v7-preview');
  change(data => { data.releases.records[0].conflicting.pop(); }, /source conflicts/, generatedSavedFilesReport());
  change(data => { data.files[0].collection.apiEvidence[0] = 'https://api.github.com/repos/dnfl1999/memediff/commits?token=private'; }, /GitHub API evidence/);
  change(data => { data.commits.records[0].sources[1].record.url = 'https://github.com/another/project/commit/' + data.commits.records[0].id; }, /GitHub link/);
  change(data => { data.commits.records[0].sources[1].record.authorUrl = 'https://github.com/another-user'; }, /links/);
  change(data => { data.releases.records[0].sources[0].record.url = 'https://github.com/fixture/project/releases/tag/v7?query=1'; }, /GitHub link/, generatedSavedFilesReport());
});

test('keeps recorded fingerprint equality, Unknown, N/A and confirmed zero distinct', () => {
  const same = parse(generatedSavedFilesReport({ same: true }));
  assert.equal(same.comparison.sameFile, true);
  assert.equal(same.comparison.observationOrder, 0);
  change(data => { data.files[1].sha256 = data.files[0].sha256; data.context.sameFile = true; }, /different source evidence/, generatedSavedFilesReport());
  const partial = parse(generatedSavedFilesReport({ partial: true })).comparison;
  assert.deepEqual(partial.commits.totals, { both: 1, first: null, second: 1 });
  assert.equal(partial.commits.rows.find(row => row.id === 'b'.repeat(40)).category, 'unknown');
  assert.deepEqual(partial.releases.totals, { both: 1, first: 0, second: 0 });
  const disjoint = parse(generatedSavedFilesReport({ disjoint: true })).comparison;
  assert.deepEqual(disjoint.shared, []);
  assert.deepEqual(disjoint.commits.totals, { both: null, first: null, second: null });
});

test('recomputes different source scopes from the timestamps independently of record order', () => {
  const recorded = generatedSavedFilesReport({ shifted: true });
  recorded.commits.records.reverse();
  const { commits } = parse(recorded).comparison;
  const row = commits.rows.find(item => item.id === 'a'.repeat(40));
  assert.equal(row.category, 'differentScope');
  assert.deepEqual(row.sources.map(source => source.status), ['shared', 'outside']);
  assert.deepEqual(row.conflicting, ['date', 'author']);
});

test('rejects deeply nested, malformed and prototype-related JSON', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => parseSavedFilesReport('{"' + key + '":0}'), /unsafe object keys/);
  }
  assert.throws(() => parseSavedFilesReport('[{"a":'.repeat(10) + '0' + '}]'.repeat(10)), /nested too deeply/);
  assert.throws(() => parseSavedFilesReport('{broken'), /Invalid JSON/);
});
