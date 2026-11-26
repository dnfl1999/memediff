import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { expectedBrowserError } from './http-evidence.js';
export { expect };
export const test = base.extend({
  diagnostics: [async ({ page }, use, testInfo) => {
    const d = { pageErrors: [], consoleErrors: [], failures: [], responses: [], expectedStatuses: [], expectedResponses: [], allowApiAbort: false, expectedURLs: [] };
    page.on('pageerror', e => d.pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') d.consoleErrors.push(m.text()); });
    page.on('requestfailed', r => d.failures.push({ url: r.url(), error: r.failure()?.errorText }));
    page.on('response', r => {
      const status = r.status();
      if (status >= 400 || status >= 200 && status <= 299) d.responses.push({ url: r.url(), status });
    });
    await use(d);
    await testInfo.attach('browser-diagnostics', { body: JSON.stringify(d, null, 2), contentType: 'application/json' });
    expect(d.pageErrors, 'uncaught JavaScript errors').toEqual([]);
    expect(d.responses.filter(r => r.status >= 400 && !expectedBrowserError(d, r)), 'unexpected HTTP errors').toEqual([]);
    expect(d.failures.filter(r => !d.allowApiAbort || !(r.url.startsWith('https://api.github.com/') || d.expectedURLs.some(u=>r.url.startsWith(u)))), 'unexpected network failures').toEqual([]);
    expect(d.consoleErrors.filter(m => !((d.expectedStatuses.length || d.allowApiAbort || d.expectedResponses.some(r => m.includes(String(r.status)))) && /Failed to load resource:/.test(m))), 'unexpected console/CSP errors').toEqual([]);
  }, { auto: true }]
});
export async function mockGitHub(page, options = {}) {
  const state = { revision: 0, requests: [], ...options };
  const now = state.now ?? Date.now(), day = 86400000;
  const c = (digit, age, author) => ({ sha: digit.repeat(40), commit: { committer: { date: new Date(now - age * day).toISOString() }, author: { email: 'fixture-private@example.com' }, message: digit === 'a' ? state.commitMessage ?? '<img src=x onerror="window.__xss=1">' : `Fixture commit ${digit}` }, author: { login: author } });
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

export async function trackIsolation(page) {
  const storage = await page.evaluate(() => {
    window.comparisonStorageWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.comparisonStorageWrites.push(method);
        return original.apply(this, args);
      };
    }
    return JSON.stringify(localStorage);
  });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  return async () => {
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => ({ storage: JSON.stringify(localStorage), writes: window.comparisonStorageWrites })))
      .toEqual({ storage, writes: [] });
    return { networkRequests: requests.length, storageWrites: 0, storageUnchanged: true };
  };
}
export async function readDownload(page, button, type, testInfo, attachment = `download-${type}`) {
  const pending = page.waitForEvent('download');
  await button.click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const name = file.suggestedFilename();
  const path = testInfo.outputPath(name);
  await file.saveAs(path);
  await testInfo.attach(attachment, { path, contentType: type === 'png' ? 'image/png' : 'application/json' });
  return { name, path, bytes: await readFile(path) };
}

export async function downloadReport(page, type, testInfo) {
  const { bytes, path } = await readDownload(page, page.locator(`#${type}`), type, testInfo);
  if (type === 'json') return JSON.parse(bytes.toString('utf8'));
  const png = PNG.sync.read(bytes, { checkCRC: true });
  expect(png.width).toBe(1400); expect([1020,1260]).toContain(png.height);
  expect(png.data.length).toBe(1400 * png.height * 4);
  const colors = new Set();
  for (let i = 0; i < png.data.length; i += 4) colors.add(png.data.readUInt32BE(i));
  expect(colors.size, 'PNG must contain rendered content, not a blank canvas').toBeGreaterThan(100);
  return { path, width: png.width, height: png.height, colors: colors.size };
}

export async function downloadPeriodExports(page, info) {
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = await readDownload(page, page.locator('#period-export-json'), 'json', info, 'period-export-json');
  const json = JSON.parse(file.bytes.toString('utf8'));
  expect(file.name).toMatch(/^memediff-period-comparison-.+\.json$/);
  expect([json.format, json.version]).toEqual(['memediff-period-comparison', 1]);
  await expect.poll(() => page.locator('header .brand-icon').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => {
    const text = CanvasRenderingContext2D.prototype.fillText, drawImage = CanvasRenderingContext2D.prototype.drawImage;
    window.periodCanvasProof = { text: [], images: 0 };
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, ...rest) {
      if (this.canvas.width === 1400 && this.canvas.height === 1080) window.periodCanvasProof.text.push({ value, x, y });
      return text.call(this, value, x, y, ...rest);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.width === 1400 && this.canvas.height === 1080) window.periodCanvasProof.images++;
      return drawImage.apply(this, args);
    };
  });
  const pngFile = await readDownload(page, page.locator('#period-export-png'), 'png', info, 'period-export-png');
  expect(pngFile.name).toBe(file.name.replace(/\.json$/, '.png'));
  const png = PNG.sync.read(pngFile.bytes, { checkCRC: true });
  expect([png.width, png.height]).toEqual([1400, 1080]);
  const trace = await page.evaluate(() => window.periodCanvasProof);
  expect(trace.images).toBe(1);
  const number = (value, complete) => value === null ? 'Unknown' : new Intl.NumberFormat('en-US').format(value) + (complete ? '' : '+');
  const at = (x, y) => trace.text.find(call => call.x === x && call.y === y)?.value;
  const renderedCounts = {};
  for (const [i, key] of ['a', 'b'].entries()) {
    const period = json.periods[key], x = [60, 710][i];
    expect(at(x + 20, 336)).toBe(period.effective.startUtc);
    expect(at(x + 20, 362)).toBe(`through ${period.effective.lastIncludedUtc}`);
    const values = [at(x + 20, 455), at(x + 218, 455), at(x + 416, 455)];
    expect(values).toEqual([number(period.counts.commits, period.coverage.commitsComplete),
      number(period.counts.releases, period.coverage.releasesComplete), number(period.counts.authors, period.coverage.commitsComplete)]);
    renderedCounts[key] = values;
    for (const [chart, kind] of ['commits', 'releases'].entries()) {
      const value = period.counts[kind], start = [103, 753][chart], y = 598 + i * 36;
      const color = [[168, 255, 50], [99, 216, 223]][i];
      const scale = Math.max(1, json.periods.a.counts[kind] ?? 0, json.periods.b.counts[kind] ?? 0);
      let colored = 0;
      for (let pixel = start; pixel < start + 438; pixel++) {
        const offset = (y * png.width + pixel) * 4;
        if (color.every((component, offsetInPixel) => component === png.data[offset + offsetInPixel])) colored++;
      }
      expect(Math.abs(colored - 438 * (value ?? 0) / scale)).toBeLessThanOrEqual(1);
    }
  }
  return { json, jsonFile: { name: file.name, bytes: file.bytes.length, sha256: sha256(file.bytes) },
    pngFile: { name: pngFile.name, bytes: pngFile.bytes.length, sha256: sha256(pngFile.bytes), width: png.width,
      height: png.height, renderedCounts, measuredBars: true, logoDrawn: trace.images === 1 } };
}
