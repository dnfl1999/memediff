import { DAY, utcMillis } from './core.js';
import { githubLogin } from './period-evidence.js';

const dateOnly = value => new Date(value).toISOString().slice(0, 10);
const dateStart = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? utcMillis(`${value}T00:00:00Z`) : NaN;
const shaKey = value => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : null;
const releaseKey = value => Number.isSafeInteger(value) && value > 0 ? value : null;

export function periodBounds(report) {
  const start = utcMillis(report?.since), end = utcMillis(report?.fetchedAt);
  if (!Number.isFinite(start) || end - start !== 30 * DAY) return null;
  return { start, end, minDate: dateOnly(start), maxDate: dateOnly(end) };
}

export function defaultPeriods(bounds) {
  const today = dateStart(bounds.maxDate);
  return {
    a: { start: dateOnly(today - 14 * DAY), end: dateOnly(today - 8 * DAY) },
    b: { start: dateOnly(today - 7 * DAY), end: dateOnly(today - DAY) }
  };
}

function selection(bounds, dates) {
  const start = dateStart(dates?.start), end = dateStart(dates?.end);
  if (!Number.isFinite(start)) return { field: 'start', error: 'Enter a valid UTC start date.' };
  if (!Number.isFinite(end)) return { field: 'end', error: 'Enter a valid UTC end date.' };
  for (const [field, time] of [['start', start], ['end', end]]) {
    if (time > dateStart(bounds.maxDate)) return { field, error: 'Choose a date on or before the report date. Future dates are outside the collection.' };
    if (time < dateStart(bounds.minDate)) return { field, error: 'Choose a date within the report’s collection range.' };
  }
  if (start > end) return { field: 'end', error: 'The end date must be on or after the start date.' };
  // Date selections are half-open. The captured report includes the millisecond at fetchedAt.
  const from = Math.max(bounds.start, start), through = Math.min(bounds.end, end + DAY);
  const until = Math.min(bounds.end + 1, end + DAY);
  return { from, until, durationMs: through - from, clipped: from !== start || through !== end + DAY };
}

function observed(rows, keyOf, complete, bounds) {
  const byId = new Map();
  let valid = Array.isArray(rows);
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = keyOf(row), at = utcMillis(row?.date);
    if (key === null || !(at >= bounds.start && at <= bounds.end)) {
      valid = false;
      continue;
    }
    byId.set(key, { ...row, at });
  }
  return { rows: byId, complete: complete === true && valid };
}

const confirmedCount = (size, complete) => size > 0 || complete ? size : null;

function periodActivity(window, commits, releases) {
  const inside = row => row.at >= window.from && row.at < window.until;
  const byTime = (a, b) => b.at - a.at;
  const observedCommits = [...commits.rows.values()].filter(inside).sort(byTime)
    .map(row => ({ ...row, author: githubLogin(row.author) }));
  const observedReleases = [...releases.rows.values()].filter(inside).sort(byTime);
  const authors = new Map();
  let unlinked = 0;
  for (const row of observedCommits) {
    if (row.author) authors.set(row.author.toLowerCase(), row.author);
    else unlinked++;
  }
  const general = observedReleases.filter(row => row.prerelease === false).length;
  const prereleases = observedReleases.filter(row => row.prerelease === true).length;
  const typesComplete = releases.complete && general + prereleases === observedReleases.length;
  return {
    ...window,
    commits: { rows: observedCommits, count: confirmedCount(observedCommits.length, commits.complete), complete: commits.complete },
    releases: { rows: observedReleases, count: confirmedCount(observedReleases.length, releases.complete), complete: releases.complete,
      general: confirmedCount(general, typesComplete), prereleases: confirmedCount(prereleases, typesComplete), typesComplete },
    authors: { rows: [...authors.values()].sort((a, b) => a.localeCompare(b, 'en-US')), count: confirmedCount(authors.size, commits.complete),
      unlinked: confirmedCount(unlinked, commits.complete), complete: commits.complete }
  };
}

const difference = (a, b) => a.count === null || b.count === null ? null : b.count - a.count;

export function comparePeriods(report, selected) {
  const bounds = periodBounds(report);
  if (!bounds) return { error: 'The report’s UTC collection range is unavailable.' };
  const a = selection(bounds, selected?.a);
  if (a.error) return { ...a, period: 'a' };
  const b = selection(bounds, selected?.b);
  if (b.error) return { ...b, period: 'b' };
  const commits = observed(report.commits, row => shaKey(row?.sha), report.coverage?.commits, bounds);
  const releases = observed(report.releases, row => releaseKey(row?.id), report.coverage?.releases, bounds);
  const first = periodActivity(a, commits, releases), second = periodActivity(b, commits, releases);
  const from = Math.max(a.from, b.from), until = Math.min(a.until, b.until);
  const shared = from < until ? { from, until } : null;
  const sharedCount = source => confirmedCount([...source.rows.values()].filter(row => row.at >= from && row.at < until).length, source.complete);
  return {
    a: first, b: second,
    overlap: shared ? { ...shared, commits: sharedCount(commits), releases: sharedCount(releases) } : null,
    unequal: a.durationMs !== b.durationMs,
    delta: { commits: difference(first.commits, second.commits), releases: difference(first.releases, second.releases) }
  };
}
