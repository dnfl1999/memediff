import { canvasLines } from './canvas-text.js';
import { observedCount } from './period-evidence.js';
import { periodHomepage } from './period-export.js';

export const savedFilesImageWidth = 1400;
const margin = 60;
const contentWidth = savedFilesImageWidth - 2 * margin;
const ink = '#eaf4df', lime = '#a8ff32', cyan = '#63d8df', muted = '#b5c4c7', amber = '#f1cc8c';
const range = ({ startUtc, endExclusiveUtc }) => `${startUtc} → ${endExclusiveUtc} (end exclusive)`;

export function layoutSavedFilesPng(context, data, logo) {
  const paint = [];
  const hasShared = data.sharedUtc.status === 'available';
  let y = 44;

  function rectangle(color, x, top, width, height) {
    paint.push(() => {
      context.fillStyle = color;
      context.fillRect(x, top, width, height);
    });
  }

  function text(value, { x = margin, top = y, width = contentWidth, size = 20, color = ink, mono = false } = {}) {
    const font = `${size}px ${mono ? 'ui-monospace, monospace' : '"Segoe UI", sans-serif'}`;
    context.font = font;
    const lines = canvasLines(context, value, width);
    paint.push(() => {
      context.font = font;
      context.fillStyle = color;
      context.textBaseline = 'top';
      lines.forEach((line, index) => context.fillText(line, x, top + index * (size + 7)));
    });
    return lines.length * (size + 7);
  }

  function summary(label, data, color) {
    rectangle('#151d19', margin, y, contentWidth, 112);
    text(label, { x: margin + 20, top: y + 14, color });
    const labels = { both: 'Observed in both', first: 'File 1 only', second: 'File 2 only' };
    Object.entries(labels).forEach(([key, caption], index) => {
      const x = margin + 20 + index * 418;
      text(caption, { x, top: y + 46, color: muted, size: 17, width: 390 });
      const value = hasShared ? observedCount(data.sharedCounts[key], data.collectionCompleteByFile.every(Boolean)) : 'N/A';
      text(value, { x, top: y + 69, size: 26, width: 390 });
    });
    y += 126;
  }

  if (logo?.complete && logo.naturalWidth && logo.naturalHeight) {
    const scale = 72 / Math.max(logo.naturalWidth, logo.naturalHeight);
    paint.push(() => context.drawImage(logo, margin, 44, logo.naturalWidth * scale, logo.naturalHeight * scale));
  } else text('±', { size: 62, color: lime });
  text('MEMEDIFF', { x: 156, top: 45, size: 20, color: lime });
  text('Saved Files Comparison', { x: 156, top: 71, size: 43 });
  y = 139;
  y += text(`Repository  ${data.repository.name}`, { size: 27, mono: true });
  y += text(`Branch  ${data.repository.branch}`, { size: 20, mono: true });
  y += text('Local files · Unverified', { size: 22, color: amber }) + 14;

  data.files.forEach((file, index) => {
    const x = margin + index * 650;
    const color = index ? cyan : lime;
    const commitsComplete = data.commits.collectionCompleteByFile[index];
    const releasesComplete = data.releases.collectionCompleteByFile[index];
    rectangle('#151d19', x, y, 630, 96);
    text(`FILE ${index + 1}  /  RECORDED OBSERVATION`, { x: x + 18, top: y + 13, color, size: 17, width: 594 });
    text(file.observedAtUtc, { x: x + 18, top: y + 39, size: 21, mono: true, width: 594 });
    text(`Commits ${commitsComplete ? 'complete' : 'incomplete'} · Releases ${releasesComplete ? 'complete' : 'incomplete'}`,
      { x: x + 18, top: y + 69, color: commitsComplete && releasesComplete ? muted : amber, size: 17, width: 594 });
  });
  y += 122;
  y += text('SHARED UTC COVERAGE', { size: 19, color: lime });
  if (!hasShared) y += text('N/A · No shared UTC interval.', { color: amber });
  data.sharedUtc.intervals.forEach((interval, index) => {
    if (index) y += text(`Gap  ${range(data.sharedUtc.gaps[index - 1])}`, { color: muted, size: 18, mono: true });
    y += text(`${index + 1}.  ${range(interval)}`, { size: 21, mono: true });
  });
  y += 15;
  summary('Commit observations · Unique SHAs', data.commits, lime);
  summary('Public release observations · Unique IDs', data.releases, cyan);
  y += text('Unknown indicates incomplete evidence. See the JSON for all records and provenance.', { size: 18, color: muted });
  y += text('An unobserved SHA does not establish deletion. Activity does not measure productivity or token safety.', { size: 18, color: muted });
  y += 13;
  y += text(`GitHub source  ${data.repository.url}`, { size: 18, color: lime, mono: true });
  y += text(`MemeDiff  ${periodHomepage}`, { size: 18, color: lime, mono: true });

  const height = y + 30;
  return { height, draw() {
    context.fillStyle = '#080a0b';
    context.fillRect(0, 0, savedFilesImageWidth, height);
    for (const item of paint) item();
  } };
}
