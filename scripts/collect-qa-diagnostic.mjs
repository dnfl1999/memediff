import { appendFile, readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { classifyLiveResponses, expectedBrowserError } from '../e2e/http-evidence.js';
import { emptyQa, errorStatus, okStatus, qaChecks, qaCount, qaMatchesStep, qaStatus, validQaCheck } from './qa-diagnostic.mjs';

const maxReportBytes = 32 * 1024 * 1024;
const reports = {
  unit: 'qa-results/unit-v19.json',
  preDeploy: 'qa-results/linux-build-mock/results.json',
  publicMock: 'qa-results/linux-public-mock/results.json',
  publicLive: 'qa-results/linux-public-live/results.json'
};

function attachment(result, name) {
  const entry = result.attachments.findLast(value => value.name === name);
  if (!entry) return null;
  if (entry.contentType !== 'application/json' || typeof entry.body !== 'string') throw new Error('Invalid QA attachment.');
  return JSON.parse(Buffer.from(entry.body, 'base64').toString('utf8'));
}

function responseKey(response) {
  if (typeof response.url !== 'string' || !(okStatus(response.status) || errorStatus(response.status))) {
    throw new Error('Invalid HTTP observation.');
  }
  return JSON.stringify([response.url, response.status]);
}

function observedHttp(result, live) {
  const browser = attachment(result, 'browser-diagnostics');
  const evidence = live ? attachment(result, 'LIVE-api-evidence') : null;
  if (!browser && !evidence) return null;
  if (evidence && (evidence.mocked !== false || evidence.authenticated !== false || !Array.isArray(evidence.responses))) {
    throw new Error('Invalid live QA attachment.');
  }
  if (browser && ['responses', 'expectedResponses', 'expectedStatuses', 'expectedURLs'].some(key => !Array.isArray(browser[key]))) {
    throw new Error('Invalid browser QA attachment.');
  }
  // The live attachment is a cumulative snapshot. Use its latest copy and merge matching
  // browser observations by occurrence, keeping repeated requests and same-origin errors.
  const liveResponses = evidence?.responses.filter(response => okStatus(response.status) || errorStatus(response.status)) ?? [];
  const classifications = classifyLiveResponses(liveResponses);
  const covered = new Map();
  const observations = liveResponses.map((response, index) => {
    const key = responseKey(response);
    covered.set(key, (covered.get(key) ?? 0) + 1);
    return { status: response.status, ...classifications[index] };
  });
  for (const response of browser?.responses ?? []) {
    const key = responseKey(response);
    const count = covered.get(key) ?? 0;
    if (count) covered.set(key, count - 1);
    else observations.push({ status: response.status, expected: errorStatus(response.status) && expectedBrowserError(browser, response), recovered: false });
  }
  return observations;
}

function* reportTests(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) yield* spec.tests;
    yield* reportTests(suite.suites ?? []);
  }
}

function playwrightResult(report, key) {
  const { stats } = report;
  if (!stats || !['expected', 'unexpected', 'skipped', 'flaky'].every(field => qaCount(stats[field])) ||
      !Array.isArray(report.errors) || !Array.isArray(report.suites) || !Number.isFinite(stats.duration) || stats.duration < 0) {
    throw new Error('Invalid Playwright report.');
  }
  const completedAt = new Date(Date.parse(stats.startTime) + stats.duration).toISOString();
  const live = key === 'publicLive';
  const projects = new Set();
  const outcomes = { expected: 0, unexpected: 0, skipped: 0, flaky: 0 };
  const http = { ok: new Map(), expected: new Map(), unexpected: new Map() };
  let hasHttpEvidence = false;
  let unexpectedFailure = false;
  let recovered = 0;
  for (const test of reportTests(report.suites)) {
    const validProject = live ? test.projectName === 'live' : ['desktop', 'mobile'].includes(test.projectName);
    if (!validProject || !Object.hasOwn(outcomes, test.status) || !Array.isArray(test.results) ||
        (!test.results.length && test.status !== 'skipped')) throw new Error('Invalid Playwright test result.');
    projects.add(test.projectName);
    outcomes[test.status]++;
    for (const result of test.results) {
      const observations = observedHttp(result, live);
      if (!observations) continue;
      hasHttpEvidence = true;
      for (const observation of observations) {
        const { status } = observation;
        const bucket = okStatus(status) ? 'ok' : observation.expected ? 'expected' : 'unexpected';
        const counts = http[bucket];
        counts.set(status, (counts.get(status) ?? 0) + 1);
        if (bucket === 'unexpected' && test.status === 'unexpected') unexpectedFailure = true;
        if (observation.recovered) recovered++;
      }
    }
  }
  if (Object.keys(outcomes).some(field => outcomes[field] !== stats[field]) ||
      (!report.errors.length && projects.size !== (live ? 1 : 2))) throw new Error('Inconsistent Playwright report.');
  const bins = name => [...http[name]].sort(([a], [b]) => a - b);
  return {
    passed: stats.expected + stats.flaky, failed: stats.unexpected, skipped: stats.skipped,
    startedAt: stats.startTime, completedAt,
    failure: unexpectedFailure ? 'unexpected-http' : stats.unexpected ? 'test-failure' : report.errors.length ? 'runner-error' : null,
    http: hasHttpEvidence ? { ok: bins('ok'), expected: bins('expected'), unexpected: bins('unexpected'), recovered } : null
  };
}

function unitResult(report) {
  const { counts } = report;
  if (!counts || !['tests', 'passed', 'failed', 'skipped', 'todo', 'cancelled'].every(field => qaCount(counts[field])) ||
      typeof report.success !== 'boolean' || counts.tests !== counts.passed + counts.failed + counts.skipped + counts.todo + counts.cancelled) {
    throw new Error('Invalid Node test report.');
  }
  return {
    passed: counts.passed, failed: counts.failed, skipped: counts.skipped,
    startedAt: report.startedAt, completedAt: report.completedAt,
    failure: counts.failed ? 'test-failure' : report.success ? null : 'runner-error', http: null
  };
}

export function collectQaCheck(key, report, record, outcome) {
  const stats = key === 'unit' ? unitResult(report) : playwrightResult(report, key);
  // A report may omit a runner-level error. Keep observed counts when that runner failed.
  if (outcome === 'failure' && !stats.failure) stats.failure = 'runner-error';
  const check = { ...stats, status: qaStatus(stats.failed, stats.skipped, stats.failure),
    evidence: qaChecks[key].source, runId: record.runId, runAttempt: record.runAttempt };
  if (!validQaCheck(check, record, key) || !qaMatchesStep(check, outcome)) throw new Error('QA report and test step disagree.');
  return check;
}

async function collect(group, env) {
  const record = { runId: env.GITHUB_RUN_ID, runAttempt: Number(env.GITHUB_RUN_ATTEMPT), recordedAt: new Date().toISOString() };
  for (const [key, { stage }] of Object.entries(qaChecks)) {
    if (stage !== group) continue;
    const outcome = env[`QA_${key.toUpperCase()}_OUTCOME`];
    let check = emptyQa(outcome === 'skipped' ? 'skipped' : 'unavailable', record);
    if (['success', 'failure'].includes(outcome)) {
      try {
        const path = reports[key];
        if ((await stat(path)).size > maxReportBytes) throw new Error('Report exceeds its size limit.');
        check = collectQaCheck(key, JSON.parse(await readFile(path, 'utf8')), record, outcome);
      } catch {
        console.warn(`::warning::${qaChecks[key].label} diagnostic evidence is unavailable. See the test step and browser QA artifact.`);
      }
    }
    await appendFile(env.GITHUB_OUTPUT, `${key}=${JSON.stringify(check)}\n`);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await collect(process.argv[2], process.env);
}
