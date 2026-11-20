import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectQaCheck } from '../scripts/collect-qa-diagnostic.mjs';
import { buildDiagnostic, maxDiagnosticBytes, parseDiagnostic } from '../scripts/index-diagnostic.mjs';
import { emptyQa, qaMatchesStep, qaSummary } from '../scripts/qa-diagnostic.mjs';

const startedAt = '2026-11-20T06:04:40.808Z';
const recordedAt = '2026-11-20T06:20:55.000Z';
const identity = { runId: '44684768948', runAttempt: 1, recordedAt };
const browser = (responses = [], expectedResponses = []) => ({ responses, expectedResponses, expectedStatuses: [], expectedURLs: [] });
const attach = (name, value) => ({ name, contentType: 'application/json', body: Buffer.from(JSON.stringify(value)).toString('base64') });
const sample = (projectName, status = 'expected', attachments = []) => ({ projectName, status, results: [{ attachments }] });
function report(tests, startTime = startedAt) {
  const stats = { startTime, duration: 1000, expected: 0, unexpected: 0, skipped: 0, flaky: 0 };
  for (const test of tests) stats[test.status]++;
  return { stats, suites: [{ suites: [{ specs: [{ tests }] }] }], errors: [] };
}
const ctx = (key, tests, outcome = 'success', run = identity) => collectQaCheck(key, report(tests), run, outcome);

test('historic public import.js HTTP 503 stays a failure after a successful separate run', () => {
  const history = JSON.parse(readFileSync(new URL('../docs/v18-qa.json', import.meta.url)));
  const { status, url } = history.pages.publicQA.failure;
  const failed = ctx('publicMock', [sample('desktop'), sample('mobile', 'unexpected',
    [attach('browser-diagnostics', browser([{ url, status }]))])], 'failure');
  const later = ctx('publicMock', [sample('desktop'), sample('mobile', 'expected',
    [attach('browser-diagnostics', browser([{ url, status: 200 }]))])], 'success',
  { ...identity, runId: String(history.pagesRevalidation.runId) });
  assert.equal(failed.runId, String(history.pages.runId));
  assert.equal(failed.status, 'failure');
  assert.equal(failed.failure, 'unexpected-http');
  assert.deepEqual(failed.http.unexpected, [[503, 1]]);
  assert.equal(later.status, 'success');
  assert.deepEqual(later.http.unexpected, []);
  assert.deepEqual(later.http.ok, [[200, 1]]);
});

test('records 409 and rate limits, distinguishes 422 recovery and avoids overlapping evidence counts', () => {
  const url = 'https://api.github.com/repos/a/b/commits?token=ignored';
  const other = url.replace('/b/', '/c/');
  const timeout = { url, status: 422, message: 'The request is taking too long to process.' };
  const responses = [{ url: other, status: 409, message: 'Git Repository is empty.' },
    { url, status: 403, remaining: '0', message: 'sensitive text' }, { url, status: 429 }, timeout, timeout, { url, status: 200 }];
  const evidence = values => attach('LIVE-api-evidence', { mocked: false, authenticated: false, responses: values });
  const check = ctx('publicLive', [sample('live', 'skipped', [evidence(responses.slice(0, 2)), evidence(responses),
    attach('browser-diagnostics', browser(responses))]), sample('live')]);
  assert.equal(check.status, 'skipped');
  assert.deepEqual([check.passed, check.failed, check.skipped], [1, 0, 1]);
  assert.deepEqual(check.http, { ok: [[200, 1]], expected: [[403, 1], [409, 1], [422, 1], [429, 1]],
    unexpected: [[422, 1]], recovered: 1 });
  assert.doesNotMatch(JSON.stringify(check), /ignored|sensitive|api.github.com/);
  const noRetry = ctx('publicLive', [sample('live', 'unexpected', [evidence([timeout, { url: other, status: 200 },
    { url: other, status: 409, message: 'Other conflict' }, { url, status: 403 }])])], 'failure');
  assert.deepEqual(noRetry.http.unexpected, [[403, 1], [409, 1], [422, 1]]);
  assert.equal(noRetry.http.recovered, 0);
});

test('keeps observed test counts under runner failure and rejects inconsistent reports and steps', () => {
  const unit = { counts: { tests: 3, passed: 1, failed: 1, skipped: 1, todo: 0, cancelled: 0 },
    startedAt, completedAt: startedAt, success: false };
  const check = collectQaCheck('unit', unit, identity, 'failure');
  assert.deepEqual([check.passed, check.failed, check.skipped, check.failure], [1, 1, 1, 'test-failure']);
  assert.throws(() => collectQaCheck('unit', unit, identity, 'success'), /disagree/);
  const failedRunner = ctx('publicLive', [sample('live')], 'failure');
  assert.deepEqual([failedRunner.passed, failedRunner.failed, failedRunner.skipped, failedRunner.failure], [1, 0, 0, 'runner-error']);
  const malformed = report([sample('desktop'), sample('mobile')]);
  malformed.stats.expected++;
  assert.throws(() => collectQaCheck('publicMock', malformed, identity, 'success'), /Inconsistent/);
  assert.throws(() => ctx('publicMock', [sample('live')]), /Invalid Playwright test/);
});

test('v2 validates evidence identity, state, HTTP codes and limits while reading v1', () => {
  const options = { ...identity, now: recordedAt, workflow: 'Verify and deploy Pages', event: 'push',
    stages: { verify: 'success', deploy: 'success', publicQA: 'failure' } };
  const old = buildDiagnostic(options);
  assert.equal(parseDiagnostic(JSON.stringify(old)).schemaVersion, 1);
  const qa = { unit: emptyQa('unavailable', identity), preDeploy: emptyQa('unavailable', identity),
    publicMock: ctx('publicMock', [sample('desktop'), sample('mobile', 'unexpected')], 'failure'),
    publicLive: ctx('publicLive', [sample('live', 'skipped')]) };
  const value = buildDiagnostic({ ...options, qa });
  assert.deepEqual(parseDiagnostic(JSON.stringify(value)), value);
  assert.match(qaSummary(qa).join('\n'), /Unavailable[\s\S]*0 passed \/ 0 failed \/ 1 skipped/);
  assert.match(qaSummary({ ...qa, publicLive: emptyQa('skipped', identity) }).at(-1), /Not run/);
  assert.equal(qaMatchesStep(qa.publicLive, 'not-run'), false);
  assert.equal(qaMatchesStep(qa.publicLive, 'success'), true);
  assert.equal(qaMatchesStep(qa.publicMock, 'success'), false);
  for (const mutation of [{ runId: '99' }, { runAttempt: 2 }, { evidence: 'https://private' }, { token: 'private' },
    { startedAt: '2026-11-21T00:00:00.000Z' }, { http: { ok: [[503, 1]], expected: [], unexpected: [], recovered: 0 } },
    { http: { ok: [], expected: [], unexpected: [[503, 1], [503, 2]], recovered: 0 } },
    { http: { ok: [], expected: [], unexpected: [], recovered: 1 } }]) {
    assert.equal(parseDiagnostic(JSON.stringify({ ...value, qa: { ...qa, publicMock: { ...qa.publicMock, ...mutation } } })), null);
  }
  assert.equal(parseDiagnostic(JSON.stringify({ ...value, stages: { ...value.stages, publicQA: 'success' } })), null);
  assert.equal(parseDiagnostic(' '.repeat(maxDiagnosticBytes) + JSON.stringify(value)), null);
  const hugeHttp = { ok: [], expected: [], unexpected: Array.from({ length: 200 }, (_, i) => [400 + i, 100000000]), recovered: 0 };
  assert.throws(() => buildDiagnostic({ ...options, qa: { ...qa, preDeploy: { ...qa.publicLive, http: hugeHttp },
    publicMock: { ...qa.publicMock, http: hugeHttp }, publicLive: { ...qa.publicLive, http: hugeHttp } } }), /size limit/);
});
