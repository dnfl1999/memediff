import { utcMillis } from '../src/core.js';

export const qaChecks = {
  unit: { label: 'Unit', stage: 'verify', step: 'Unit tests', source: 'node-test-json' },
  preDeploy: { label: 'Pre-deploy desktop/mobile', stage: 'verify', step: 'Chromium desktop and mobile E2E (mock API)', source: 'playwright-json' },
  publicMock: { label: 'Public desktop/mobile (mock API)', stage: 'publicQA', step: 'Public Pages desktop and mobile E2E (mock API)', source: 'playwright-json' },
  publicLive: { label: 'Public real API', stage: 'publicQA', step: 'Public Pages real GitHub API and downloads (no retries)', source: 'playwright-json' }
};

export function exact(record, keys) {
  return !!record && typeof record === 'object' && !Array.isArray(record) && Object.keys(record).length === keys.length &&
    keys.every(key => Object.hasOwn(record, key));
}

export const qaCount = value => Number.isSafeInteger(value) && value >= 0;
export const okStatus = code => Number.isInteger(code) && code >= 200 && code <= 299;
export const errorStatus = code => Number.isInteger(code) && code >= 400 && code <= 599;
const failures = new Set(['unexpected-http', 'test-failure', 'runner-error']);

function validBins(bins, validCode) {
  return Array.isArray(bins) && bins.every((row, index) => Array.isArray(row) && row.length === 2 &&
    validCode(row[0]) && qaCount(row[1]) && row[1] > 0 && (index === 0 || row[0] > bins[index - 1][0]));
}

function validHttp(http) {
  if (!exact(http, ['ok', 'expected', 'unexpected', 'recovered']) || !validBins(http.ok, okStatus) ||
      !validBins(http.expected, errorStatus) || !validBins(http.unexpected, errorStatus) ||
      !qaCount(http.recovered)) return false;
  const countFor = (bins, code) => bins.find(row => row[0] === code)?.[1] ?? 0;
  return http.recovered <= Math.min(countFor(http.expected, 422), countFor(http.ok, 200));
}

export function emptyQa(status, { runId, runAttempt }) {
  return { status, passed: null, failed: null, skipped: null, startedAt: null, completedAt: null, evidence: null,
    failure: null, http: null, runId, runAttempt };
}

export function qaStatus(failed, skipped, failure) {
  return failure || failed > 0 ? 'failure' : skipped > 0 ? 'skipped' : 'success';
}

export function validQaCheck(check, record, key) {
  if (!exact(check, ['status', 'passed', 'failed', 'skipped', 'startedAt', 'completedAt', 'evidence', 'failure', 'http', 'runId', 'runAttempt']) ||
      check.runId !== record.runId || check.runAttempt !== record.runAttempt) return false;
  if (check.evidence === null) {
    return ['skipped', 'unavailable'].includes(check.status) &&
      [check.passed, check.failed, check.skipped, check.startedAt, check.completedAt, check.failure, check.http].every(value => value === null);
  }
  const start = check.startedAt === null ? null : utcMillis(check.startedAt);
  const end = check.completedAt === null ? null : utcMillis(check.completedAt);
  return check.evidence === qaChecks[key].source && [check.passed, check.failed, check.skipped].every(qaCount) &&
    (check.passed + check.failed + check.skipped > 0 || check.failure === 'runner-error') &&
    (start === null || Number.isFinite(start) && start <= utcMillis(record.recordedAt)) &&
    (end === null || Number.isFinite(end) && end <= utcMillis(record.recordedAt)) &&
    (start === null || end === null || start <= end) &&
    (check.failure === null || failures.has(check.failure)) &&
    (check.failed === 0 || check.failure !== null) &&
    (check.failure !== 'test-failure' || check.failed > 0) &&
    (check.failure !== 'unexpected-http' || check.http?.unexpected?.length > 0) &&
    (check.http === null || key !== 'unit' && validHttp(check.http)) &&
    check.status === qaStatus(check.failed, check.skipped, check.failure);
}

export function qaMatchesStep(check, outcome) {
  if (check.status === 'unavailable') return true;
  if (!check.evidence) return ['skipped', 'not-run'].includes(outcome);
  return outcome === (check.status === 'failure' ? 'failure' : 'success');
}

export function validQa(qa, record) {
  return exact(qa, Object.keys(qaChecks)) && Object.keys(qaChecks).every(key => {
    const outcome = record.stages[qaChecks[key].stage];
    const check = qa[key];
    return validQaCheck(check, record, key) &&
      (outcome !== 'not-run' || check.evidence === null) &&
      (outcome !== 'success' || check.status !== 'failure');
  });
}

export function qaSummary(qa) {
  if (!qa) return ['- QA diagnostics: Unavailable'];
  const bins = rows => rows.length ? rows.map(([code, count]) => `${code} × ${count}`).join(', ') : 'none observed';
  return Object.entries(qaChecks).map(([key, { label }]) => {
    const check = qa[key];
    if (!check.evidence) return `- ${label}: ${check.status === 'skipped' ? 'Not run' : 'Unavailable'}`;
    const counts = `${check.status} · ${check.passed} passed / ${check.failed} failed / ${check.skipped} skipped`;
    const cause = check.failure ? ` · ${check.failure}` : '';
    const http = check.http ? ` · HTTP OK ${bins(check.http.ok)} · Expected errors ${bins(check.http.expected)} · Unexpected errors ${bins(check.http.unexpected)} · 422 → 200 recovered ${check.http.recovered}` :
      key === 'unit' ? '' : ' · HTTP evidence Unavailable';
    return `- ${label}: ${counts}${cause}${http}`;
  });
}
