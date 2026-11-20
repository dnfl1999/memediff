import { formatNumber } from './format.js';
import { el, link } from './report-dom.js';
import { commitSource } from './sha-explorer.js';
import { authorSource, observedCount as count, observedDuration as duration, periodKeys as periods, periodRange as range, releaseSource } from './period-evidence.js';

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

function evidenceItem(kind, row, repo, showCommitMessages) {
  const item = el('li');
  const authorLink = account => sourceText(account, authorSource(account));
  if (kind === 'authors') {
    item.append(authorLink(row));
  } else if (kind === 'commits') {
    const commit = sourceText(row.sha, commitSource(repo, row.sha));
    commit.className = 'period-sha';
    if (showCommitMessages) item.append(el('div', row.message || 'Commit message unavailable'));
    item.append(commit, el('small'));
    item.lastChild.append(timestamp(row.date), ' · ', row.author ? authorLink(row.author) : 'No linked GitHub account');
  } else {
    const type = row.prerelease === true ? 'Prerelease' : row.prerelease === false ? 'General release' : 'Release type unavailable';
    item.append(sourceText(row.name || 'Untitled release', releaseSource(repo, row.url)), el('small', `ID ${row.id} · ${type} · `));
    item.lastChild.append(timestamp(row.date));
  }
  return item;
}

function evidenceList(period, kind, title, records, repo, namespace) {
  const box = el('details', null, 'period-evidence');
  box.id = `${namespace}-${period}-${kind}`;
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
    list.append(...records.rows.map(row => evidenceItem(kind, row, repo, namespace === 'period')));
    box.append(list);
  });
  return box;
}

function activityCard(key, period, repo, namespace) {
  const card = el('article', null, 'period-activity');
  card.setAttribute('aria-label', `Period ${upper(key)} evidence`);
  const label = `Period ${upper(key)}`;
  card.append(el(namespace === 'period' ? 'h4' : 'h3', label),
    el('p', range(period.from, period.until), 'period-range'),
    el('p', `Observed duration ${duration(period.durationMs)}${period.clipped ? ' · Partial UTC date' : ''}`, 'small'),
    el('p', `Commit collection ${period.commits.complete ? 'complete' : 'incomplete'} · Release collection ${period.releases.complete ? 'complete' : 'incomplete'}`, 'small'),
    el('p', `${counted(period.releases.general, period.releases.typesComplete, 'general release')} · ${counted(period.releases.prereleases, period.releases.typesComplete, 'prerelease')}`, 'period-release-types'),
    el('p', `${counted(period.authors.unlinked, period.authors.complete, 'commit')} without a linked GitHub author`, 'period-unlinked'),
    evidenceList(key, 'commits', 'Commits by unique SHA', period.commits, repo, namespace),
    evidenceList(key, 'releases', 'Public releases', period.releases, repo, namespace),
    evidenceList(key, 'authors', 'Linked GitHub authors', period.authors, repo, namespace));
  return card;
}

function activityChart(kind, title, comparison, namespace) {
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
    const target = `${namespace}-${key}-${kind}`;
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

export function renderPeriodResults(box, comparison, repo, namespace = 'period') {
  const charts = el('div', null, 'period-pair');
  const activity = el('div', null, 'period-pair');
  charts.append(activityChart('commits', 'Observed commits · Unique SHAs', comparison, namespace),
    activityChart('releases', 'Observed public releases', comparison, namespace));
  activity.append(...periods.map(key => activityCard(key, comparison[key], repo, namespace)));
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
