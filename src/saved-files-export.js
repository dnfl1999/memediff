import { authorSource, iso, periodExportFormat, periodKeys, savedFilesExportFormat } from './period-evidence.js';
import { savedWindows } from './saved-file-comparison.js';

export const MAX_SAVED_FILES_JSON_BYTES = 8 * 1024 * 1024;
export const MAX_SAVED_FILES_PNG_BYTES = 8 * 1024 * 1024;

const provenance = 'Local file · Unverified';
const notes = [
  'The original files are editable and unverified. GitHub links do not authenticate their contents.',
  'SHA-256 identifies the bytes of a file and does not authenticate it.',
  'An unobserved SHA does not establish code deletion.',
  'Recorded development activity does not measure productivity or token safety.',
  'Shared totals are null for N/A when there is no shared interval, or for Unknown when collection could not confirm a count. Counts in incomplete coverage describe recorded evidence.'
];

function utcInterval({ from, until }) {
  return { startUtc: iso(from), endExclusiveUtc: iso(until), lastIncludedUtc: iso(until - 1) };
}

function scope(windows) {
  return {
    intervals: windows.map(utcInterval),
    gaps: windows.slice(1).map(({ from }, index) => utcInterval({ from: windows[index].until, until: from }))
  };
}

function fileEvidence(file) {
  const { startUtc, endInclusiveUtc, durationDays, coverage, limits, apiEvidence } = file.collection;
  return {
    provenance, inputFormat: periodExportFormat, inputVersion: 1,
    observedAtUtc: file.observedAt, userSuppliedTokenCA: file.token, sha256: file.fingerprint ?? null,
    collection: { startUtc, endInclusiveUtc, durationDays, coverage, limits, apiEvidence },
    periods: Object.fromEntries(periodKeys.map(key => {
      const { start, end } = file.selected[key];
      const period = file.comparison[key];
      return [key, {
        selected: { startDateUtc: start, endDateUtc: end }, effective: utcInterval(period),
        coverage: { commitsComplete: period.commits.complete, releasesComplete: period.releases.complete,
          releaseTypesComplete: period.releases.typesComplete }
      }];
    })),
    retainedUtc: scope(savedWindows(file))
  };
}

function observations({ rows, coverage, totals }, projectRecord) {
  const otherRecordedCounts = { outside: 0, differentScope: 0, unknown: 0 };
  const records = rows.map(({ id, category, conflicting, sources }) => {
    if (Object.hasOwn(otherRecordedCounts, category)) otherRecordedCounts[category]++;
    return { id, category, conflicting, sources: sources.map(({ row, status }) => ({
      status, record: row ? projectRecord(row) : null
    })) };
  });
  return { sharedCounts: totals, collectionCompleteByFile: coverage, otherRecordedCounts, records };
}

export function savedFilesExportData(files, comparison, createdAt = Date.now()) {
  if (files.length !== 2 || !comparison || comparison.blocked) throw new Error('Apply a valid saved file comparison first.');
  return {
    format: savedFilesExportFormat, version: 1, createdAtUtc: iso(createdAt),
    source: provenance, repository: files[0].repository,
    files: files.map(fileEvidence),
    context: { sameFile: comparison.sameFile, userSuppliedTokenCA: comparison.ca, observationOrder: comparison.observationOrder },
    sharedUtc: { status: comparison.shared.length ? 'available' : 'not-applicable', ...scope(comparison.shared) },
    commits: observations(comparison.commits, row => ({
      sha: row.sha, committedAtUtc: row.date, author: row.author, authorUrl: authorSource(row.author), url: row.url
    })),
    releases: observations(comparison.releases, row => ({
      id: row.id, publishedAtUtc: row.date, name: row.name, prerelease: row.prerelease, url: row.url
    })),
    notes: [...notes]
  };
}

export function savedFilesJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  if (!blob.size || blob.size > MAX_SAVED_FILES_JSON_BYTES) throw new Error('The saved files comparison JSON exceeds the 8 MiB export limit.');
  return blob;
}

export function savedFilesFilename(data, extension) {
  return `memediff-saved-files-comparison-${data.repository.name.replace('/', '-')}-${data.createdAtUtc.slice(0, 10)}.${extension}`;
}
