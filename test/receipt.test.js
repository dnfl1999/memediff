import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptData, drawReceipt } from '../src/receipt.js';

const report = {
  repo: 'owner/project', branch: 'main', fetchedAt: '2026-11-11T07:00:00.000Z', token: '',
  metrics: { 7: { commits: 2, releases: 0, contributors: 1, unattributed: 1 }, 30: { commits: 3, releases: 1, contributors: 2, unattributed: 1 } },
  coverage: { commits: false, releases: true },
  commits: [{ date: '2026-11-10T07:00:00Z', url: 'https://github.com/owner/project/commit/' + 'a'.repeat(40) }],
  releases: [{ date: '2026-10-20T07:00:00Z', url: 'https://github.com/owner/project/releases/tag/v1' }]
};
test('receipt uses selected UTC window, lower bounds and only in-window evidence', () => {
  const r = receiptData(report, 7, null);
  assert.equal(r.windowStart, '2026-11-04T07:00:00.000Z');
  assert.deepEqual(r.counts, ['2+', '0', '1+']);
  assert.equal(r.complete, false);
  assert.equal(r.evidenceUrl, report.commits[0].url);
  const empty = receiptData({ ...report, commits: [] }, 7, null);
  assert.equal(empty.evidenceUrl, null);
  assert.equal(receiptData({ ...report, commits: [] }, 30, null).evidenceUrl, report.releases[0].url);
});
test('receipt labels comparison as 30-day even for a 7-day card and rejects unsafe evidence', () => {
  const r = receiptData({ ...report, commits: [{ date: report.fetchedAt, url: 'javascript:alert(1)' }] }, 7,
    { previousAt: report.fetchedAt, observed: ['a'], missing: [], partial: true });
  assert.match(r.baseline, /30-day/); assert.match(r.changes, /PARTIAL/);
  assert.equal(r.evidenceUrl, null);
});
test('rendered receipt preserves full bounded source URLs and uncertainty labels', () => {
  const lines = [];
  const ctx = { fillRect() {}, fillText(s, x, y) { lines.push({ s, x, y }); }, measureText: s => ({ width: s.length * 10 }) };
  drawReceipt(ctx, report, 7, null);
  assert(lines.some(l => l.s === 'Development Receipt'));
  assert(lines.some(l => l.s.startsWith('PARTIAL OBSERVATION')));
  assert(lines.some(l => l.s === report.commits[0].url));
  assert(lines.some(l => l.s.includes('not a signed certificate')));
  assert(lines.every(l => l.y <= 1020));
});

test('long repository and commit URLs wrap completely without overlapping evidence rows', () => {
  const repo = 'w'.repeat(39) + '/' + 'w'.repeat(100);
  const url = `https://github.com/${repo}/commit/${'a'.repeat(40)}`;
  const lines = [];
  const ctx = { fillRect() {}, fillText(s, x, y) { lines.push({ s, y }); }, measureText: s => ({ width: s.length * 11 }) };
  drawReceipt(ctx, { ...report, repo, commits: [{ date: report.fetchedAt, url }] }, 7, null);
  assert.equal(lines.filter(l => l.y >= 766 && l.y < 811).map(l => l.s).join(''), `https://github.com/${repo}`);
  assert.equal(lines.filter(l => l.y >= 811 && l.y < 872).map(l => l.s).join(''), url);
});
