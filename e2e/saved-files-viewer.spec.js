import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generatedSavedFilesReport, literalReleaseName } from '../test/fixtures/generated-saved-files-viewer.js';
import { test, expect, analyze, mockGitHub, trackIsolation, openSavedReports } from './helpers.js';

function fixture(name) {
  return { name, mimeType: 'application/json', buffer: readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url)) };
}

const historical = fixture('v24-public-saved-files-comparison.json');
const viewer = page => page.getByRole('region', { name: 'Saved Files Comparison Viewer' });
const open = page => page.getByRole('button', { name: 'Open Saved Files Comparison', exact: true });
const input = page => page.locator('#saved-files-viewer-file');
const status = page => page.locator('#saved-files-viewer-status');
const evidence = panel => panel.getByRole('region', { name: 'Common and file-specific SHA observations' });
const generated = (options, name = 'generated-summary.json') => ({ name, mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(generatedSavedFilesReport(options))) });

test('opens the original v2.4 summary offline with keyboard filters and exact source evidence', async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 360, height: 800 });
  const digest = createHash('sha256').update(historical.buffer).digest('hex');
  expect(historical.buffer.length).toBe(53584);
  expect(digest).toBe('b48b5ff76d5306ad93c53cb665d42968554e285e0b1db245e07320ae4872bd2a');
  await page.goto('./');
  await openSavedReports(page);
  await page.evaluate(() => localStorage.setItem('viewer-sentinel', 'unchanged'));
  const isolation = await trackIsolation(page);
  await page.context().setOffline(true);
  await open(page).press('Enter');
  const panel = viewer(page);
  await expect(open(page)).toHaveAttribute('aria-controls', 'saved-files-viewer');
  await expect(panel.getByRole('heading', { name: 'Saved Files Comparison Viewer' })).toBeFocused();
  const chooser = page.waitForEvent('filechooser');
  await panel.getByRole('button', { name: 'Choose comparison JSON' }).press('Enter');
  await (await chooser).setFiles(historical);
  await expect(status(page)).toHaveText('Saved files comparison opened.');
  await expect(panel.getByRole('heading', { name: 'Recorded observation comparison' })).toBeFocused();
  await expect(panel).toContainText('The original files are required to verify their recorded SHA-256 values.');
  const original = JSON.parse(historical.buffer);
  await expect(panel.locator('#saved-files-viewer-content > dl dd')).toHaveText(['dnfl1999/memediff', 'main', original.createdAtUtc]);
  for (const [index, source] of original.files.entries()) {
    const group = panel.getByRole('group', { name: `Recorded File ${index + 1}` });
    for (const value of [source.observedAtUtc, source.collection.startUtc, source.sha256, 'Period A', 'Period B',
      'User-supplied token CA', 'Commit collection complete', 'Release collection complete']) await expect(group).toContainText(value);
    await group.getByText('Original GitHub links', { exact: true }).click();
    await expect(group.locator('.source-list a')).toHaveCount(source.collection.apiEvidence.length + 1);
    await group.getByText('Original GitHub links', { exact: true }).click();
  }
  const shared = ['2026-11-07T00:00:00.000Z', '2026-11-20T08:25:25.775Z'];
  await expect(panel.locator('.saved-file-windows li')).toHaveText(`${shared.join(' → ')} (end exclusive)`);
  const shas = evidence(panel);
  await expect(shas).toContainText('Both 45 · File 1 only 0 · File 2 only 0');
  await expect(shas.getByRole('button', { name: 'All observations (48)' })).toHaveAttribute('aria-pressed', 'true');
  const both = shas.getByRole('button', { name: 'Observed in both (45)' });
  await both.press('Enter');
  await expect(both).toHaveAttribute('aria-pressed', 'true');
  await expect(both).toHaveAttribute('aria-controls', 'saved-files-viewer-shas');
  const rows = shas.getByRole('listitem');
  await expect(rows).toHaveCount(20);
  const originalLinks = rows.first().getByRole('link', { name: /^[a-f0-9]{40}$/ });
  await expect(originalLinks).toHaveCount(2);
  const sha = await originalLinks.first().textContent();
  await expect(originalLinks.first()).toHaveAttribute('href', `https://github.com/dnfl1999/memediff/commit/${sha}`);
  const next = shas.getByRole('button', { name: 'Next page' });
  await next.press('Enter');
  await expect(shas.getByRole('status')).toContainText('Page 2 of 3');
  await next.press('Enter');
  await expect(rows).toHaveCount(5);
  await shas.getByRole('button', { name: 'Outside shared intervals (3)' }).press('Enter');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('File 2 · Recorded outside the shared intervals');
  await expect(panel.getByRole('region', { name: 'Release observations' })).toContainText('Both 0 · File 1 only 0 · File 2 only 0');
  expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await info.attach('viewer-historical-preview', { contentType: 'image/png', body: await panel.screenshot() });
  await panel.getByRole('button', { name: 'Close viewer' }).press('Enter');
  await expect(open(page)).toBeFocused();
  await expect(panel).toBeHidden();
  await expect(page.locator('#saved-files-viewer-content')).toBeEmpty();
  await expect(input(page)).toHaveValue('');
  await expect(page.locator('#report')).toBeHidden();
  await info.attach('viewer-historical-proof', { contentType: 'application/json', body: JSON.stringify({
    fixture: { file: historical.name, sha256: digest, bytes: historical.buffer.length }, project: info.project.name,
    viewport: page.viewportSize(), offline: true, closedAndCleared: true, ...await isolation(),
    recreatedEvidence: { shared, both: 45, first: 0, second: 0, outsideFile2: 3, totalShas: 48, releases: 0 }
  }) });
});

test('renders generated release conflicts as text and rejects tampered replacement totals', async ({ page }) => {
  await page.goto('./');
  await openSavedReports(page);
  await open(page).click();
  const isolation = await trackIsolation(page);
  await input(page).setInputFiles(generated({ partial: true }));
  const panel = viewer(page);
  await expect(status(page)).toHaveText('Saved files comparison opened.');
  await expect(panel.locator('.saved-file-windows li')).toHaveCount(2);
  await expect(panel.locator('.saved-file-gaps li')).toHaveText('Observation gap · 2024-02-14T00:00:00.000Z → 2024-02-19T00:00:00.000Z (end exclusive)');
  await expect(evidence(panel)).toContainText('File 1 only Unknown');
  await evidence(panel).getByRole('button', { name: 'Incomplete counterpart (1)' }).click();
  await expect(evidence(panel).getByRole('listitem')).toContainText('Unknown · Collection incomplete');
  const releases = panel.getByRole('region', { name: 'Release observations' });
  await expect(releases.getByRole('listitem')).toContainText('Recorded values differ · date, name, release type, source link');
  await expect(releases.getByText(literalReleaseName, { exact: true })).toBeVisible();
  await expect(releases.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.viewerMarkupExecuted)).toBeUndefined();
  const tagLinks = releases.getByRole('link', { name: 'Release ID 7' });
  await expect(tagLinks.first()).toHaveAttribute('href', 'https://github.com/fixture/project/releases/tag/v7');
  await expect(tagLinks.last()).toHaveAttribute('href', 'https://github.com/fixture/project/releases/tag/v7-preview');
  const tampered = generatedSavedFilesReport();
  tampered.commits.sharedCounts.both++;
  await input(page).setInputFiles({ ...historical, name: 'tampered-generated.json', buffer: Buffer.from(JSON.stringify(tampered)) });
  await expect(status(page)).toContainText('do not match the evidence');
  await expect(status(page)).toHaveClass(/error/);
  await expect(page.locator('#saved-files-viewer-content')).toBeEmpty();
  await isolation();
});

test('keeps report and other panels isolated through replacement, canceled reads and closing', async ({ page }) => {
  await mockGitHub(page);
  await page.goto('./');
  await openSavedReports(page);
  await analyze(page);
  await page.locator('#save').click();
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  const liveTitle = await page.locator('#report-title').textContent();
  const isolation = await trackIsolation(page);
  const period = fixture('v21-period-comparison.json');
  await page.locator('#saved-comparison-file').setInputFiles(period);
  await expect(page.locator('#saved-comparison-status')).toHaveText('Saved comparison opened.');
  await page.getByRole('button', { name: 'Compare Two Saved Files' }).click();
  for (const slot of [1, 2]) await page.locator(`#saved-file-${slot}-input`).setInputFiles(period);
  await page.locator('#compare-saved-submit').click();
  const compare = page.getByRole('region', { name: 'Compare Two Saved Files' });
  await expect(evidence(compare)).toContainText('Both 45');
  await open(page).click();
  await input(page).setInputFiles(historical);
  await expect(status(page)).toHaveText('Saved files comparison opened.');
  const panel = viewer(page);
  for (const region of [panel, compare]) {
    const periods = region.getByText('Original period totals and records', { exact: true });
    await periods.first().click();
    await periods.last().click();
  }
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  await evidence(panel).getByRole('button', { name: 'Outside shared intervals (3)' }).click();
  await expect(evidence(compare).getByRole('button', { name: 'All observations (45)' })).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => {
    const read = File.prototype.text;
    window.finishViewerReads = {};
    File.prototype.text = function () {
      if (!this.name.startsWith('delayed-')) return read.call(this);
      return new Promise(resolve => { window.finishViewerReads[this.name] = async () => resolve(await read.call(this)); });
    };
  });
  const delayed = name => input(page).setInputFiles({ ...historical, name });
  await delayed('delayed-cancel.json');
  await expect(page.locator('#saved-files-viewer-content')).toBeEmpty();
  await panel.getByRole('button', { name: 'Cancel reading' }).click();
  await expect(status(page)).toHaveText('File reading canceled.');
  await expect(panel.getByRole('button', { name: 'Choose comparison JSON' })).toBeFocused();
  await page.evaluate(() => window.finishViewerReads['delayed-cancel.json']());
  await expect(page.locator('#saved-files-viewer-content')).toBeEmpty();

  await delayed('delayed-replaced.json');
  await input(page).setInputFiles(generated({ disjoint: true }));
  await expect(panel).toContainText('N/A · No shared UTC interval');
  await page.evaluate(() => window.finishViewerReads['delayed-replaced.json']());
  await expect(panel).toContainText('N/A · No shared UTC interval');
  await input(page).dispatchEvent('cancel');
  await expect(status(page)).toHaveText('File selection canceled.');
  await expect(panel).toContainText('fixture/project');

  await delayed('delayed-closed.json');
  await panel.getByRole('button', { name: 'Close viewer' }).click();
  await page.evaluate(() => window.finishViewerReads['delayed-closed.json']());
  await open(page).click();
  await expect(status(page)).toBeEmpty();
  await expect(page.locator('#saved-files-viewer-content')).toBeEmpty();
  await expect(page.locator('#saved-comparison-status')).toHaveText('Saved comparison opened.');
  await expect(page.locator('#compare-saved-status')).toHaveText('Saved file comparison ready.');
  await expect(page.locator('#report-title')).toHaveText(liveTitle);
  await expect(page.getByRole('button', { name: '7 days', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await isolation();
});
