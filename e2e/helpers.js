import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
export { expect };
export const test = base.extend({
  diagnostics: [async ({ page }, use, testInfo) => {
    const d = { pageErrors: [], consoleErrors: [], failures: [], responses: [], expectedStatuses: [], allowApiAbort: false, expectedURLs: [] };
    page.on('pageerror', e => d.pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') d.consoleErrors.push(m.text()); });
    page.on('requestfailed', r => d.failures.push({ url: r.url(), error: r.failure()?.errorText }));
    page.on('response', r => { if (r.status() >= 400) d.responses.push({ url: r.url(), status: r.status() }); });
    await use(d);
    await testInfo.attach('browser-diagnostics', { body: JSON.stringify(d, null, 2), contentType: 'application/json' });
    expect(d.pageErrors, 'uncaught JavaScript errors').toEqual([]);
    expect(d.responses.filter(r => !(r.url.startsWith('https://api.github.com/') || d.expectedURLs.some(u=>r.url.startsWith(u))) || !d.expectedStatuses.includes(r.status)), 'unexpected HTTP errors').toEqual([]);
    expect(d.failures.filter(r => !d.allowApiAbort || !(r.url.startsWith('https://api.github.com/') || d.expectedURLs.some(u=>r.url.startsWith(u)))), 'unexpected network failures').toEqual([]);
    expect(d.consoleErrors.filter(m => !((d.expectedStatuses.length || d.allowApiAbort) && /Failed to load resource:/.test(m))), 'unexpected console/CSP errors').toEqual([]);
  }, { auto: true }]
});
export async function mockGitHub(page, options = {}) {
  const state = { revision: 0, requests: [], ...options };
  const now = Date.now(), day = 86400000;
  const c = (digit, age, author) => ({ sha: digit.repeat(40), commit: { committer: { date: new Date(now - age * day).toISOString() }, author: { email: 'fixture-private@example.com' }, message: digit === 'a' ? '<img src=x onerror="window.__xss=1">' : `Fixture commit ${digit}` }, author: { login: author } });
  await page.route('https://api.github.com/**', async route => {
    const url = new URL(route.request().url()); state.requests.push(url.href);
    const headers = { 'access-control-allow-origin': '*', 'x-ratelimit-remaining': '50', 'access-control-expose-headers': 'x-ratelimit-remaining,link,retry-after' };
    if (state.offline) return route.abort('failed');
    if (state.error) return route.fulfill({ status: state.error, headers: { ...headers, 'retry-after': '60' }, json: { message: 'Synthetic API error for test only' } });
    if (url.pathname.endsWith('/commits')) {
      if (state.empty) return route.fulfill({ headers, json: [] });
      if (state.commitError) return route.fulfill({ status: state.commitError, headers, json: {} });
      return route.fulfill({ headers, json: [c('a', 2, 'fixture-dev'), c('b', 5, 'fixture-dev'), c('c', 20, 'fixture-maintainer'), ...(state.revision ? [c('d', 1, 'fixture-dev')] : [])] });
    }
    if (url.pathname.endsWith('/releases')) return route.fulfill({ headers, json: state.empty ? [] : [1, 20].map((age, i) => ({ id: i + 1, name: `Fixture v${i + 1}`, published_at: new Date(now - age * day).toISOString(), html_url: `https://github.com/fixture/project/releases/tag/v${i + 1}`, prerelease: i === 0 })) });
    return route.fulfill({ headers, json: { full_name: 'fixture/project', default_branch: 'main', description: '<img src=x onerror="window.__xss=1">', private: false, fork: false } });
  });
  return state;
}
export async function openAdvanced(page) { if (!await page.locator('#repo').isVisible()) await page.locator('#advanced > summary').click(); }
export async function analyze(page, repo = 'fixture/project') {
  await openAdvanced(page);
  await page.locator('#repo').fill(repo);
  await page.locator('#analyze').click();
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#analyze')).toBeEnabled();
}
export async function downloadReport(page, type, testInfo) {
  const pending = page.waitForEvent('download');
  await page.locator(`#${type}`).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const path = testInfo.outputPath(file.suggestedFilename());
  await file.saveAs(path);
  await testInfo.attach(`download-${type}`, { path, contentType: type === 'png' ? 'image/png' : 'application/json' });
  const bytes = await readFile(path);
  if (type === 'json') return JSON.parse(bytes.toString('utf8'));
  const png = PNG.sync.read(bytes, { checkCRC: true });
  expect([png.width, png.height]).toEqual([1400, 1020]);
  expect(png.data.length).toBe(1400 * 1020 * 4);
  const colors = new Set();
  for (let i = 0; i < png.data.length; i += 4) colors.add(png.data.readUInt32BE(i));
  expect(colors.size, 'PNG must contain rendered content, not a blank canvas').toBeGreaterThan(100);
  return { path, width: png.width, height: png.height, colors: colors.size };
}
