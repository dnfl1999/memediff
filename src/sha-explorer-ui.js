import { commitSource, overlapSHAs } from './sha-explorer.js';
import { pagedObservations } from './observation-pagination.js';

const filters = {
  all: 'All observations in overlap',
  new: 'Newly observed in overlap',
  missing: 'No longer observed in overlap'
};
const categories = { both: 'Observed in both', new: 'Newly observed', missing: 'No longer observed' };

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function timestamp(value) {
  if (!value) return element('span', 'Unavailable');
  const time = element('time', value);
  time.dateTime = value;
  return time;
}

function renderRow(row, repo) {
  const item = element('li', null, 'sha-row');
  const heading = element('div', null, 'sha-row-heading');
  const code = element('code', row.sha);
  const url = commitSource(repo, row.sha);
  if (url) {
    const link = element('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Open GitHub commit ${row.sha}`);
    link.append(code);
    heading.append(link);
  } else {
    heading.append(code);
  }
  heading.append(element('span', categories[row.category], `sha-category sha-${row.category}`));
  item.append(heading);
  for (const source of row.sources) {
    const record = element('div', null, 'sha-observation');
    const label = source.key === 'previous' ? 'Previous' : 'Current';
    const scope = source.inOverlap ? '' : source.date ? ' · Outside shared interval' : ' · Interval membership unavailable';
    record.append(element('p', `${label}${scope}`, 'sha-observation-label'));
    const details = element('dl');
    const observedAt = element('dd'), commitTime = element('dd');
    observedAt.append(timestamp(source.observedAt));
    commitTime.append(timestamp(source.date));
    details.append(element('dt', 'Observed at'), observedAt, element('dt', 'Commit time'), commitTime,
      element('dt', 'Author'), element('dd', source.author || 'Unavailable'),
      element('dt', 'Message'), element('dd', source.message || 'Unavailable'));
    record.append(details);
    item.append(record);
  }
  return item;
}

export function renderSHAExplorer(previous, current, comparison) {
  const section = element('section', null, 'sha-explorer');
  section.setAttribute('aria-labelledby', 'sha-explorer-title');
  const title = element('h4', 'SHA Explorer');
  title.id = 'sha-explorer-title';
  section.append(title);
  if (comparison.partial) section.append(element('p', 'Incomplete collection. Some SHA observations may be missing.', 'warning'));
  if (comparison.baselineOrigin === 'imported-json') section.append(element('p', 'Previous observations come from an unverified imported JSON file.', 'warning'));

  const rows = overlapSHAs(previous, current, comparison);
  if (!rows) {
    section.append(element('p', 'N/A · No shared interval.', 'small'));
    return section;
  }
  section.append(element('p', 'These filters show the shared UTC interval. The 30-day comparison below counts all newly observed SHA values.', 'small'),
    element('p', 'Newly observed does not establish new work. No longer observed does not establish deletion.', 'small'));
  section.append(pagedObservations({ rows, filters, label: 'SHA observations', unit: 'SHA', listId: 'sha-results',
    renderRow: row => renderRow(row, current.repo) }));
  return section;
}
