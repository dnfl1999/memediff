import { formatNumber } from './format.js';
import { comparePeriods, defaultPeriods, periodBounds } from './period-comparison.js';
import { el, link } from './report-dom.js';
import { commitSource } from './sha-explorer.js';
import { authorSource, observedCount as count, observedDuration as duration, periodKeys as periods, periodRange as range, releaseSource } from './period-evidence.js';
import { downloadBlob, pngCanvas } from './download.js';
import { MAX_PERIOD_PNG_BYTES, periodExportData, periodFilename, periodJSON } from './period-export.js';
import { drawPeriodComparison, periodImage } from './period-export-png.js';

const upper = key => key.toUpperCase();
const counted = (value, complete, label) => `${count(value, complete)} ${label}${value === 1 ? '' : 's'}`;

function sourceText(label, url) {
  return url ? link(label, url) : el('span', label);
}

function timestamp(value) {
  const time = el('time', value);
  time.dateTime = value;
  return time;
}

function evidenceItem(kind, row, repo) {
  const item = el('li');
  const authorLink = account => sourceText(account, authorSource(account));
  if (kind === 'authors') {
    item.append(authorLink(row));
  } else if (kind === 'commits') {
    const commit = sourceText(row.sha, commitSource(repo, row.sha));
    commit.className = 'period-sha';
    item.append(el('div', row.message || 'Commit message unavailable'), commit, el('small'));
    item.lastChild.append(timestamp(row.date), ' · ', row.author ? authorLink(row.author) : 'No linked GitHub account');
  } else {
    const type = row.prerelease === true ? 'Prerelease' : row.prerelease === false ? 'General release' : 'Release type unavailable';
    item.append(sourceText(row.name || 'Untitled release', releaseSource(repo, row.url)), el('small', `ID ${row.id} · ${type} · `));
    item.lastChild.append(timestamp(row.date));
  }
  return item;
}

function evidenceList(period, kind, title, records, repo) {
  const box = el('details', null, 'period-evidence');
  box.id = `period-${period}-${kind}`;
  const summary = el('summary', `${title} · ${count(records.count, records.complete)}`);
  box.append(summary);
  box.addEventListener('toggle', () => {
    if (!box.open || box.childElementCount > 1) return;
    if (!records.rows.length) {
      box.append(el('p', records.complete ? `No ${title.toLowerCase()} observed in this period.` :
        'Unknown. Collection could not confirm activities for this period.', 'small'));
      return;
    }
    const list = el('ul', null, 'evidence-list');
    list.append(...records.rows.map(row => evidenceItem(kind, row, repo)));
    box.append(list);
  });
  return box;
}

function activityCard(key, period, repo) {
  const card = el('article', null, 'period-activity');
  card.setAttribute('aria-label', `Period ${upper(key)} evidence`);
  const label = `Period ${upper(key)}`;
  card.append(el('h4', label),
    el('p', range(period.from, period.until), 'period-range'),
    el('p', `Observed duration ${duration(period.durationMs)}${period.clipped ? ' · Partial UTC date' : ''}`, 'small'),
    el('p', `Commit collection ${period.commits.complete ? 'complete' : 'incomplete'} · Release collection ${period.releases.complete ? 'complete' : 'incomplete'}`, 'small'),
    el('p', `${counted(period.releases.general, period.releases.typesComplete, 'general release')} · ${counted(period.releases.prereleases, period.releases.typesComplete, 'prerelease')}`, 'period-release-types'),
    el('p', `${counted(period.authors.unlinked, period.authors.complete, 'commit')} without a linked GitHub author`, 'period-unlinked'),
    evidenceList(key, 'commits', 'Commits by unique SHA', period.commits, repo),
    evidenceList(key, 'releases', 'Public releases', period.releases, repo),
    evidenceList(key, 'authors', 'Linked GitHub authors', period.authors, repo));
  return card;
}

function activityChart(kind, title, comparison) {
  const chart = el('figure', null, 'period-chart');
  const caption = el('figcaption', title);
  const scale = Math.max(1, ...periods.map(key => comparison[key][kind].count ?? 0));
  chart.append(caption);
  for (const key of periods) {
    const { count: observed, complete } = comparison[key][kind];
    const row = el('div', null, 'period-chart-row');
    const track = el('div', null, 'period-chart-track');
    track.setAttribute('aria-hidden', 'true');
    const bar = el('div', null, `period-chart-bar period-chart-${key}`);
    bar.style.width = `${(observed ?? 0) * 100 / scale}%`;
    track.append(bar);
    const source = el('a', count(observed, complete));
    const target = `period-${key}-${kind}`;
    source.href = `#${target}`;
    source.setAttribute('aria-label', `Period ${upper(key)} ${kind} evidence: ${source.textContent}`);
    source.addEventListener('click', event => {
      event.preventDefault();
      const detail = document.getElementById(target);
      detail.open = true;
      detail.querySelector('summary').focus();
    });
    row.append(el('span', upper(key), 'period-chart-key'), track, source);
    chart.append(row);
  }
  const delta = comparison.delta[kind];
  chart.append(el('p', `Observed difference (B − A) ${delta > 0 ? '+' : ''}${count(delta)}`, 'small'));
  return chart;
}

function renderResults(box, comparison, repo) {
  const charts = el('div', null, 'period-pair');
  const activity = el('div', null, 'period-pair');
  charts.append(activityChart('commits', 'Observed commits · Unique SHAs', comparison),
    activityChart('releases', 'Observed public releases', comparison));
  activity.append(...periods.map(key => activityCard(key, comparison[key], repo)));
  const notes = [];
  if (comparison.overlap) {
    const { overlap } = comparison;
    const shared = (value, label) => value === null ? `shared ${label} unknown` : `${formatNumber(value)} observed ${label}`;
    notes.push(el('p', `Periods overlap from ${range(overlap.from, overlap.until)}. Both totals include the shared records: ${shared(overlap.commits, 'commit SHAs')} and ${shared(overlap.releases, 'release IDs')}.`, 'warning'));
  }
  if (comparison.unequal) notes.push(el('p', 'Periods have different durations. Totals show observed activity and are not adjusted for time.', 'warning'));
  if (periods.some(key => !comparison[key].commits.complete || !comparison[key].releases.complete)) {
    notes.push(el('p', 'Collection is incomplete. The counts and differences describe available records. The report cannot identify the exact missing dates.', 'warning'));
  }
  box.replaceChildren(...notes, charts, activity);
  box.hidden = false;
}

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
    renderResults(results, result, report.repo);
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
