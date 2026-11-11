import { test, expect, analyze, downloadReport } from './helpers.js';

test('LIVE public GitHub query and both downloads without mocks or credentials', async ({ page, diagnostics }, testInfo) => {
  const apiResponses = [];
  page.on('response', r => { if (r.url().startsWith('https://api.github.com/')) apiResponses.push(r); });
  await page.goto('./');
  await expect(page).toHaveTitle(/MemeDiff/);
  await page.locator('#repo').fill('dnfl1999/memediff');
  await page.locator('#analyze').click();
  await expect(page.locator('#analyze')).toBeEnabled({ timeout: 50000 });
  const responses = await Promise.all(apiResponses.map(async r => ({ url: r.url(), status: r.status(), remaining: r.headers()['x-ratelimit-remaining'], reset: r.headers()['x-ratelimit-reset'], retryAfter: r.headers()['retry-after'] })));
  await testInfo.attach('LIVE-api-evidence', { body: JSON.stringify({ mocked: false, authenticated: false, responses }, null, 2), contentType: 'application/json' });
  const limited = responses.find(r => [403, 429].includes(r.status));
  if (limited) {
    diagnostics.expectedStatuses = [403, 429];
    testInfo.annotations.push({ type: 'API_LIMIT', description: JSON.stringify(limited) });
    test.skip(true, 'Actual GitHub API limited: evidence attached; no automatic retry.');
  }
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#report-title')).toHaveText('dnfl1999/memediff');
  const data = await downloadReport(page, 'json', testInfo);
  expect(data.source).toBe('github-live'); expect(data.repo).toBe('dnfl1999/memediff');
  expect(data.coverage).toMatchObject({ commits: true, releases: true }); expect(data.warnings).toEqual([]);
  expect(responses.length).toBeGreaterThanOrEqual(3);
  expect(responses.every(r => r.status === 200)).toBe(true);
  expect(data.commits.every(c => /^[a-f0-9]{40}$/.test(c.sha))).toBe(true);
  await page.locator('[data-days="7"]').click(); await expect(page.locator('[data-days="7"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#save').click(); await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');
  await page.locator('#clear').click();
  await downloadReport(page, 'png', testInfo);
  await page.screenshot({ path: testInfo.outputPath('LIVE-report.png'), fullPage: true });
});
