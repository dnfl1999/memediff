import { comparePeriods, defaultPeriods, periodBounds } from './period-comparison.js';
import { periodKeys as periods, periodRange as range } from './period-evidence.js';
import { downloadBlob, pngCanvas } from './download.js';
import { MAX_PERIOD_PNG_BYTES, periodExportData, periodFilename, periodJSON } from './period-export.js';
import { drawPeriodComparison, periodImage } from './period-export-png.js';
import { renderPeriodResults } from './period-comparison-view.js';

const upper = key => key.toUpperCase();

export function bindPeriodComparison(root) {
  if (!root) return () => {};
  const form = root.querySelector('form');
  const inputs = form.querySelectorAll('input');
  const status = root.querySelector('#period-status');
  const rangeLabel = root.querySelector('#period-range');
  const results = root.querySelector('#period-results');
  const json = root.querySelector('#period-export-json');
  const png = root.querySelector('#period-export-png');
  const exportStatus = root.querySelector('#period-export-status');
  let report, applied = null, pngPending = null;
  const input = (key, field) => form.querySelector(`#period-${key}-${field}`);
  const readDates = () => Object.fromEntries(periods.map(key => [key, { start: input(key, 'start').value, end: input(key, 'end').value }]));
  const current = snapshot => Boolean(snapshot && applied === snapshot && periods.every(key =>
    ['start', 'end'].every(field => snapshot.dates[key][field] === input(key, field).value)));
  function say(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
  }
  function exportMessage(text, error = false) {
    if (!exportStatus) return;
    exportStatus.textContent = text;
    exportStatus.classList.toggle('error', error);
  }
  function syncButtons() {
    if (json) json.disabled = !current(applied);
    if (png) png.disabled = !current(applied) || pngPending === applied;
  }
  function setApplied(snapshot) {
    applied = snapshot;
    pngPending = null;
    syncButtons();
    exportMessage('');
  }
  function compare(moveFocus) {
    const dates = readDates();
    const result = comparePeriods(report, dates);
    for (const field of inputs) field.removeAttribute('aria-invalid');
    if (result.error) {
      setApplied(null);
      results.hidden = true;
      const field = result.period ? input(result.period, result.field) : null;
      say(result.period ? `Period ${upper(result.period)}. ${result.error}` : result.error, true);
      field?.setAttribute('aria-invalid', 'true');
      if (moveFocus) field?.focus();
      return;
    }
    renderPeriodResults(results, result, report.repo);
    setApplied({ report, dates, result });
    say(moveFocus ? 'Period comparison updated.' : '');
  }
  json?.addEventListener('click', () => {
    if (!current(applied)) { syncButtons(); return; }
    try {
      const data = periodExportData(applied.report, applied.dates, applied.result);
      downloadBlob(periodJSON(data), periodFilename(data, 'json'));
      exportMessage('Comparison JSON requested. Check your browser downloads.');
    } catch (error) {
      exportMessage(error.message, true);
    }
  });
  png?.addEventListener('click', () => {
    const snapshot = applied;
    if (!current(snapshot) || pngPending === snapshot) { syncButtons(); return; }
    pngPending = snapshot;
    syncButtons();
    exportMessage('Creating comparison PNG…');
    function finish(blob) {
      if (pngPending !== snapshot) return;
      pngPending = null;
      syncButtons();
      if (!current(snapshot)) return;
      if (!blob?.size || blob.size > MAX_PERIOD_PNG_BYTES) {
        exportMessage(blob?.size ? 'The comparison PNG exceeds the 8 MiB export limit.' : 'Could not create the comparison PNG. The comparison JSON is available.', true);
        return;
      }
      try {
        downloadBlob(blob, periodFilename(data, 'png'));
        exportMessage('Comparison PNG requested. Check your browser downloads.');
      } catch {
        exportMessage('Could not download the comparison PNG.', true);
      }
    }
    let data;
    try {
      data = periodExportData(snapshot.report, snapshot.dates, snapshot.result);
      const { canvas, context } = pngCanvas(periodImage.width, periodImage.height);
      drawPeriodComparison(context, data, document.querySelector('header .brand-icon'));
      canvas.toBlob(finish, 'image/png');
    } catch {
      finish(null);
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (report) compare(true);
  });
  function markDirty() {
    if (!report) return;
    setApplied(null);
    for (const field of inputs) field.removeAttribute('aria-invalid');
    results.hidden = true;
    say('Select Compare periods to apply your dates.');
  }
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  return next => {
    report = next;
    setApplied(null);
    results.hidden = true;
    results.replaceChildren();
    rangeLabel.textContent = '';
    form.reset();
    for (const field of inputs) {
      field.removeAttribute('aria-invalid');
      field.disabled = true;
    }
    form.querySelector('button').disabled = true;
    say('');
    const bounds = periodBounds(report);
    if (!bounds) {
      if (report) say('The report’s UTC collection range is unavailable.', true);
      return;
    }
    rangeLabel.textContent = `Report collection in UTC · ${range(bounds.start, bounds.end + 1)}`;
    const dates = defaultPeriods(bounds);
    for (const key of periods) {
      for (const field of ['start', 'end']) {
        const node = input(key, field);
        node.min = bounds.minDate;
        node.max = bounds.maxDate;
        node.value = dates[key][field];
        node.disabled = false;
      }
    }
    form.querySelector('button').disabled = false;
    compare(false);
  };
}
