import { parseRepo, parseToken, safeLink } from './core.js';
import { authorSource, githubLogin, iso, periodExportFormat, periodKeys, releaseSource } from './period-evidence.js';
import { commitSource } from './sha-explorer.js';

export const MAX_PERIOD_JSON_BYTES = 2 * 1024 * 1024;
export const MAX_PERIOD_PNG_BYTES = 8 * 1024 * 1024;
export const periodHomepage = 'https://dnfl1999.github.io/memediff/';

const scopeNotes = [
  'Commits use default-branch committer timestamps. Public releases use their published time.',
  'UTC end dates are included. The effective end is exclusive; the final captured millisecond is recorded separately.',
  'Counts reflect observations. Partial counts are lower bounds; null means a value could not be confirmed.',
  'Count differences describe the selected durations and do not measure work performed or token safety.',
  'A token address, when present, is user-supplied. This comparison does not establish a token association.'
];

const effective = ({ from, until }) => ({ startUtc: iso(from), endExclusiveUtc: iso(until), lastIncludedUtc: iso(until - 1) });
const limit = value => Number.isSafeInteger(value) && value > 0 ? value : null;

function apiEvidence(report) {
  const root = `/repos/${report.repo}`;
  const keys = new Set(['sha', 'since', 'until', 'per_page', 'page']);
  return [...new Set((report.evidence ?? []).map(safeLink).filter(value => {
    if (!value || value.length > 2048) return false;
    const url = new URL(value), path = url.pathname.toLowerCase();
    if (url.hostname !== 'api.github.com' || url.hash) return false;
    if (path === root) return !url.search;
    return (path === `${root}/commits` || path === `${root}/releases`) &&
      [...url.searchParams.keys()].every(key => keys.has(key));
  }))];
}

function exportPeriod(repo, dates, period) {
  const { commits, releases, authors } = period;
  if (commits.rows.length > 1000 || releases.rows.length > 500 || authors.rows.length > 1000) throw new Error('Period evidence exceeds the export limit.');
  return {
    selected: { startDateUtc: dates.start, endDateUtc: dates.end },
    effective: effective(period), durationMs: period.durationMs, clipped: period.clipped,
    coverage: { commitsComplete: commits.complete, releasesComplete: releases.complete, releaseTypesComplete: releases.typesComplete },
    counts: { commits: commits.count, releases: releases.count, authors: authors.count, unlinkedCommits: authors.unlinked,
      generalReleases: releases.general, prereleases: releases.prereleases },
    commits: commits.rows.map(row => ({ sha: row.sha, committedAtUtc: iso(row.at), url: commitSource(repo, row.sha), author: githubLogin(row.author) })),
    releases: releases.rows.map(row => ({ id: row.id, name: typeof row.name === 'string' ? row.name : null,
      publishedAtUtc: iso(row.at), prerelease: typeof row.prerelease === 'boolean' ? row.prerelease : null, url: releaseSource(repo, row.url) })),
    authors: authors.rows.filter(githubLogin).map(login => ({ login, url: authorSource(login) }))
  };
}

export function periodExportData(report, dates, comparison) {
  if (report?.source !== 'github-live' || !comparison || comparison.error || parseRepo(report.repo) !== report.repo) {
    throw new Error('A current live GitHub period comparison is required.');
  }
  const overlap = comparison.overlap;
  const reportedCoverage = { commitsComplete: report.coverage?.commits === true, releasesComplete: report.coverage?.releases === true };
  return {
    format: periodExportFormat, version: 1,
    repository: { name: report.repo, branch: report.branch ?? null, url: `https://github.com/${report.repo}` },
    userSuppliedTokenCA: parseToken(report.token ?? '') || null,
    source: report.source, observedAtUtc: iso(Date.parse(report.fetchedAt)),
    collection: { startUtc: iso(Date.parse(report.since)), endInclusiveUtc: iso(Date.parse(report.fetchedAt)),
      durationDays: 30, coverage: reportedCoverage,
      limits: { commits: limit(report.coverage?.maxCommits), releases: limit(report.coverage?.maxReleases) },
      apiEvidence: apiEvidence(report) },
    periods: Object.fromEntries(periodKeys.map(key => [key, exportPeriod(report.repo, dates[key], comparison[key])])),
    difference: { direction: 'b-minus-a', ...comparison.delta },
    unequalDurations: comparison.unequal,
    overlap: { exists: overlap !== null, effective: overlap ? effective(overlap) : null,
      observedSharedCommits: overlap ? overlap.commits : 0, observedSharedReleases: overlap ? overlap.releases : 0 },
    notes: [...scopeNotes]
  };
}

export function periodJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  if (!blob.size || blob.size > MAX_PERIOD_JSON_BYTES) throw new Error('The comparison JSON exceeds the 2 MiB export limit.');
  return blob;
}

export function periodFilename(data, extension) {
  return `memediff-period-comparison-${data.repository.name.replace('/', '-')}-${data.observedAtUtc.slice(0, 10)}.${extension}`;
}
