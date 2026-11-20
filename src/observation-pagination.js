import { formatNumber } from './format.js';
import { el } from './report-dom.js';

const pageSize = 20;

export function pagedObservations({ rows, filters, label, unit, listId, renderRow }) {
  const lists = Object.fromEntries(Object.keys(filters).map(key => [key, key === 'all' ? rows : rows.filter(row => row.category === key)]));
  const buttons = el('div', null, 'sha-filters');
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-label', `Filter ${label}`);
  const count = el('p', null, 'sha-result-count');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  const list = el('ol', null, 'sha-results');
  list.id = listId;
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', label);
  const nav = el('div', null, 'sha-pagination');
  const back = el('button', 'Previous page'), forward = el('button', 'Next page');
  nav.append(back, forward);
  for (const button of [back, forward]) {
    button.type = 'button';
    button.setAttribute('aria-controls', list.id);
  }
  let active = 'all', page = 0;
  const filterButtons = Object.entries(filters).map(([key, name]) => {
    const button = el('button', `${name} (${formatNumber(lists[key].length)})`);
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
    const selected = lists[active], pages = Math.ceil(selected.length / pageSize);
    const start = page * pageSize, end = Math.min(start + pageSize, selected.length);
    for (const [key, button] of filterButtons) button.setAttribute('aria-pressed', String(key === active));
    list.start = start + 1;
    list.replaceChildren(...selected.slice(start, end).map(renderRow));
    list.hidden = !selected.length;
    count.textContent = selected.length ? `${formatNumber(selected.length)} ${unit}${selected.length === 1 ? '' : 's'}. Showing ${start + 1}–${end} · Page ${page + 1} of ${pages}.`
      : `No ${label} match this filter.`;
    nav.hidden = pages < 2;
    back.disabled = page === 0;
    forward.disabled = page + 1 >= pages;
  }

  update();
  const result = document.createDocumentFragment();
  result.append(buttons, count, list, nav);
  return result;
}
