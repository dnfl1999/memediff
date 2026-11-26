import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { comparePeriods } from '../src/period-comparison.js';
import { periodExportData } from '../src/period-export.js';
import { test, expect, analyze, mockGitHub, readDownload, trackIsolation, openSavedReports } from './helpers.js';

const files = ['v21-period-comparison.json', 'v22-public-period-comparison.json'].map(name => {
  const buffer = readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url));
  return { name, mimeType: 'application/json', buffer };
});
const input = (page, number) => page.locator(`#saved-file-${number}-input`);
const slot = (page, number) => page.getByRole('group', { name: `Saved File ${number}` });
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const jsonButton = page => page.locator('#saved-files-export-json');
const pngButton = page => page.locator('#saved-files-export-png');

async function savedDownloads(page, info, shared, observations) {
  const jsonFile = await readDownload(page, jsonButton(page), 'json', info, 'saved-files-export-json');
  const json = JSON.parse(jsonFile.bytes);
  expect(jsonFile.name).toMatch(/^memediff-saved-files-comparison-dnfl1999-memediff-\d{4}-\d{2}-\d{2}\.json$/);
  expect([json.format, json.version, json.source]).toEqual(['memediff-saved-files-comparison', 1, 'Local file · Unverified']);
  expect(json.files.map(file => file.sha256)).toEqual(files.map(file => sha256(file.buffer)));
  expect(json.files.map(file => file.observedAtUtc)).toEqual(observations);
  expect(json.sharedUtc.intervals).toEqual([{ startUtc: shared[0], endExclusiveUtc: shared[1], lastIncludedUtc: observations[0] }]);
  expect(json.commits.sharedCounts).toEqual({ both: 45, first: 0, second: 0 });
  expect(json.commits.otherRecordedCounts).toEqual({ outside: 3, differentScope: 0, unknown: 0 });
  expect(json.releases.sharedCounts).toEqual({ both: 0, first: 0, second: 0 });
  expect(json.releases.records).toEqual([]);
  expect(json.commits.records).toHaveLength(48);
  for (const [index, file] of files.entries()) {
    const original = JSON.parse(file.buffer);
    expect(json.files[index].collection).toEqual(original.collection);
    expect(json.files[index].userSuppliedTokenCA).toEqual(original.userSuppliedTokenCA);
    const inputRows = Object.values(original.periods).flatMap(period => period.commits);
    const originalBySha = new Map(inputRows.map(row => [row.sha, row]));
    const exportedRows = json.commits.records.map(row => row.sources[index].record).filter(Boolean);
    expect(exportedRows).toHaveLength(originalBySha.size);
    for (const record of exportedRows) expect(record).toMatchObject(originalBySha.get(record.sha));
    expect(jsonFile.bytes.toString('utf8')).not.toContain(file.name);
  }

  await page.evaluate(() => {
    const text = CanvasRenderingContext2D.prototype.fillText, image = CanvasRenderingContext2D.prototype.drawImage;
    window.savedFilesCanvas = { texts: [], images: 0 };
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y) {
      window.savedFilesCanvas.texts.push({ value, x, y, width: this.measureText(value).width });
      return text.call(this, value, x, y);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      window.savedFilesCanvas.images++;
      return image.apply(this, args);
    };
  });
  const pngFile = await readDownload(page, pngButton(page), 'png', info, 'saved-files-export-png');
  expect(pngFile.name).toMatch(/^memediff-saved-files-comparison-dnfl1999-memediff-\d{4}-\d{2}-\d{2}\.png$/);
  const png = PNG.sync.read(pngFile.bytes, { checkCRC: true });
  expect(png.width).toBe(1400);
  expect(png.height).toBeGreaterThan(700);
  expect(png.data.length).toBe(png.width * png.height * 4);
  expect(png.data.subarray(0, 4)).toEqual(Buffer.from([8, 10, 11, 255]));
  const colors = new Set();
  for (let offset = 0; offset < png.data.length; offset += 4) colors.add(png.data.readUInt32BE(offset));
  expect(colors.size).toBeGreaterThan(100);
  const canvas = await page.evaluate(() => window.savedFilesCanvas);
  expect(canvas.images).toBe(1);
  expect(canvas.texts.every(text => text.x + text.width <= png.width - 60 && text.y < png.height)).toBe(true);
  const text = canvas.texts.map(line => line.value);
  expect(text).toEqual(expect.arrayContaining(['Saved Files Comparison', 'Local files · Unverified', ...observations,
    `1.  ${shared.join(' → ')} (end exclusive)`, 'GitHub source  https://github.com/dnfl1999/memediff',
    'MemeDiff  https://dnfl1999.github.io/memediff/']));
  expect(text.filter(value => /^\d+$/.test(value))).toEqual(['45', '0', '0', '0', '0', '0']);
  return {
    json: { filename: jsonFile.name, bytes: jsonFile.bytes.length, sha256: sha256(jsonFile.bytes), shaRows: json.commits.records.length },
    png: { filename: pngFile.name, bytes: pngFile.bytes.length, sha256: sha256(pngFile.bytes), width: png.width,
      height: png.height, decoded: true, colors: colors.size, logoDrawn: true, renderedCounts: [45, 0, 0, 0, 0, 0] }
  };
}

test('compares and downloads two historical public exports offline with filters and original sources', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  await openSavedReports(page);
  await expect.poll(() => page.locator('header .brand-icon').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
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
  await expect(jsonButton(page)).toBeDisabled();
  await expect(pngButton(page)).toBeDisabled();
  const choose = slot(page, 1).getByRole('button', { name: 'Choose File 1' });
  const chooser = page.waitForEvent('filechooser');
  await choose.focus();
  await choose.press('Enter');
  await (await chooser).setFiles(files[0]);
  await expect(slot(page, 1).getByRole('status')).toHaveText('File 1 opened.');
  await expect(compare).toBeDisabled();
  await input(page, 2).setInputFiles(files[1]);
  await expect(slot(page, 2).getByRole('status')).toHaveText('File 2 opened.');
  await expect(jsonButton(page)).toBeDisabled();
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
  const downloads = await savedDownloads(page, info, shared, observations);
  await expect(shas.getByRole('status')).toContainText('Page 2 of 3');
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
  await expect(jsonButton(page)).toBeDisabled();
  await expect(pngButton(page)).toBeDisabled();
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
    shared: { startUtc: shared[0], endExclusiveUtc: shared[1] }, commonShas: 45, file1Only: 0, file2Only: 0, file2Outside: 3, releases: 0,
    downloads
  }) });
});

test('keeps the single-file preview, report and baseline through replacement and late reads', async ({ page }) => {
  await mockGitHub(page);
  await page.goto('./');
  await openSavedReports(page);
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
  await expect(jsonButton(page)).toBeEnabled();
  await input(page, 1).setInputFiles({ ...files[0], name: 'invalid.json', buffer: Buffer.from('{broken') });
  await expect(slot(page, 1).getByRole('status')).toHaveClass(/error/);
  await expect(slot(page, 1)).not.toContainText('2026-11-20T08:25:25.774Z');
  await expect(slot(page, 2)).toContainText('2026-11-20T08:25:25.774Z');
  await expect(result).toBeEmpty();
  await expect(compare).toBeDisabled();
  await expect(jsonButton(page)).toBeDisabled();

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
  await expect(pngButton(page)).toBeDisabled();

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

test('blocks cross-branch exports and allows N/A downloads for disjoint UTC selections', async ({ page }, info) => {
  await page.goto('./');
  await openSavedReports(page);
  await page.getByRole('button', { name: 'Compare Two Saved Files' }).click();
  const checkIsolation = await trackIsolation(page);
  const original = JSON.parse(files[0].buffer);
  const dates = { a: { start: '2026-10-25', end: '2026-10-25' }, b: { start: '2026-10-27', end: '2026-10-27' } };
  function generated(branch) {
    const report = { repo: original.repository.name, branch, source: original.source, since: original.collection.startUtc,
      fetchedAt: original.observedAtUtc, commits: [], releases: [], coverage: { commits: true, releases: true } };
    const buffer = Buffer.from(JSON.stringify(periodExportData(report, dates, comparePeriods(report, dates))));
    return { ...files[0], name: 'generated-disjoint.json', buffer };
  }
  await input(page, 1).setInputFiles(files[0]);
  await input(page, 2).setInputFiles(generated('other-branch'));
  await page.locator('#compare-saved-submit').click();
  await expect(page.locator('#compare-saved-result')).toContainText('different GitHub branches');
  await expect(jsonButton(page)).toBeDisabled();
  await expect(pngButton(page)).toBeDisabled();
  await input(page, 2).setInputFiles(generated('main'));
  await expect(jsonButton(page)).toBeDisabled();
  await page.locator('#compare-saved-submit').click();
  await expect(page.locator('#compare-saved-result')).toContainText('N/A · No shared UTC interval');
  const file = await readDownload(page, jsonButton(page), 'json', info, 'saved-files-export-disjoint-json');
  const json = JSON.parse(file.bytes);
  expect(json.sharedUtc).toEqual({ status: 'not-applicable', intervals: [], gaps: [] });
  expect(json.commits.sharedCounts).toEqual({ both: null, first: null, second: null });
  expect(json.commits.records).toHaveLength(45);
  const image = await readDownload(page, pngButton(page), 'png', info, 'saved-files-export-disjoint-png');
  expect(PNG.sync.read(image.bytes, { checkCRC: true }).width).toBe(1400);
  await checkIsolation();
});

test('cancels superseded PNG encoding and reports invalid blobs without downloading', async ({ page }) => {
  await page.goto('./');
  await openSavedReports(page);
  await page.getByRole('button', { name: 'Compare Two Saved Files' }).click();
  await page.evaluate(() => {
    window.savedPngEncodes = [];
    window.savedPngClicks = [];
    HTMLCanvasElement.prototype.toBlob = function (finish) { window.savedPngEncodes.push(finish); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) window.savedPngClicks.push(this.download);
      else click.call(this);
    };
  });
  for (const index of [1, 2]) await input(page, index).setInputFiles(files[index - 1]);
  const compare = page.locator('#compare-saved-submit'), status = page.locator('#saved-files-export-status');
  await compare.click();
  await pngButton(page).click();
  await expect(pngButton(page)).toBeDisabled();
  await input(page, 2).setInputFiles(files[0]);
  await expect(pngButton(page)).toBeDisabled();
  await compare.click();
  await pngButton(page).click();
  await page.evaluate(() => window.savedPngEncodes.shift()(new Blob(['old png'])));
  await expect(pngButton(page)).toBeDisabled();
  await expect(status).toHaveText('Creating saved files comparison PNG…');
  await page.evaluate(() => window.savedPngEncodes.shift()(new Blob(['x'.repeat(8 * 1024 * 1024 + 1)])));
  await expect(status).toContainText('exceeds the 8 MiB export limit');
  await expect(pngButton(page)).toBeEnabled();
  await pngButton(page).click();
  await page.evaluate(() => window.savedPngEncodes.shift()(null));
  await expect(status).toContainText('Could not create the PNG');
  await pngButton(page).click();
  await page.getByRole('button', { name: 'Close file comparison' }).click();
  await page.evaluate(() => window.savedPngEncodes.shift()(new Blob(['closed png'])));
  await expect(pngButton(page)).toBeDisabled();
  await expect(status).toBeEmpty();
  expect(await page.evaluate(() => window.savedPngClicks)).toEqual([]);
});
