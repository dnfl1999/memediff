import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect, analyze, mockGitHub, openSavedReports } from './helpers.js';
import { comparePeriods } from '../src/period-comparison.js';
import { periodExportData } from '../src/period-export.js';

const historical = readFileSync(new URL('../test/fixtures/v21-period-comparison.json', import.meta.url));
const upload = (buffer = historical, name = 'memediff-period-comparison-dnfl1999-memediff-2026-11-20.json') => ({
  name, mimeType: 'application/json', buffer
});

test('opens the actual v2.1 file offline before analysis and releases it when closed', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  await openSavedReports(page);
  await page.evaluate(() => localStorage.setItem('saved-preview-test-sentinel', 'untouched'));
  const initialStorage = await page.evaluate(() => JSON.stringify(localStorage));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.context().setOffline(true);
  const open = page.getByRole('button', { name: 'Open Saved Comparison' });
  expect(await open.evaluate(button => button.scrollWidth <= button.clientWidth + 1 &&
    button.getBoundingClientRect().right <= window.innerWidth)).toBe(true);
  const pending = page.waitForEvent('filechooser');
  await open.focus();
  await open.press('Enter');
  await (await pending).setFiles(upload());
  const preview = page.getByRole('region', { name: 'Saved Period Comparison' });
  const title = preview.getByRole('heading', { name: 'Saved Period Comparison' });
  await expect(title).toBeFocused();
  await expect(preview.getByRole('status')).toHaveText('Saved comparison opened.');
  await expect(preview).toContainText('Local file · Unverified');
  await expect(preview).toContainText('2026-11-20T08:25:25.774Z');
  await expect(preview).toContainText('Observed difference (B − A) -17');
  await expect(preview.getByRole('link', { name: 'Period B commits evidence: 14' })).toBeVisible();
  const a = preview.getByRole('link', { name: 'Period A commits evidence: 31' });
  await a.focus();
  await a.press('Enter');
  const list = preview.locator('#saved-period-a-commits');
  await expect(list.locator('summary')).toBeFocused();
  await expect(list.locator('.period-sha')).toHaveCount(31);
  const firstSHA = JSON.parse(historical).periods.a.commits[0].sha;
  await expect(list.getByRole('link', { name: firstSHA })).toHaveAttribute('href', `https://github.com/dnfl1999/memediff/commit/${firstSHA}`);
  await preview.getByText('Source evidence', { exact: true }).click();
  await expect(preview.locator('#saved-comparison-sources a')).toHaveCount(4);
  await expect(page.locator('#report')).toBeHidden();
  expect(await preview.evaluate(panel => panel.scrollWidth <= panel.clientWidth + 1)).toBe(true);
  await info.attach('historical-saved-preview', { contentType: 'image/png', body: await preview.screenshot() });

  const input = page.locator('#saved-comparison-file');
  await input.dispatchEvent('cancel');
  await expect(preview.getByRole('status')).toHaveText('File selection canceled.');
  await expect(a).toBeVisible();
  await preview.getByRole('button', { name: 'Close preview' }).click();
  await expect(preview).toBeHidden();
  await expect(open).toBeFocused();
  await expect(page.locator('#saved-comparison-results')).toBeEmpty();
  await expect(page.locator('#saved-comparison-sources')).toBeEmpty();
  await expect(input).toHaveValue('');
  await input.setInputFiles(upload());
  await expect(preview.getByRole('status')).toHaveText('Saved comparison opened.');
  await expect(a).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(initialStorage);
  const data = JSON.parse(historical);
  await info.attach('historical-preview-proof', { contentType: 'application/json', body: JSON.stringify({
    project: info.project.name, offline: true, fileBytes: historical.length,
    sha256: createHash('sha256').update(historical).digest('hex'), observation: data.observedAtUtc,
    displayedCommitCounts: [31, 14], displayedDelta: -17, networkRequests: requests.length, storageUnchanged: true,
    initialLiveReportHidden: true, closedAndCleared: true
  }) });
});

test('preserves a live report and baseline through partial, invalid and canceled preview reads', async ({ page }) => {
  await mockGitHub(page);
  await page.goto('./');
  await openSavedReports(page);
  await analyze(page);
  await page.locator('#save').click();
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  const live = await page.locator('#report-title').textContent();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const name = ('<img src="https://example.test/preview.png" onerror="window.previewXss=1"> ' + 'LongReleaseLabel'.repeat(15)).slice(0, 180);
  const report = { source:'github-live', repo:'sample/project', branch:'main',
    token:'DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork', since:'2024-02-01T12:00:00.250Z', fetchedAt:'2024-03-02T12:00:00.250Z',
    coverage:{commits:false,releases:true,maxCommits:1000,maxReleases:500}, commits:[],
    releases:[{id:3, date:'2024-02-29T00:00:00Z', name, prerelease:false, url:'https://github.com/sample/project/releases/tag/v1'}] };
  const selected = { a:{start:'2024-02-28',end:'2024-02-29'}, b:{start:'2024-02-29',end:'2024-03-02'} };
  const partial = periodExportData(report, selected, comparePeriods(report, selected));
  const input = page.locator('#saved-comparison-file');
  await input.setInputFiles(upload(Buffer.from(JSON.stringify(partial)), 'partial.json'));
  const preview = page.getByRole('region', { name: 'Saved Period Comparison' });
  await expect(preview.getByRole('status')).toHaveText('Saved comparison opened.');
  await expect(preview).toContainText('User-supplied token CA');
  await expect(preview).toContainText('Collection is incomplete.');
  await expect(preview).toContainText('Periods overlap');
  await expect(preview.getByRole('link', { name: 'Period A commits evidence: Unknown' })).toBeVisible();
  await preview.getByRole('link', { name: 'Period B releases evidence: 1' }).click();
  await expect(preview.getByText(name, { exact:true })).toBeVisible();
  expect(await preview.locator('img').count()).toBe(0);
  expect(await page.evaluate(() => window.previewXss)).toBeUndefined();

  const tampered = { ...partial, difference: { ...partial.difference, commits: 0 } };
  await input.setInputFiles(upload(Buffer.from(JSON.stringify(tampered)), 'tampered.json'));
  await expect(preview.getByRole('status')).toContainText('differences do not match');
  await expect(preview).toContainText('sample/project');
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      return this.name === 'delayed.json' ? new Promise(resolve => {
        window.finishSavedRead = async () => resolve(await read.call(this));
      }) : read.call(this);
    };
  });
  await input.setInputFiles(upload(historical, 'delayed.json'));
  await preview.getByRole('button', { name: 'Cancel reading' }).click();
  await page.evaluate(() => window.finishSavedRead());
  await expect(preview.getByRole('status')).toHaveText('File reading canceled.');
  await expect(preview).toContainText('sample/project');
  await expect(page.locator('#report-title')).toHaveText(live);
  await expect(page.locator('.sha-explorer')).toBeVisible();
  await expect(page.getByRole('button', { name: '7 days', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
  expect(requests).toEqual([]);
});
