import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { DAY } from '../src/core.js';

const samples = [
  ['vitejs-vite', 'vitejs/vite', '2026-11-26T06:38:20.845Z', [127, 14, false], 'b00bbbc13329cbee304077a32dd6230c38418c11d11cf450ed80854e742fa230', '8455a0be6e5a51af0a13d6551a4c6ffcf23a4e1148b91812e827a69bc72ac7d2'],
  ['octocat-hello-world', 'octocat/hello-world', '2026-11-26T06:38:27.022Z', [0, 0, true], '585284e436c541b12128c69683c505acdfc1b680cf46d43074639b6779e209c9', '40feac6c3aa7f3c1f287865f316e0f6d050e936948ddfa440ffc5a5b8e970b55'],
  ['dnfl1999-memediff', 'dnfl1999/memediff', '2026-11-26T06:38:28.639Z', [55, 0, true], 'f5ef2c3feace173cc7a5111449f931d946fb167721c2813b912084eb96b50fc2', 'c25d766f3e1d6f24dbc52bf27122b49afe5c2405d945e504d0032a21c5b384fb']
];
const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('recorded sample links expose original JSON and valid PNGs with their real observation times and coverage', () => {
  const html = read('index.html').toString();
  for (const [name, repo, observedAt, counts, jsonHash, pngHash] of samples) {
    const json = read(`assets/examples/${name}.json`), png = read(`assets/examples/${name}.png`);
    assert.equal(digest(json), jsonHash);
    assert.equal(digest(png), pngHash);
    const report = JSON.parse(json);
    assert.deepEqual([report.schema, report.repo, report.fetchedAt, report.selectedDays, report.token], [1, repo, observedAt, 30, '']);
    assert.equal(Date.parse(report.fetchedAt) - Date.parse(report.since), 30 * DAY);
    assert.deepEqual([report.commits.length, report.releases.length, report.coverage.releases], counts);
    assert.equal(report.coverage.commits, true);
    const image = PNG.sync.read(png, { checkCRC: true });
    assert.deepEqual([image.width, image.height], [1400, 1020]);
    for (const extension of ['json','png']) assert.ok(html.includes(`href="./assets/examples/${name}.${extension}"`));
    assert.ok(html.includes(`datetime="${observedAt}"`));
  }
});

test('recorded MemeDiff comparison uses two contiguous 15-day intervals within its original 30-day window', () => {
  const report = JSON.parse(read('assets/examples/dnfl1999-memediff.json'));
  const midpoint = Date.parse(report.since) + 15 * DAY;
  const first = report.commits.filter(row => Date.parse(row.date) < midpoint).length;
  assert.deepEqual([first, report.commits.length - first], [6, 49]);
});
