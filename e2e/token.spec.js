import { test, expect } from './helpers.js';
const ca = 'DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';

test('official token identity, links, clipboard and mobile layout', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  const section = page.locator('#official-token');
  await expect(page.locator('#official-token-title')).toHaveText('MemeDiff $MEMEDIFF');
  await expect(page.locator('#official-ca')).toHaveValue(ca);
  for (const [label, url] of [['Forks Wiki', `https://forks.wiki/coin/${ca}`], ['pump.fun', `https://pump.fun/coin/${ca}`], ['Solscan', `https://solscan.io/token/${ca}`]]) {
    await expect(section.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', url);
  }
  await page.locator('#copy-ca').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#copy-ca-status')).toHaveText('Contract address copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ca);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('official-token.png'), fullPage: true });
});

test('clipboard denial preserves a selectable full address', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('Denied'); } }));
  await page.locator('#copy-ca').click();
  await expect(page.locator('#copy-ca-status')).toContainText('copy it manually');
  const selection = await page.locator('#official-ca').evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd));
  expect(selection).toBe(ca);
});
