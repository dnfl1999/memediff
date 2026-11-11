import { openAdvanced } from './helpers.js';
import { test, expect, mockGitHub, analyze, downloadReport } from './helpers.js';

test('page loads, JavaScript executes, and keyboard navigation works', async ({ page }) => {
  const api = await mockGitHub(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/MemeDiff/);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await openAdvanced(page); await page.locator('#repo').focus();
  await page.keyboard.type('fixture/project');
  await page.keyboard.press('Tab');
  await expect(page.locator('#token')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#analyze')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#report-title')).toHaveText('fixture/project');
  expect(api.requests).toHaveLength(3);
});

test('analysis, 7/30-day switching, safe text and responsive layout', async ({ page }, testInfo) => {
  await mockGitHub(page);
  await page.goto('./');
  await analyze(page);
  await expect(page.locator('#metrics strong')).toHaveText(['3', '2', '2']);
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  await expect(page.locator('#metrics strong')).toHaveText(['2', '1', '1']);
  await expect(page.locator('[data-days="7"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '30 days', exact: true }).click();
  await expect(page.locator('#metrics strong')).toHaveText(['3', '2', '2']);
  await expect(page.locator('#description')).toContainText('<img');
  await expect(page.locator('#description img, #commits img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const id of ['save', 'json', 'png']) {
    const button = page.locator(`#${id}`); await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox(); const width = page.viewportSize().width;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: testInfo.outputPath('report.png'), fullPage: true });
  await testInfo.attach('responsive-report', { path: testInfo.outputPath('report.png'), contentType: 'image/png' });
});

test('baseline persists, requery finds new SHA, and deletion removes it', async ({ page }) => {
  const api = await mockGitHub(page); await page.goto('./'); await analyze(page);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.locator('#save').click();
  api.revision = 1;
  await analyze(page);
  await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');
  await page.reload(); await analyze(page);
  await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');
  await page.locator('#clear').click();
  await expect(page.locator('#comparison')).toContainText('No saved baseline yet');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('invalid repository and Solana addresses fail before any API request', async ({ page }) => {
  const api = await mockGitHub(page); await page.goto('./');
  await openAdvanced(page); await page.locator('#repo').fill('https://github.com.evil.test/a/b'); await page.locator('#analyze').click();
  await expect(page.locator('#status')).toHaveClass('error');
  await openAdvanced(page); await page.locator('#repo').fill('fixture/project'); await openAdvanced(page); await page.locator('#token').fill('0'.repeat(32)); await page.locator('#analyze').click();
  await expect(page.locator('#status')).toContainText('Base58');
  await openAdvanced(page); await page.locator('#token').fill('1'.repeat(33)); await page.locator('#analyze').click();
  await expect(page.locator('#status')).toContainText('32 bytes');
  expect(api.requests).toHaveLength(0);
});

test('JSON download validates data and PNG download decodes to a real image', async ({ page }, testInfo) => {
  await mockGitHub(page); await page.goto('./');
  await openAdvanced(page); await page.locator('#token').fill('11111111111111111111111111111111');
  await analyze(page); await page.locator('[data-days="7"]').click();
  const data = await downloadReport(page, 'json', testInfo);
  expect(data.schema).toBe(1); expect(data.repo).toBe('fixture/project'); expect(data.selectedDays).toBe(7);
  expect(data.metrics['7']).toMatchObject({ commits: 2, releases: 1, contributors: 1 });
  expect(data.token).toBe('11111111111111111111111111111111');
  expect(data.evidence).toHaveLength(3); expect(data.coverage).toMatchObject({ commits: true, releases: true });
  expect(JSON.stringify(data)).not.toContain('fixture-private@example.com');
  await downloadReport(page, 'png', testInfo);
});

for (const status of [403, 404, 429]) test(`GitHub ${status} displays actionable error`, async ({ page, diagnostics }) => {
  diagnostics.expectedStatuses = [status]; await mockGitHub(page, { error: status }); await page.goto('./');
  await openAdvanced(page); await page.locator('#repo').fill('fixture/project'); await page.locator('#analyze').click();
  await expect(page.locator('#status')).toContainText(String(status));
  await expect(page.locator('#status')).toHaveClass('error'); await expect(page.locator('#report')).toBeHidden();
  await expect(page.locator('#analyze')).toBeEnabled();
});

test('network failure displays recovery message', async ({ page, diagnostics }) => {
  diagnostics.allowApiAbort = true; await mockGitHub(page, { offline: true }); await page.goto('./');
  await openAdvanced(page); await page.locator('#repo').fill('fixture/project'); await page.locator('#analyze').click();
  await expect(page.locator('#status')).toContainText('network'); await expect(page.locator('#analyze')).toBeEnabled();
});

test('partial API failure is labeled incomplete, not zero activity', async ({ page, diagnostics }) => {
  diagnostics.expectedStatuses = [500]; await mockGitHub(page, { commitError: 500 }); await page.goto('./'); await analyze(page);
  await expect(page.locator('#warnings')).toContainText('Commit collection is incomplete');
  await expect(page.locator('#metrics strong')).toHaveText(['0+', '2', '0+']);
});

test('empty repository renders explicit empty states', async ({ page }) => {
  await mockGitHub(page, { empty: true }); await page.goto('./'); await analyze(page);
  await expect(page.locator('#metrics strong')).toHaveText(['0', '0', '0']);
  await expect(page.locator('#commits')).toContainText('No commits observed');
  await expect(page.locator('#releases')).toContainText('No public releases observed');
});

test('cancel stops a pending query and restores controls', async ({ page, diagnostics }) => {
  diagnostics.allowApiAbort = true;
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route('https://api.github.com/**', async route => { await gate; await route.abort().catch(() => {}); });
  await page.goto('./'); await openAdvanced(page); await page.locator('#repo').fill('fixture/project'); await page.locator('#analyze').click();
  await page.locator('#cancel').click();
  await expect(page.locator('#status')).toContainText('canceled'); release();
  await expect(page.locator('#analyze')).toBeEnabled(); await expect(page.locator('#repo')).toBeEnabled();
});
