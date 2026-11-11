import { fetchReport } from '../src/github.js';
import { compareSnapshots } from '../src/core.js';
import assert from 'node:assert/strict';
let token = '';
if (process.argv.includes('--credential-stdin')) { for await (const chunk of process.stdin) token += chunk; token = token.trim(); }
const fetcher = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
const report = await fetchReport('dnfl1999/memediff', '', { fetcher });
assert.equal(report.repo, 'dnfl1999/memediff');
assert.equal(report.source, 'github-live');
assert.ok(report.coverage.commits);
assert.ok(report.coverage.releases);
assert.deepEqual(compareSnapshots(report, report).observed, []);
const roundTrip = JSON.parse(JSON.stringify(report));
assert.deepEqual(roundTrip.metrics, report.metrics);
console.log(JSON.stringify({ mode: token ? 'authenticated developer smoke (production remains unauthenticated)' : 'unauthenticated production API smoke', repo: report.repo, fetchedAt: report.fetchedAt, metrics: report.metrics, coverage: report.coverage, warnings: report.warnings, comparisonAndJsonRoundTrip: 'passed' }, null, 2));
