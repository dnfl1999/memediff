import { formatNumber } from './format.js';
import { commitSource, overlapSHAs } from './sha-explorer.js';

const pageSize = 20;
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
  const lists = { all: rows, new: rows.filter(row => row.category === 'new'), missing: rows.filter(row => row.category === 'missing') };
  const buttons = element('div', null, 'sha-filters');
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-label', 'Filter SHA observations');
  const count = element('p', null, 'sha-result-count');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  const list = element('ol', null, 'sha-results');
  list.id = 'sha-results';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'SHA observations');
  const nav = element('div', null, 'sha-pagination');
  const back = element('button', 'Previous page'), forward = element('button', 'Next page');
  nav.append(back, forward);
  for (const button of [back, forward]) {
    button.type = 'button';
    button.setAttribute('aria-controls', list.id);
  }

  let active = 'all', page = 0;
  const filterButtons = Object.entries(filters).map(([key, label]) => {
    const button = element('button', `${label} (${formatNumber(lists[key].length)})`);
    button.type = 'button';
    button.setAttribute('aria-controls', list.id);
    button.addEventListener('click', () => {
      active = key;
      page = 0;
      update();
    });
    buttons.append(button);
    return [key, button];
  });
  back.addEventListener('click', () => {
    page--;
    update();
    if (back.disabled) forward.focus();
  });
  forward.addEventListener('click', () => {
    page++;
    update();
    if (forward.disabled) back.focus();
  });

  function update() {
    const selected = lists[active];
    const pages = Math.ceil(selected.length / pageSize);
    const start = page * pageSize, end = Math.min(start + pageSize, selected.length);
    for (const [key, button] of filterButtons) button.setAttribute('aria-pressed', String(key === active));
    list.start = start + 1;
    list.replaceChildren(...selected.slice(start, end).map(row => renderRow(row, current.repo)));
    list.hidden = !selected.length;
    count.textContent = selected.length ? `${formatNumber(selected.length)} ${selected.length === 1 ? 'SHA' : 'SHAs'}. Showing ${start + 1}–${end} · Page ${page + 1} of ${pages}.`
      : 'No SHA observations match this filter.';
    nav.hidden = pages < 2;
    back.disabled = page === 0;
    forward.disabled = page + 1 >= pages;
  }

  section.append(buttons, count, list, nav);
  update();
  return section;
}
