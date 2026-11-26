import { test, expect, mockGitHub, trackIsolation } from './helpers.js';

test('first screen offers direct analysis and recorded samples open without requests', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  const hero = page.locator('.hero');
  await expect(hero.getByRole('heading')).toHaveText(/Is your crypto project being built\?/);
  await expect(hero.getByRole('textbox', { name: 'Public GitHub repository' })).toBeInViewport({ ratio: 1 });
  await expect(hero.getByRole('button', { name: 'Analyze GitHub', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(hero.getByRole('link', { name: 'Try Sample Report' })).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#advanced')).not.toHaveAttribute('open');
  await expect(page.locator('#saved-tools')).not.toHaveAttribute('open');
  await expect(page.getByRole('link', { name: 'Give feedback' })).toHaveAttribute('href', 'https://github.com/dnfl1999/memediff/issues/new?template=feedback.md');
  const check = await trackIsolation(page);
  await page.context().setOffline(true);
  await hero.getByRole('link', { name: 'Try Sample Report' }).press('Enter');
  await expect(page).toHaveURL(/#samples$/);
  const samples = page.getByRole('region', { name: 'Sample reports' });
  await expect(samples).toContainText('Recorded 30-day GitHub observations');
  await expect(samples.getByRole('article')).toHaveCount(3);
  await expect(samples.getByRole('article', { name: 'vitejs/vite' })).toContainText('14+ releases');
  await expect(samples.getByRole('article', { name: 'octocat/Hello-World' })).toContainText('0 commits');
  await expect(samples.getByRole('article', { name: 'dnfl1999/memediff' })).toContainText('6 commits in the first 15 days and 49 in the next 15');
  await expect(samples.getByRole('link', { name: 'Download JSON' })).toHaveCount(3);
  await expect(samples.getByRole('link', { name: 'View PNG' })).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#report')).toBeHidden();
  await info.attach('onboarding-proof', { contentType: 'application/json', body: JSON.stringify({
    project: info.project.name, viewport: page.viewportSize(), firstScreenDirect: true, offlineSamples: 3, ...await check()
  }) });
});

test('explicit Live GitHub Demo never queries Forks or market data', async ({ page }) => {
  const github = await mockGitHub(page);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('./');
  expect(github.requests).toEqual([]);
  const demo = page.getByRole('button', { name: 'Live GitHub Demo', exact: true });
  await demo.press('Enter');
  await expect(page.locator('#repo')).toHaveValue('dnfl1999/memediff');
  await expect(page.locator('#report-title')).toHaveText('fixture/project');
  await expect(page.locator('#report-title')).toBeFocused();
  await expect(page.locator('#token-result')).toBeHidden();
  expect(github.requests.some(url => new URL(url).pathname === '/repos/dnfl1999/memediff')).toBe(true);
  expect(requests.filter(url => url.includes('forks-index') || url.includes('dexscreener.com'))).toEqual([]);
});

test('GitHub demo keeps an honest rate-limit message and a recorded fallback', async ({ page, diagnostics }) => {
  diagnostics.expectedStatuses = [403];
  await mockGitHub(page, { error: 403 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Live GitHub Demo', exact: true }).click();
  await expect(page.locator('#status')).toContainText('GitHub API rate limit or access denied (403)');
  await expect(page.locator('#report')).toBeHidden();
  await page.getByRole('link', { name: 'open a recorded sample' }).click();
  await expect(page).toHaveURL(/#samples$/);
  await expect(page.getByRole('region', { name: 'Sample reports' })).toBeVisible();
});
