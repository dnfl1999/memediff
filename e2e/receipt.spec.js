import { openAdvanced } from './helpers.js';
import { test, expect, mockGitHub, analyze, downloadReport } from './helpers.js';

async function recordCanvasText(page) {
  await page.evaluate(() => {
    window.receiptText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.receiptText.push(String(text));
      return original.call(this, text, ...args);
    };
  });
}

test('receipt PNG reflects selected UTC period and original evidence for sharing', async ({ page }, testInfo) => {
  await mockGitHub(page); await page.goto('./');
  await page.getByText('Quick start — share a Development Receipt', { exact: true }).click();
  await expect(page.getByText('Image links are printed text, not clickable.', { exact: false })).toBeVisible();
  await analyze(page); await recordCanvasText(page);
  for (const days of [7, 30]) {
    await page.locator(`[data-days="${days}"]`).click();
    const report = await downloadReport(page, 'json', testInfo);
    await page.evaluate(() => { window.receiptText = []; });
    await downloadReport(page, 'png', testInfo);
    const lines = await page.evaluate(() => window.receiptText);
    expect(lines).toContain('Development Receipt');
    expect(lines).toContain(`Observed at: ${report.fetchedAt}`);
    const start = new Date(Date.parse(report.fetchedAt) - days * 86400000).toISOString().replace('T', ' ').replace('.000Z', 'Z');
    expect(lines.some(s => s.includes(start) && s.includes(`${days} rolling days`))).toBe(true);
    expect(lines).toContain('https://github.com/fixture/project');
    expect(lines.some(s => s.includes('/commit/') || s.includes('/releases/tag/'))).toBe(true);
    expect(lines).toContain(String(report.metrics[days].commits));
    expect(lines).toContain('Token association and mint existence are not verified by this report.');
  }
});

test('partial receipt does not present missing activity as a complete zero', async ({ page, diagnostics }, testInfo) => {
  diagnostics.expectedStatuses = [503];
  await mockGitHub(page, { commitError: 503 }); await page.goto('./'); await analyze(page);
  await recordCanvasText(page); await downloadReport(page, 'png', testInfo);
  const lines = await page.evaluate(() => window.receiptText);
  expect(lines).toContain('PARTIAL OBSERVATION — counts marked + are lower bounds');
  expect(lines).toContain('0+');
  expect(lines.some(s => s.includes('Commits: INCOMPLETE'))).toBe(true);
});
