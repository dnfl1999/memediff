import { el } from './report-dom.js';
import { recordReportDownload } from './analytics.js';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = el('a');
  anchor.href = url;
  anchor.download = filename;
  try {
    document.body.append(anchor);
    anchor.click();
    if (blob.type === 'image/png') recordReportDownload('png');
    if (blob.type === 'application/json') recordReportDownload('json');
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

export function pngCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');
  return { canvas, context };
}
