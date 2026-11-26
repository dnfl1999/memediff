import { DAY } from '../../src/core.js';
import { comparePeriods } from '../../src/period-comparison.js';
import { periodExportData } from '../../src/period-export.js';
import { parseSavedComparison } from '../../src/saved-comparison.js';
import { compareSavedFiles } from '../../src/saved-file-comparison.js';
import { savedFilesExportData } from '../../src/saved-files-export.js';

const repo = 'fixture/project';
const day = value => ({ start: value, end: value });
const selected = { a: day('2024-02-13'), b: day('2024-02-19') };
const commit = (digit, date, author) => ({ sha: digit.repeat(40), date, author });
const release = (date, name, tag, prerelease) => ({ id: 7, date, name, prerelease, url: `https://github.com/${repo}/releases/tag/${tag}` });
export const literalReleaseName = '<img src="https://example.test/never.png" onerror="window.viewerMarkupExecuted=true">';

function preview(report, dates, fingerprint) {
  const fetchedAt = report.fetchedAt ?? '2024-03-02T12:00:00.250Z';
  const raw = { repo, branch: 'main', source: 'github-live', token: '', fetchedAt,
    since: new Date(Date.parse(fetchedAt) - 30 * DAY).toISOString(),
    coverage: { commits: true, releases: true }, ...report };
  return { ...parseSavedComparison(JSON.stringify(periodExportData(raw, dates, comparePeriods(raw, dates)))), fingerprint };
}

export function generatedSavedFilesReport({ partial = false, disjoint = false, same = false, shifted = false } = {}) {
  const first = preview({
    commits: [commit('a', '2024-02-13T01:00:00.000Z', 'first'), commit('b', '2024-02-13T02:00:00.000Z', 'first')],
    releases: [release('2024-02-13T03:00:00.000Z', literalReleaseName, 'v7', false)]
  }, selected, 'a'.repeat(64));
  const secondDates = disjoint ? { a: day('2024-02-15'), b: day('2024-02-21') } : {
    ...selected, b: { ...selected.b, end: shifted ? '2024-02-20' : selected.b.end }
  };
  const second = same ? first : preview({
    fetchedAt: '2024-03-02T12:00:00.251Z',
    coverage: { commits: !partial, releases: true },
    commits: [commit('a', shifted ? '2024-02-20T01:00:00.001Z' : '2024-02-13T01:00:00.001Z', 'second'),
      commit('c', '2024-02-19T02:00:00.000Z', 'second')],
    releases: [release('2024-02-13T03:00:00.001Z', 'Preview release', 'v7-preview', true)]
  }, secondDates, 'b'.repeat(64));
  const files = [first, second];
  return savedFilesExportData(files, compareSavedFiles(...files), Date.parse('2024-03-03T05:00:00.000Z'));
}
