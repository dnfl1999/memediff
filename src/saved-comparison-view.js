import { el, link } from './report-dom.js';

export function renderSavedMetadata(meta, { repository, token, observedAt, collection }, includeMissingToken = false) {
  const fields = [
    ['Report observed at (UTC)', observedAt], ['Repository', link(repository.name, repository.url)],
    ['Branch', repository.branch ?? 'Unavailable'], ['Recorded collection (UTC)', `${collection.startUtc} → ${collection.endInclusiveUtc}`]
  ];
  if (token || includeMissingToken) fields.push(['User-supplied token CA', token ?? 'Not recorded']);
  meta.replaceChildren();
  for (const [label, value] of fields) {
    const description = el('dd');
    description.append(value);
    meta.append(el('dt', label), description);
  }
}

export function renderSavedSources(sources, { repository, collection }) {
  sources.replaceChildren(...[repository.url, ...collection.apiEvidence].map(url => {
    const item = el('li');
    item.append(link(url, url));
    return item;
  }));
}
