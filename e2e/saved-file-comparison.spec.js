import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect, analyze, mockGitHub } from './helpers.js';

const files = ['v21-period-comparison.json', 'v22-public-period-comparison.json'].map(name => {
  const buffer = readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url));
  return { name, mimeType: 'application/json', buffer };
});
const input = (page, number) => page.locator(`#saved-file-${number}-input`);
const slot = (page, number) => page.getByRole('group', { name: `Saved File ${number}` });
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

async function trackIsolation(page) {
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

test('compares two historical public exports offline with keyboard filters and original sources', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('saved-pair-sentinel', 'unchanged'));
  const checkIsolation = await trackIsolation(page);
  await page.context().setOffline(true);

  const open = page.getByRole('button', { name: 'Compare Two Saved Files' });
  await open.focus();
  await open.press('Enter');
  const panel = page.getByRole('region', { name: 'Compare Two Saved Files' });
  await expect(panel.getByRole('heading', { name: 'Compare Two Saved Files' })).toBeFocused();
  const compare = panel.getByRole('button', { name: 'Compare saved files', exact: true });
  await expect(compare).toBeDisabled();
  const choose = slot(page, 1).getByRole('button', { name: 'Choose File 1' });
  const chooser = page.waitForEvent('filechooser');
  await choose.focus();
  await choose.press('Enter');
  await (await chooser).setFiles(files[0]);
  await expect(slot(page, 1).getByRole('status')).toHaveText('File 1 opened.');
  await expect(compare).toBeDisabled();
  await input(page, 2).setInputFiles(files[1]);
  await expect(slot(page, 2).getByRole('status')).toHaveText('File 2 opened.');
  const observations = ['2026-11-20T08:25:25.774Z', '2026-11-20T09:12:15.748Z'];
  for (const [index, when] of observations.entries()) {
    const card = slot(page, index + 1);
    for (const value of [when, 'Local file · Unverified', 'Recorded collection (UTC)', 'User-supplied token CA', 'Period A', 'Period B', 'Commit collection complete', 'Release collection complete']) {
      await expect(card).toContainText(value);
    }
    await expect(card.getByRole('link', { name: 'dnfl1999/memediff' })).toHaveAttribute('href', 'https://github.com/dnfl1999/memediff');
    await card.getByText('Original GitHub links', { exact: true }).click();
    await expect(card.locator('.source-list a')).toHaveCount(4);
    await card.getByText('Original GitHub links', { exact: true }).click();
  }
  await slot(page, 1).getByText('Original period totals and records', { exact: true }).click();
  await expect(slot(page, 1).getByRole('link', { name: 'Period B commits evidence: 14' })).toBeVisible();
  await slot(page, 1).getByText('Original period totals and records', { exact: true }).click();
  await compare.focus();
  await compare.press('Enter');
  const result = page.locator('#compare-saved-result');
  await expect(result.getByRole('heading', { name: 'Recorded observation comparison' })).toBeFocused();
  await expect(page.locator('#compare-saved-status')).toHaveText('Saved file comparison ready.');
  await expect(result).toContainText('File 2 has the later recorded observation time.');
  const shared = ['2026-11-07T00:00:00.000Z', '2026-11-20T08:25:25.775Z'];
  await expect(result.locator('.saved-file-windows li')).toHaveText(`${shared.join(' → ')} (end exclusive)`);
  const shas = result.getByRole('region', { name: 'Common and file-specific SHA observations' });
  await expect(shas).toContainText('Both 45 · File 1 only 0 · File 2 only 0');
  await expect(result.getByRole('region', { name: 'Release observations' })).toContainText('Both 0 · File 1 only 0 · File 2 only 0');
  const both = shas.getByRole('button', { name: 'Observed in both (45)' });
  await both.focus();
  await both.press('Enter');
  await expect(both).toHaveAttribute('aria-pressed', 'true');
  const rows = shas.getByRole('list', { name: 'SHA observations' }).getByRole('listitem');
  await expect(rows).toHaveCount(20);
  const evidence = rows.first().getByRole('link', { name: /^[a-f0-9]{40}$/ });
  await expect(evidence).toHaveCount(2);
  const sha = await evidence.first().textContent();
  for (const index of [0, 1]) await expect(evidence.nth(index)).toHaveAttribute('href', `https://github.com/dnfl1999/memediff/commit/${sha}`);
  const next = shas.getByRole('button', { name: 'Next page' });
  await next.press('Enter');
  await expect(shas.getByRole('status')).toContainText('Page 2 of 3');
  await expect(rows).toHaveCount(20);
  await next.press('Enter');
  await expect(rows).toHaveCount(5);
  await expect(shas.getByRole('status')).toContainText('Page 3 of 3');
  await expect(shas.getByRole('button', { name: 'Previous page' })).toBeFocused();
  await shas.getByRole('button', { name: 'Outside shared intervals (3)' }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('The selected periods exclude');
  await expect(rows.first()).toContainText('File 2 · Recorded outside the shared intervals');
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await info.attach('actual-pair-preview', { contentType: 'image/png', body: await panel.screenshot() });

  await panel.getByRole('button', { name: 'Close file comparison' }).click();
  await expect(open).toBeFocused();
  await expect(panel).toBeHidden();
  await expect(result).toBeEmpty();
  for (const index of [1, 2]) {
    await expect(input(page, index)).toHaveValue('');
    await expect(page.locator(`#saved-file-${index}-content`)).toBeEmpty();
  }
  await open.press('Enter');
  await expect(compare).toBeDisabled();
  await expect(page.locator('#report')).toBeHidden();
  const isolation = await checkIsolation();
  await info.attach('actual-pair-proof', { contentType: 'application/json', body: JSON.stringify({
    project: info.project.name, viewport: page.viewportSize(), offline: true, closedAndCleared: true, ...isolation,
    files: files.map(({ name, buffer }, index) => ({ name, bytes: buffer.length, sha256: sha256(buffer), observedAtUtc: observations[index] })),
    shared: { startUtc: shared[0], endExclusiveUtc: shared[1] }, commonShas: 45, file1Only: 0, file2Only: 0, file2Outside: 3, releases: 0
  }) });
});

test('keeps the single-file preview, report and baseline through replacement and late reads', async ({ page }) => {
  await mockGitHub(page);
  await page.goto('./');
  await analyze(page);
  await page.locator('#save').click();
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  const live = await page.locator('#report-title').textContent();
  const checkIsolation = await trackIsolation(page);
  await page.locator('#saved-comparison-file').setInputFiles(files[0]);
  const single = page.getByRole('region', { name: 'Saved Period Comparison', exact: true });
  await expect(single.getByRole('status')).toHaveText('Saved comparison opened.');
  const open = page.getByRole('button', { name: 'Compare Two Saved Files' });
  await open.click();
  for (const index of [1, 2]) await input(page, index).setInputFiles(files[0]);
  const compare = page.locator('#compare-saved-submit'), result = page.locator('#compare-saved-result');
  await compare.click();
  await expect(result).toContainText('Both selections are the same file (identical SHA-256).');
  await input(page, 1).setInputFiles({ ...files[0], name: 'invalid.json', buffer: Buffer.from('{broken') });
  await expect(slot(page, 1).getByRole('status')).toHaveClass(/error/);
  await expect(slot(page, 1)).not.toContainText('2026-11-20T08:25:25.774Z');
  await expect(slot(page, 2)).toContainText('2026-11-20T08:25:25.774Z');
  await expect(result).toBeEmpty();
  await expect(compare).toBeDisabled();

  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      if (!this.name.startsWith('delayed-')) return read.call(this);
      return new Promise(resolve => { window.finishPairRead = async () => { resolve(await read.call(this)); }; });
    };
  });
  await input(page, 1).setInputFiles({ ...files[0], name: 'delayed-replaced.json' });
  await expect(slot(page, 1).getByRole('status')).toContainText('Checking File 1');
  await input(page, 1).setInputFiles(files[1]);
  await expect(slot(page, 1)).toContainText('2026-11-20T09:12:15.748Z');
  await page.evaluate(() => window.finishPairRead());
  await compare.click();
  await expect(result).toContainText('File 1 has the later recorded observation time.');
  await slot(page, 1).getByRole('button', { name: 'Clear File 1' }).click();
  await expect(slot(page, 1).getByRole('button', { name: 'Choose File 1' })).toBeFocused();
  await expect(result).toBeEmpty();
  await expect(compare).toBeDisabled();

  await input(page, 2).setInputFiles({ ...files[0], name: 'delayed-closed.json' });
  await expect(slot(page, 2).getByRole('status')).toContainText('Checking File 2');
  await page.getByRole('button', { name: 'Close file comparison' }).click();
  await page.evaluate(() => window.finishPairRead());
  await open.click();
  await expect(compare).toBeDisabled();
  await expect(slot(page, 2).getByRole('status')).toBeEmpty();
  await expect(page.locator('#saved-file-2-content')).toBeEmpty();
  await expect(single.getByRole('status')).toHaveText('Saved comparison opened.');
  await expect(page.locator('#report-title')).toHaveText(live);
  await expect(page.getByRole('button', { name: '7 days', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await checkIsolation();
});
