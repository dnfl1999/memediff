import { test, expect, analyze, downloadReport, downloadPeriodExports, mockGitHub } from './helpers.js';

const now = Date.parse('2024-03-02T12:00:00.250Z');

test('compares UTC periods, opens original evidence and preserves report and baseline state', async ({ page }, info) => {
  const message = '<img src=x onerror="window.__xss=1"> ' + 'LongCommitScope'.repeat(25);
  const api = await mockGitHub(page, { now, commitMessage: message });
  await page.clock.setFixedTime(now);
  await page.goto('./');
  await analyze(page);
  await page.locator('#save').click();
  const compare = page.getByRole('region', { name: 'Compare Two Periods' });
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  const requests = api.requests.length;
  const before = await downloadReport(page, 'json', info);
  await compare.getByLabel('Period A start date').fill('2024-02-10');
  await compare.getByLabel('Period A end date').fill('2024-02-15');
  await compare.getByLabel('Period B start date').fill('2024-02-26');
  await compare.getByLabel('Period B end date').fill('2024-03-02');
  const button = compare.getByRole('button', { name: 'Compare periods' });
  await button.focus();
  await button.press('Enter');
  await expect(compare.getByRole('status')).toHaveText('Period comparison updated.');
  await expect(compare).toContainText('Periods have different durations.');
  await expect(compare).toContainText('2024-03-02T12:00:00.250Z');
  await expect(compare.getByRole('article', { name: 'Period B evidence' })).toContainText('Observed duration 5 days 12:00:00.250');
  await expect(compare.locator('.period-chart')).toHaveCount(2);
  const [firstBar, secondBar] = await compare.locator('.period-chart').first().locator('.period-chart-bar')
    .evaluateAll(bars => bars.map(bar => bar.getBoundingClientRect().width));
  expect(firstBar).toBeGreaterThan(0);
  expect(secondBar / firstBar).toBeCloseTo(2, 1);
  await expect(compare.getByRole('link', { name: 'Period A commits evidence: 1' })).toBeVisible();
  const commitCount = compare.getByRole('link', { name: 'Period B commits evidence: 2' });
  await expect(commitCount).toBeVisible();
  await commitCount.focus();
  await commitCount.press('Enter');
  await expect(compare.locator('#period-b-commits summary')).toBeFocused();
  await expect(compare.locator('#period-b-commits .period-sha').first()).toHaveAttribute('href', 'https://github.com/fixture/project/commit/' + 'a'.repeat(40));
  await expect(compare.getByText(message.slice(0, 240), { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(compare.locator('#period-b-commits').getByRole('link', { name: 'fixture-dev' }).first())
    .toHaveAttribute('href', 'https://github.com/fixture-dev');
  await compare.getByRole('link', { name: 'Period B releases evidence: 1' }).click();
  await expect(compare.locator('#period-b-releases').getByRole('link', { name: 'Fixture v1' }))
    .toHaveAttribute('href', 'https://github.com/fixture/project/releases/tag/v1');
  await expect(compare.locator('#period-b-releases')).toContainText('ID 1 · Prerelease');
  await expect(compare.getByRole('article', { name: 'Period B evidence' })).toContainText('0 general releases · 1 prerelease');
  expect(await compare.evaluate(section => section.scrollWidth <= section.clientWidth + 1)).toBe(true);
  await info.attach('period-comparison', { contentType: 'image/png', body: await compare.screenshot() });
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  await expect(commitCount).toBeVisible();
  await expect(page.locator('#metrics')).toContainText('Commits');
  await expect(page.locator('.sha-explorer')).toBeVisible();
  const after = await downloadReport(page, 'json', info);
  expect(after).toEqual({ ...before, selectedDays: 7 });
  const png = await downloadReport(page, 'png', info);
  expect(png.height).toBe(1260);
  const files = await downloadPeriodExports(page, info);
  expect(files.json.periods.b.counts).toEqual({ commits: 2, releases: 1, authors: 1, unlinkedCommits: 0, generalReleases: 0, prereleases: 1 });
  expect(files.json.periods.b.effective.endExclusiveUtc).toBe('2024-03-02T12:00:00.251Z');
  expect(files.json.periods.b.commits.map(row => row.sha)).toEqual(['a'.repeat(40), 'b'.repeat(40)]);
  expect(files.json.periods.b.releases[0].url).toBe('https://github.com/fixture/project/releases/tag/v1');
  expect(files.pngFile.renderedCounts.b).toEqual(['2', '1', '1']);
  await page.locator('#import-file').setInputFiles({ name: files.jsonFile.name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(files.json)) });
  await expect(page.locator('#import-status')).toContainText('Choose a MemeDiff schema 1 report');
  await expect(page.locator('.sha-explorer')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
  expect(api.requests).toHaveLength(requests);
});

test('clearly marks overlap, rejects invalid dates and distinguishes unknown coverage from a confirmed zero', async ({ page, diagnostics }, info) => {
  diagnostics.expectedStatuses = [500];
  await mockGitHub(page, { now, commitError: 500 });
  await page.clock.setFixedTime(now);
  await page.goto('./');
  await analyze(page);
  const compare = page.getByRole('region', { name: 'Compare Two Periods' });
  const pick = (label, value) => compare.getByLabel(label).fill(value);
  const apply = () => compare.getByRole('button', { name: 'Compare periods' }).click();
  await pick('Period A start date', '2024-02-27');
  await pick('Period A end date', '2024-02-28');
  await pick('Period B start date', '2024-02-28');
  await pick('Period B end date', '2024-02-29');
  await apply();
  await expect(compare).toContainText('Periods overlap');
  await expect(compare).toContainText('Collection is incomplete.');
  await expect(compare.getByRole('link', { name: 'Period A commits evidence: Unknown' })).toBeVisible();
  await expect(compare.getByRole('link', { name: 'Period A releases evidence: 0' })).toBeVisible();
  const files = await downloadPeriodExports(page, info);
  expect(files.json.periods.a.counts.commits).toBeNull();
  expect(files.json.periods.a.counts.releases).toBe(0);
  expect(files.json.overlap.observedSharedCommits).toBeNull();
  expect(files.pngFile.renderedCounts.a).toEqual(['Unknown', '0', 'Unknown']);
  await expect(page.locator('#warnings')).toContainText('Commit collection is incomplete.');
  const end = compare.getByLabel('Period B end date');
  for (const [date, error] of [['2024-02-27', 'end date must be on or after'], ['2024-03-03', 'Future dates'], ['2024-01-20', 'collection range']]) {
    await end.fill(date);
    await apply();
    await expect(compare.getByRole('status')).toContainText(error);
    await expect(end).toHaveAttribute('aria-invalid', 'true');
    await expect(end).toBeFocused();
    await expect(compare.locator('#period-results')).toBeHidden();
    await expect(compare.getByRole('button', { name: 'Export Comparison JSON' })).toBeDisabled();
  }
});

test('disables dirty or canceled exports and rejects a late or failed PNG encoder result', async ({ page, diagnostics }) => {
  const mock = await mockGitHub(page, { now });
  await page.clock.setFixedTime(now);
  await page.goto('./');
  await analyze(page);
  const json = page.locator('#period-export-json'), png = page.locator('#period-export-png');
  const date = page.getByLabel('Period B end date');
  const apply = page.getByRole('button', { name: 'Compare periods' });
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  const requests = mock.requests.length;
  await expect(json).toBeEnabled();
  await page.evaluate(() => {
    const original = HTMLAnchorElement.prototype.click;
    window.periodDownloads = [];
    HTMLAnchorElement.prototype.click = function () {
      if (this.download.startsWith('memediff-period-comparison-')) window.periodDownloads.push(this.download);
      else original.call(this);
    };
    HTMLCanvasElement.prototype.toBlob = callback => { window.finishPeriodPNG = callback; };
  });
  await png.click();
  await expect(png).toBeDisabled();
  await date.fill('2024-03-02');
  await expect(json).toBeDisabled();
  await expect(png).toBeDisabled();
  await page.evaluate(() => window.finishPeriodPNG(new Blob(['delayed'])));
  expect(await page.evaluate(() => window.periodDownloads)).toEqual([]);
  await apply.click();
  await png.click();
  await page.evaluate(() => window.finishPeriodPNG(null));
  await expect(page.locator('#period-export-status')).toContainText('Could not create');
  await expect(png).toBeEnabled();
  expect(mock.requests).toHaveLength(requests);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);

  await png.click();
  diagnostics.allowApiAbort = true;
  let requested = false;
  let releaseRoute;
  const held = new Promise(resolve => { releaseRoute = resolve; });
  await page.route('https://api.github.com/repos/fixture/held', async route => {
    requested = true;
    await held;
    await route.abort().catch(() => {});
  });
  try {
    await page.locator('#repo').fill('fixture/held');
    await page.locator('#analyze').click();
    await expect.poll(() => requested).toBe(true);
    await expect(json).toBeDisabled();
    await page.locator('#cancel').click();
    await expect(page.locator('#analyze')).toBeEnabled();
    await page.evaluate(() => window.finishPeriodPNG(new Blob(['canceled'])));
    expect(await page.evaluate(() => window.periodDownloads)).toEqual([]);
    await expect(page.locator('#report')).toBeHidden();
  } finally {
    releaseRoute();
  }
  await analyze(page);
  await expect(json).toBeEnabled();
  await expect(png).toBeEnabled();
  await expect(date).toHaveValue('2024-03-01');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
});
