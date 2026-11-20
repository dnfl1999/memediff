import { el, link } from './report-dom.js';
import { authorSource, iso, observedCount, periodKeys } from './period-evidence.js';
import { pagedObservations } from './observation-pagination.js';
import { renderPeriodResults } from './period-comparison-view.js';
import { renderSavedMetadata, renderSavedSources } from './saved-comparison-view.js';

const unverified = 'Local file · Unverified';
const filters = {
  all: 'All observations', both: 'Observed in both', first: 'File 1 only', second: 'File 2 only',
  differentScope: 'Different source scopes', outside: 'Outside shared intervals', unknown: 'Incomplete counterpart'
};
const inScope = {
  shared: 'Recorded within a shared interval',
  outside: 'Recorded outside the shared intervals',
  excluded: 'The selected periods exclude the other file’s timestamp',
  unobserved: 'No matching record in the shared interval',
  unavailable: 'Unknown · Collection incomplete'
};
const fieldNames = { date: 'date', author: 'author', name: 'name', prerelease: 'release type', url: 'source link' };
const caNote = {
  same: 'Both files record the same user-supplied CA. This does not verify a token–repository association.',
  different: 'The files record different user-supplied CAs. The activity comparison uses the recorded repository and branch.',
  one: 'Only one file records a user-supplied CA.',
  absent: 'Both files leave the user-supplied CA blank.'
};
const orderNote = {
  '-1': 'File 1 has the later recorded observation time.',
  0: 'Both files have the same recorded observation time.',
  1: 'File 2 has the later recorded observation time.'
};

const utcBounds = ({ from, until }) => `${iso(from)} → ${iso(until)} (end exclusive)`;

export function renderSavedFile(slot, file, number) {
  const meta = el('dl', null, 'saved-comparison-meta');
  renderSavedMetadata(meta, file, true);
  const summaries = el('div', null, 'saved-file-periods');
  for (const key of periodKeys) {
    const { start, end } = file.selected[key];
    const period = file.comparison[key];
    const row = el('article', null, 'period-activity');
    row.append(el('h4', `Period ${key.toUpperCase()}`),
      el('p', `Selected ${start} → ${end} UTC · End date included`, 'small'),
      el('p', utcBounds(period), 'period-range'),
      el('p', `Commit collection ${period.commits.complete ? 'complete' : 'incomplete'} · Release collection ${period.releases.complete ? 'complete' : 'incomplete'}`, 'small'));
    summaries.append(row);
  }
  const source = el('details', null, 'saved-comparison-evidence');
  const urls = el('ul', null, 'source-list');
  renderSavedSources(urls, file);
  source.append(el('summary', 'Original GitHub links'), urls);
  const records = el('details', null, 'saved-comparison-evidence');
  const content = el('div', null, 'saved-file-original-periods');
  records.append(el('summary', 'Original period totals and records'), content);
  records.addEventListener('toggle', () => {
    if (records.open && !content.childElementCount) renderPeriodResults(content, file.comparison, file.repository.name, `saved-file-${number}`);
  });
  slot.replaceChildren(el('p', unverified, 'warning'), meta, summaries, source, records);
  slot.hidden = false;
}

function sourceObservation({ row, status }, number, kind, observedAt) {
  const card = el('div', null, 'sha-observation');
  card.append(el('p', `File ${number} · ${inScope[status]}`, 'sha-observation-label'));
  if (!row) return card;
  const details = el('dl');
  function field(label, value) {
    const description = el('dd');
    description.append(value);
    details.append(el('dt', label), description);
  }
  field('Observed at (UTC)', observedAt);
  field(kind === 'commits' ? 'Commit time (UTC)' : 'Published at (UTC)', row.date);
  if (kind === 'commits') {
    field('Author', row.author ? link(row.author, authorSource(row.author)) : 'Unavailable');
    field('Original commit', link(row.sha, row.url));
  } else {
    field('Release name', row.name ?? 'Unavailable');
    field('Release type', row.prerelease === true ? 'Prerelease' : row.prerelease === false ? 'General release' : 'Unavailable');
    field('Original release', row.url ? link(`Release ID ${row.id}`, row.url) : 'Unavailable');
  }
  card.append(details);
  return card;
}

function observation(row, files, kind) {
  const item = el('li', null, 'sha-row');
  const head = el('div', null, 'sha-row-heading');
  head.append(el('code', kind === 'commits' ? row.id : `Release ID ${row.id}`),
    el('span', filters[row.category], 'sha-category'));
  item.append(head);
  if (row.conflicting.length) {
    item.append(el('p', `Recorded values differ · ${row.conflicting.map(key => fieldNames[key]).join(', ')}`, 'small'));
  }
  item.append(...row.sources.map((source, index) => sourceObservation(source, index + 1, kind, files[index].observedAt)));
  return item;
}

function evidenceSection(files, data, kind, hasShared) {
  const commits = kind === 'commits';
  const label = commits ? 'SHA observations' : 'Release observations';
  const section = el('section', null, 'saved-file-observations');
  const id = commits ? 'saved-files-shas' : 'saved-files-releases';
  const title = el('h4', commits ? 'Common and file-specific SHA observations' : 'Release observations');
  title.id = `${id}-heading`;
  section.setAttribute('aria-labelledby', title.id);
  const { totals, coverage } = data;
  const summary = hasShared
    ? `Shared intervals · Both ${observedCount(totals.both)} · File 1 only ${observedCount(totals.first)} · File 2 only ${observedCount(totals.second)}`
    : 'N/A · No shared UTC interval.';
  section.append(title, el('p', summary, 'small'));
  if (coverage.some(complete => !complete)) {
    const incomplete = coverage.flatMap((complete, i) => complete ? [] : [`File ${i + 1}`]).join(' and ');
    section.append(el('p', `Incomplete collection in ${incomplete}. A missing observation may be Unknown.`, 'warning'));
  }
  if (data.rows.length || hasShared) {
    section.append(pagedObservations({ rows: data.rows, filters, unit: commits ? 'SHA' : 'release ID',
      label, listId: id, renderRow: row => observation(row, files, kind) }));
  }
  return section;
}

export function renderSavedFileComparison(box, files, comparison) {
  const title = el('h3', 'Recorded observation comparison');
  title.tabIndex = -1;
  box.replaceChildren(title, el('p', unverified, 'warning'), el('p', orderNote[comparison.observationOrder], 'small'),
    el('p', caNote[comparison.ca], 'small'));
  if (comparison.sameFile) box.append(el('p', 'Both selections are the same file (identical SHA-256).', 'small'));
  if (comparison.blocked) box.append(el('p', comparison.blocked, 'warning'));
  else {
    box.append(el('h4', 'Shared UTC coverage'));
    if (comparison.shared.length) {
      const list = el('ul', null, 'saved-file-windows');
      list.append(...comparison.shared.map(interval => el('li', utcBounds(interval), 'period-range')));
      box.append(list);
    } else box.append(el('p', 'N/A · No shared UTC interval in the saved selections.', 'warning'));
    box.append(el('p', 'Recorded activity does not establish productivity, and an unobserved SHA does not establish deletion. GitHub links do not authenticate either file.', 'small'),
      evidenceSection(files, comparison.commits, 'commits', comparison.shared.length > 0),
      evidenceSection(files, comparison.releases, 'releases', comparison.shared.length > 0));
  }
  box.hidden = false;
  title.focus();
}
