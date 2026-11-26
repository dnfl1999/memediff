import { comparePeriods } from './period-comparison.js';
import { periodExportFormat, periodKeys, savedFilesExportFormat } from './period-evidence.js';
import { checkJsonDepth, hasExactKeys as exact, parseUntrustedJSON, readLocalJSONText } from './local-json.js';
import { isRecordedUtc, savedCommitRecord, savedReleaseRecord, savedReportFields, validSavedPeriodCoverage } from './saved-comparison.js';
import { compareSavedFiles } from './saved-file-comparison.js';
import { MAX_SAVED_FILES_JSON_BYTES, savedFilesExportData } from './saved-files-export.js';

const fail = message => { throw new Error(message); };
const kinds = ['commits', 'releases'];
const limit = { commits: 1000, releases: 500 };

function matches(value, expected) {
  if (!expected || typeof expected !== 'object') return value === expected;
  if (Array.isArray(expected)) return Array.isArray(value) && value.length === expected.length &&
    expected.every((item, index) => matches(value[index], item));
  const keys = Object.keys(expected);
  return exact(value, keys) && keys.every(key => matches(value[key], expected[key]));
}

function recordedFile(file, repository) {
  if (!exact(file, ['provenance', 'inputFormat', 'inputVersion', 'observedAtUtc', 'userSuppliedTokenCA', 'sha256', 'collection', 'periods', 'retainedUtc']) ||
      !exact(file.periods, periodKeys) || (file.sha256 !== null && (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)))) {
    fail('Invalid source file metadata or recorded SHA-256.');
  }
  const { observedAtUtc, userSuppliedTokenCA, collection, periods } = file;
  const report = savedReportFields({ repository, collection, observedAtUtc, userSuppliedTokenCA, source: 'github-live' });
  const selected = {};
  for (const key of periodKeys) {
    const period = periods[key];
    if (!exact(period, ['selected', 'effective', 'coverage']) || !exact(period.selected, ['startDateUtc', 'endDateUtc']) ||
        !validSavedPeriodCoverage(period.coverage, collection)) fail('Invalid recorded period or collection coverage.');
    selected[key] = { start: period.selected.startDateUtc, end: period.selected.endDateUtc };
  }
  const { commitsComplete, releasesComplete } = periods.a.coverage;
  if (commitsComplete !== periods.b.coverage.commitsComplete || releasesComplete !== periods.b.coverage.releasesComplete) {
    fail('The source periods use inconsistent collection coverage.');
  }
  return { selected, report: { ...report, commits: [], releases: [], coverage: { commits: commitsComplete, releases: releasesComplete } } };
}

function restoreEvidence(section, kind, originals, files) {
  if (!exact(section, ['sharedCounts', 'collectionCompleteByFile', 'otherRecordedCounts', 'records']) ||
      !Array.isArray(section.records) || section.records.length > 2 * limit[kind]) fail('Invalid comparison evidence or collection limit exceeded.');
  const byId = new Map();
  for (const observation of section.records) {
    if (!exact(observation, ['id', 'category', 'conflicting', 'sources']) || !Array.isArray(observation.sources) ||
        observation.sources.length !== 2 || byId.has(observation.id)) fail('Invalid or duplicate comparison evidence identity.');
    let hasRecord = false;
    observation.sources.forEach((source, index) => {
      if (!exact(source, ['status', 'record'])) fail('Invalid comparison evidence source.');
      if (source.record === null) return;
      const report = originals[index].report;
      let entry, id;
      if (kind === 'commits') {
        if (!exact(source.record, ['sha', 'committedAtUtc', 'author', 'authorUrl', 'url'])) fail('Invalid commit evidence fields.');
        const { sha, committedAtUtc, author, url } = source.record;
        entry = savedCommitRecord({ sha, committedAtUtc, author, url }, report);
        id = entry.sha.toLowerCase();
      } else {
        entry = savedReleaseRecord(source.record, report);
        id = entry.id;
      }
      if (id !== observation.id) fail('A source record does not match its comparison identity.');
      if (report[kind].length >= (files[index].collection.limits[kind] ?? limit[kind])) fail('Source evidence exceeds the collection limit.');
      report[kind].push(entry);
      hasRecord = true;
    });
    if (!hasRecord) fail('A comparison row needs recorded evidence.');
    byId.set(observation.id, observation);
  }
  return byId;
}

function validateSavedFilesReport(data) {
  if (data?.schema === 1) fail('Choose a Saved Files Comparison JSON. Snapshots open in Import Previous Report.');
  if (data?.format === periodExportFormat) fail('Choose a Saved Files Comparison JSON. Open an individual Period Comparison with Open Saved Comparison.');
  if (data?.format !== savedFilesExportFormat) fail('Choose a MemeDiff Saved Files Comparison JSON.');
  if (data.version !== 1) fail('Unsupported Saved Files Comparison version. Choose a version 1 JSON.');
  if (!exact(data, ['format', 'version', 'createdAtUtc', 'source', 'repository', 'files', 'context', 'sharedUtc', 'commits', 'releases', 'notes']) ||
      !isRecordedUtc(data.createdAtUtc) || !Array.isArray(data.files) || data.files.length !== 2 ||
      !Array.isArray(data.notes) || data.notes.length > 5 || !data.notes.every(note => typeof note === 'string' && note.length <= 512)) {
    fail('Invalid comparison structure or UTC export time.');
  }
  if (data.repository?.branch === null) fail('The comparison requires a recorded GitHub branch.');
  const originals = data.files.map(file => recordedFile(file, data.repository));
  const evidence = kinds.map(kind => restoreEvidence(data[kind], kind, originals, data.files));
  const files = originals.map(({ report, selected }, index) => {
    const comparison = comparePeriods(report, selected);
    if (comparison.error) fail(`Invalid recorded period dates. ${comparison.error}`);
    const { collection, sha256 } = data.files[index];
    return { repository: data.repository, token: report.token || null, observedAt: report.fetchedAt, collection, selected,
      comparison, fingerprint: sha256 };
  });
  const comparison = compareSavedFiles(...files);
  const expected = savedFilesExportData(files, comparison, Date.parse(data.createdAtUtc));
  if (data.source !== expected.source || !matches(data.files, expected.files)) fail('Source metadata, UTC boundaries or coverage do not match the evidence.');
  if (!matches(data.sharedUtc, expected.sharedUtc)) fail('Shared UTC intervals or gaps do not match the source periods.');
  if (!matches(data.context, expected.context)) fail('Source fingerprints, addresses or observation order do not match.');
  if (comparison.sameFile && (!matches(expected.files[0], expected.files[1]) || kinds.some(kind =>
    expected[kind].records.some(({ sources }) => !matches(sources[0].record, sources[1].record))))) {
    fail('Matching recorded fingerprints have different source evidence.');
  }
  for (const [index, kind] of kinds.entries()) {
    const { records, ...totals } = data[kind];
    const { records: computed, ...expectedTotals } = expected[kind];
    if (!matches(totals, expectedTotals) || records.length !== computed.length ||
        !computed.every(row => matches(evidence[index].get(row.id), row))) {
      fail(`Recorded ${kind} totals, classifications, links or source conflicts do not match the evidence.`);
    }
  }
  return { files, comparison, createdAtUtc: data.createdAtUtc };
}

export function parseSavedFilesReport(raw) {
  if (typeof raw !== 'string' || !raw.trim()) fail('Choose a non-empty Saved Files Comparison JSON.');
  if (raw.length > MAX_SAVED_FILES_JSON_BYTES || new TextEncoder().encode(raw).byteLength > MAX_SAVED_FILES_JSON_BYTES) fail('File exceeds the 8 MiB limit.');
  checkJsonDepth(raw, 8);
  let data;
  try { data = parseUntrustedJSON(raw); }
  catch { fail('Invalid JSON or unsafe object keys.'); }
  return validateSavedFilesReport(data);
}

export async function readSavedFilesReport(file) {
  return parseSavedFilesReport(await readLocalJSONText(file, MAX_SAVED_FILES_JSON_BYTES));
}
