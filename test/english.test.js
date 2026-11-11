import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { formatDate, formatNumber } from '../src/format.js';
import { receiptData } from '../src/receipt.js';

test('all shipped interface source is free of Korean literals', () => {
  for (const file of ['index.html', 'style.css', 'favicon.svg', ...readdirSync('src').map(f => `src/${f}`)]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u, file);
  }
  assert.match(readFileSync('index.html', 'utf8'), /<html lang="en">/);
});

test('display dates and numbers use English and UTC without changing data', () => {
  assert.equal(formatDate('2026-11-11T23:05:06Z'), 'Nov 11, 2026, 23:05:06 UTC');
  assert.equal(formatDate('invalid'), 'Unknown date');
  assert.equal(formatNumber(12345), '12,345');
  assert.equal(formatNumber(-1234), '-1,234');
});

test('receipt formats grouped counts while JSON numbers remain numeric', () => {
  const report = {repo:'a/b', fetchedAt:'2026-11-11T12:00:00.000Z', commits:[], releases:[], metrics:{30:{commits:1000,releases:500,contributors:1000,unattributed:0}},coverage:{commits:false,releases:true}};
  assert.deepEqual(receiptData(report,30,null).counts,['1,000+','500','1,000+']);
  assert.equal(JSON.parse(JSON.stringify(report)).metrics[30].commits,1000);
});
