import { readFile } from 'node:fs/promises';
import { test, expect, analyze, downloadReport, mockGitHub } from './helpers.js';
import { DAY, summarize } from '../src/core.js';

const upload = (page, data) => page.locator('#import-file').setInputFiles({ name: 'previous.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
const iso = ms => new Date(ms).toISOString();
const explorer = page => page.getByRole('region', { name: 'SHA Explorer' });
const button = (box, label) => box.getByRole('button', { name: label });

function previousReport(current, age, commits) {
  const fetched = Date.parse(current.fetchedAt) - age * DAY;
  return { ...current, comparison: null, fetchedAt: iso(fetched), since: iso(fetched-30*DAY), commits, releases: [], metrics: summarize(commits, [], fetched) };
}

test('SHA Explorer filters and paginates without changing sources, storage or downloads', async ({ page }, info) => {
  const now = Date.now();
  const rawCommits = Array.from({ length: 23 }, (_, i) => ({ sha: (i+1).toString(16).padStart(40,'0'),
    commit: { committer: { date: iso(now-3*DAY-i*1000) }, message: `Current commit ${i}` }, author: { login: 'current-author' } }));
  await page.route('https://api.github.com/**', route => {
    const { pathname } = new URL(route.request().url());
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: pathname.endsWith('/commits') ? rawCommits
      : pathname.endsWith('/releases') ? [] : { full_name: 'fixture/project', default_branch: 'main', private: false } });
  });
  await page.goto('./');
  await analyze(page);
  await page.locator('#save').click();
  const current = await downloadReport(page, 'json', info);
  const common = { ...current.commits[0], author: null, message: 'Earlier stored message', date: iso(Date.parse(current.since)-1) };
  const goneSHA = 'f'.repeat(40), injected = '<img src=x onerror="window.__shaInjected=1">' + 'Z'.repeat(190);
  const gone = { ...current.commits[0], sha: goneSHA, url: `https://github.com/${current.repo}/commit/${goneSHA}`, message: injected };
  const previous = previousReport(current, 1, [common, gone]);
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await upload(page, previous);
  await page.locator('#import-apply').click();
  const box = explorer(page);
  await expect(box).toContainText('unverified imported JSON');
  await expect(box.locator('.sha-row')).toHaveCount(20);
  await expect(button(box, 'All observations in overlap (24)')).toHaveAttribute('aria-pressed', 'true');
  await expect(box.getByRole('status')).toContainText('Page 1 of 2');
  await expect(box.locator('.sha-row').filter({ hasText: 'Observed in both' })).toContainText('Previous · Outside shared interval');
  await expect(box.locator('.sha-row').filter({ hasText: 'Observed in both' })).toContainText(common.date);
  await expect(box.locator('.sha-row').filter({ hasText: 'Observed in both' })).toContainText(current.commits[0].date);

  await button(box, 'Next page').focus();
  await page.keyboard.press('Enter');
  await expect(box.getByRole('status')).toContainText('Showing 21–24');
  await expect(box.locator('.sha-row')).toHaveCount(4);
  await page.locator('[data-days="7"]').click();
  await expect(box.getByRole('status')).toContainText('Page 2 of 2');
  await button(box, 'Previous page').click();
  await expect(box.locator('.sha-row')).toHaveCount(20);

  const newly = button(box, 'Newly observed in overlap (22)');
  await newly.click();
  await expect(newly).toHaveAttribute('aria-pressed', 'true');
  await expect(box.locator('.sha-row').filter({ hasText: 'Observed in both' })).toHaveCount(0);
  const beforeFilter = await downloadReport(page, 'json', info);
  const pngBefore = await readFile((await downloadReport(page, 'png', info)).path);
  const missing = button(box, 'No longer observed in overlap (1)');
  await missing.click();
  await expect(missing).toHaveAttribute('aria-pressed', 'true');
  await expect(box.locator('.sha-row')).toHaveCount(1);
  await expect(box).toContainText(injected);
  await expect(box.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__shaInjected)).toBeUndefined();
  const source = box.getByRole('link', { name: `Open GitHub commit ${goneSHA}` });
  await expect(source).toHaveAttribute('href', gone.url);
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await downloadReport(page, 'json', info)).toEqual(beforeFilter);
  expect(await readFile((await downloadReport(page, 'png', info)).path)).toEqual(pngBefore);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  await box.screenshot({ path: info.outputPath('sha-explorer.png') });

  await upload(page, current);
  await page.locator('#import-dismiss').click();
  await expect(missing).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#import-restore').click();
  await expect(button(box, 'No longer observed in overlap (0)')).toBeVisible();
  await button(box, 'No longer observed in overlap (0)').click();
  await expect(box.getByRole('status')).toHaveText('No SHA observations match this filter.');
  await page.locator('#clear').click();
  await expect(box).toHaveCount(0);
});

test('touching and disjoint timelines expose correct SHA availability and retain warnings', async ({ page }, info) => {
  await mockGitHub(page);
  await page.goto('./');
  await analyze(page);
  const current = await downloadReport(page, 'json', info);
  const boundary = Date.parse(current.since);
  const first = { ...current.commits[0], sha: 'f'.repeat(40), url: `https://github.com/${current.repo}/commit/${'f'.repeat(40)}`, date: iso(boundary) };
  const second = { ...current.commits[1], sha: 'e'.repeat(40), url: `https://github.com/${current.repo}/commit/${'e'.repeat(40)}`, date: iso(boundary-1) };
  const touching = previousReport({ ...current, coverage: { ...current.coverage, commits: false } }, 30, [first,second]);
  await upload(page, touching);
  await page.locator('#import-apply').click();
  const box = explorer(page);
  await expect(page.locator('.observation-timeline')).toContainText('Boundary only');
  await expect(box).toContainText('Incomplete collection');
  await expect(box.locator('.sha-row')).toHaveCount(1);
  await expect(box.getByRole('link')).toHaveAttribute('href', first.url);
  await upload(page, previousReport({ ...current, coverage: touching.coverage }, 31, []));
  await page.locator('#import-apply').click();
  await expect(box).toContainText('N/A · No shared interval.');
  await expect(box).toContainText('Incomplete collection');
  await expect(box.getByRole('button')).toHaveCount(0);
});
