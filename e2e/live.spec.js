import { test, expect, analyze, downloadReport } from './helpers.js';

test('LIVE public GitHub query and both downloads without mocks or credentials', async ({ page, diagnostics }, testInfo) => {
  const apiResponses = [];
  page.on('response', r => { if (r.url().startsWith('https://api.github.com/')) apiResponses.push(r); });
  await page.goto('./');
  await expect(page).toHaveTitle(/MemeDiff/);
  await page.getByRole('button', { name: 'Try Live Demo', exact: true }).click();
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

test('LIVE repository name search and dated official CA index', async ({page,diagnostics},testInfo)=>{
  const responses=[];
  page.on('response',r=>{if(r.url().startsWith('https://api.github.com/search/'))responses.push(r);});
  await page.goto('./');await page.locator('.discovery summary').click();
  await page.locator('#search-mint').fill('DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork');await page.locator('#mint-submit').click();
  await expect(page.getByRole('button',{name:'Use dnfl1999/memediff',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Use dnfl1999/memediff',exact:true}).click();await expect(page.locator('#repo')).toHaveValue('dnfl1999/memediff');
  await page.locator('#search-name').fill('memediff');await page.locator('#search-submit').click();await expect(page.locator('#search-submit')).toBeEnabled({timeout:20000});
  const evidence=responses.map(r=>({url:r.url(),status:r.status(),remaining:r.headers()['x-ratelimit-remaining']}));
  await testInfo.attach('LIVE-search-evidence',{body:JSON.stringify({mocked:false,responses:evidence}),contentType:'application/json'});
  if(evidence.some(r=>[403,429].includes(r.status))){diagnostics.expectedStatuses=[403,429];test.skip(true,'Live GitHub search limited; no retry. CA index selection passed before search.');}
  expect(evidence).toHaveLength(1);expect(evidence[0].status).toBe(200);
  await expect(page.locator('#discovery-results button').first()).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('LIVE-discovery.png'),fullPage:true});
});
