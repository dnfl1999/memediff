import { associationHealth, EXPIRING_WITHIN, recordedRefreshFailure } from './index-health.js';

const labels = { fresh: 'Fresh', expiring: 'Expiring soon', expired: 'Expired', 'not-indexed': 'Not indexed',
  unavailable: 'Unavailable', ambiguous: 'Invalid / Ambiguous', invalid: 'Invalid / Ambiguous' };
const detail = {
  fresh: 'Exact CA and repository were verified through Forks Wiki.',
  expiring: 'This verification is in its final six hours. Use Advanced Search to analyze a known repository directly.',
  expired: 'The previously verified GitHub association is older than 48 hours. Automatic repository analysis is unavailable until the association is verified again.',
  'not-indexed': 'No verified GitHub repository found. This CA is absent from the published index.',
  unavailable: 'Association lookup Unavailable. The published index could not be read or is incompatible.',
  ambiguous: 'Multiple entries exist for this CA. A unique verified association is unavailable.',
  invalid: 'The association record or its verification time is invalid for this browser clock.'
};
const element = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
function source(label, href) {
  const link = element('a', label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
function duration(ms, remaining = false) {
  const minutes = Math.floor(ms / 60000);
  if (ms > 0 && minutes === 0 && remaining) return 'Less than 1 min';
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function mountIndexHealth(mount, mint, index, { error, openAdvanced, visible }) {
  const panel = element('section', '');
  panel.className = 'index-health';
  panel.setAttribute('aria-labelledby', 'index-health-title');
  const title = element('h3', 'Index health');
  title.id = 'index-health-title';
  const badge = element('p', '');
  badge.className = 'index-health-state';
  badge.setAttribute('role', 'status');
  const summary = element('p', '');
  const facts = element('dl', '');
  const values = {};
  for (const label of ['Last verified at (UTC)', 'Verification age', 'Verification validity', 'Remaining valid time', 'Verified association']) {
    values[label] = element('dd', '');
    facts.append(element('dt', label), values[label]);
  }
  values['Verification validity'].textContent = '48 hours';
  const links = element('p', 'Data source ');
  links.append(source('Published Forks index', './data/forks-index.json'));
  const associationLink = element('span', '');
  links.append(associationLink, document.createTextNode(' · '), source('CA on Forks Wiki', `https://forks.wiki/coin/${mint}`));
  const advanced = element('button', 'Open GitHub analysis');
  advanced.type = 'button';
  advanced.className = 'text-button';
  advanced.addEventListener('click', openAdvanced);
  const attempt = element('p', '');
  attempt.className = 'small index-health-operation';
  panel.append(title, badge, summary, facts, links, attempt,
    element('p', 'The published index covers a subset of Forks listings. Ages and expiry use this browser’s clock.'), advanced);
  mount.replaceChildren(panel);

  let timer, lastState, lastOperation;
  function update(now = Date.now()) {
    const health = associationHealth(mint, index, now);
    const { state, record, ageMs, remainingMs } = health;
    if (state !== lastState) {
      panel.dataset.indexState = state;
      badge.textContent = labels[state];
      summary.textContent = detail[state] + (error ? ` ${error}` : '');
      const at = values['Last verified at (UTC)'];
      if (record) {
        const time = element('time', record.checkedAt);
        time.dateTime = record.checkedAt;
        at.replaceChildren(time);
      } else at.textContent = state === 'unavailable' ? 'Unavailable' : 'Unknown';
      const availability = values['Verified association'];
      availability.textContent = 'Unavailable';
      if (record) {
        availability.textContent = state === 'expired' ? 'Unavailable · last recorded repository ' : 'Available · ';
        availability.append(source(record.repo, `https://github.com/${record.repo}`));
      } else if (state === 'not-indexed') availability.textContent = 'Unknown';
      associationLink.replaceChildren(...(record ? [document.createTextNode(' · '), source('Recorded Forks source', record.source)] : []));
      advanced.hidden = state === 'fresh';
      lastState = state;
    }
    const failure = recordedRefreshFailure(index, now);
    if (failure?.at !== lastOperation) {
      attempt.replaceChildren(...(failure ? [document.createTextNode(`Published refresh attempt ${failure.at} UTC reported ${failure.reason}. Previous verification times were retained. `),
        source('Workflow record', failure.url)] : []));
      lastOperation = failure?.at;
    }
    attempt.hidden = !failure;
    values['Verification age'].textContent = record ? duration(ageMs) : 'Unknown';
    values['Remaining valid time'].textContent = record ? (state === 'expired' ? 'Expired' : duration(remainingMs, true)) : 'Unknown';
    if (record) {
      const untilTransition = state === 'fresh' ? remainingMs - EXPIRING_WITHIN : state === 'expiring' ? remainingMs + 1 : 60000;
      timer = setTimeout(() => { if (visible()) update(); }, Math.min(untilTransition, 60000));
    }
    return health;
  }
  const health = update();
  return { health, stop: () => clearTimeout(timer) };
}
