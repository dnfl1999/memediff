import { utcMillis } from '../src/core.js';
import { MonitorReadError, repoURL, runURL, sanitizeFailure, validId } from './index-monitor-data.mjs';
import { qaSummary } from './qa-diagnostic.mjs';

export const issueTitle = 'Operations: Forks index verification';
const bot = 'github-actions[bot]';
const marker = 'memediff-index-health:v1';
const sources = ['consecutive-refresh-failures', 'expiring', 'expired'];

function readMarker(body) {
  const encoded = typeof body === 'string' ? body.match(/^<!-- memediff-index-health:v1 ([A-Za-z0-9_-]{1,2500}) -->$/m)?.[1] : null;
  if (!encoded) return null;
  try {
    const state = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!['active', 'recovered'].includes(state.phase) || !Array.isArray(state.alerts) ||
        state.alerts.some(alert => !sources.includes(alert)) || !Number.isFinite(utcMillis(state.startedAt)) ||
        (state.verifiedAt !== null && !Number.isFinite(utcMillis(state.verifiedAt)))) return null;
    return { phase: state.phase, alerts: state.alerts, startedAt: state.startedAt, verifiedAt: state.verifiedAt,
      scheduledFailure: sanitizeFailure(state.scheduledFailure), publishedFailure: sanitizeFailure(state.publishedFailure) };
  } catch { return null; }
}

const encode = state => `<!-- ${marker} ${Buffer.from(JSON.stringify(state)).toString('base64url')} -->`;
const active = alerts => alerts.length > 0;
const sameState = (a,b) => JSON.stringify(a) === JSON.stringify(b);

export function planIssue(observation, issue, previous) {
  const { index, schedule, recovery, at } = observation;
  const incident = previous?.phase === 'active' ? previous : null;
  const alerts = [];
  if (observation.activeFailure || (schedule.status === 'unavailable' && !recovery && incident?.alerts.includes(sources[0]))) alerts.push(sources[0]);
  if (index.state === 'expiring' || index.state === 'expired') alerts.push(index.state);
  else if (index.state === 'unavailable') {
    const lastAgeAlert = incident?.alerts.find(value => value === 'expiring' || value === 'expired');
    if (lastAgeAlert) alerts.push(lastAgeAlert);
  }
  let state;
  if (active(alerts)) {
    state = { phase: 'active', alerts, startedAt: incident?.startedAt ?? at,
      verifiedAt: index.verifiedAt ?? incident?.verifiedAt ?? null,
      scheduledFailure: alerts.includes(sources[0]) ? schedule.attempt?.failure ?? incident?.scheduledFailure ?? null : null,
      publishedFailure: index.state === 'unavailable' ? incident?.publishedFailure ?? null : index.operation?.failure ?? null };
  } else if (incident && recovery && index.state === 'fresh' && utcMillis(recovery.verifiedAt) > utcMillis(incident.startedAt) &&
      (incident.verifiedAt === null || utcMillis(recovery.verifiedAt) > utcMillis(incident.verifiedAt))) {
    state = { phase: 'recovered', alerts: [], startedAt: incident.startedAt, verifiedAt: recovery.verifiedAt,
      scheduledFailure: null, publishedFailure: null };
  } else {
    return { comment: null, create: false, target: previous?.phase === 'recovered' ? 'closed' : null, reason: 'no-verified-transition' };
  }
  const create = !issue;
  const comment = sameState(previous, state) ? null : renderIssue(observation, state);
  return { create, comment, target: state.phase === 'active' ? 'open' : 'closed', reason: comment ? state.phase : 'unchanged' };
}

function diagnostic(failure) {
  if (!failure) return 'Cause unavailable in the recorded evidence';
  const parts = [failure.category, ...(failure.stage ? [failure.stage] : []), ...failure.codes];
  if (failure.status) parts.push(`HTTP ${failure.status}`);
  return parts.join(' · ');
}

function evidenceLines({ at, index, schedule, recovery }) {
  const value = (v) => v ?? 'Unavailable';
  const last = schedule.latest;
  const attempt = schedule.attempt;
  const operation = index.operation;
  const remaining = index.remainingMs ?? null;
  const remainingLabel = remaining === null ? 'Unavailable' : remaining < 0 ? 'Expired' : `${Math.floor(remaining / 3600000)}h ${Math.floor(remaining / 60000) % 60}m`;
  return [
    `- Observed at ${at} (UTC)`,
    `- Index state **${index.state}** · Last successful record verification ${value(index.lastVerifiedAt)}`,
    `- Official MEMEDIFF checkedAt ${value(index.verifiedAt)} · 48-hour expiry ${value(index.expiresAt)} · Remaining ${remainingLabel}`,
    `- Total verified records ${value(index.entries)} · Newly verified ${value(index.verified)} · Retained ${value(index.retained)}`,
    last ? `- Latest scheduled Pages run [#${last.id}](${runURL(last.id)}) · Workflow ${last.conclusion} · Index step ${last.refresh}` : '- Latest scheduled Pages run unavailable',
    attempt?.refresh === 'failure' ? `- Confirmed consecutive failed index attempts ${schedule.streak} · [Latest failed index attempt](${runURL(attempt.id)}) · ${diagnostic(attempt.failure)} · ${attempt.artifactURL ? `[Diagnostic artifact](${attempt.artifactURL})` : `Evidence ${attempt.evidence ?? 'unavailable'}`}` : null,
    schedule.status === 'unavailable' ? `- Scheduled history read incomplete (${schedule.error})` : null,
    operation?.outcome === 'retained' ? `- Published snapshot reuse [#${operation.runId}](${runURL(operation.runId)}) · ${diagnostic(operation.failure)}${operation.artifactURL ? ` · [Diagnostic artifact](${operation.artifactURL})` : ' · Evidence published index'}` : null,
    recovery ? `- Confirmed new official verification ${recovery.verifiedAt} · [Publishing Pages run](${runURL(recovery.id)})${recovery.artifactURL ? ` · [Diagnostic artifact](${recovery.artifactURL})` : ''}` : null
  ].filter(Boolean);
}

export function renderIssue(observation, state) {
  const labels = {
    'consecutive-refresh-failures': 'Consecutive scheduled index refresh failures',
    expiring: 'Official verification expires within six hours',
    expired: 'Official verification exceeded 48 hours'
  };
  return [encode(state), '', '@dnfl1999', '', state.phase === 'recovered' ? '### Forks verification recovered'
    : '### ' + state.alerts.map(alert => labels[alert]).join(' · '), '', ...evidenceLines(observation), '',
    'Market lookup and direct GitHub repository analysis remain available independently of the index.'].join('\n');
}

export function renderSummary(observation, mode, transition) {
  const { index, activeFailure, schedule } = observation;
  const scheduled = schedule.attempt?.qa;
  return ['### Index Health Monitor', '', ...evidenceLines(observation), '',
    `- Consecutive refresh failure alert ${activeFailure ? 'active' : 'unconfirmed or inactive'}`,
    `- Verification age alert ${['expiring','expired'].includes(index.state) ? index.state : 'inactive or unavailable'}`,
    `- ${mode} · ${transition}`, '', '#### Published Pages QA', '', ...qaSummary(index.operation?.qa),
    ...(scheduled ? ['', '#### Scheduled refresh attempt QA', '', ...qaSummary(scheduled)] : [])].join('\n');
}

async function allPages(request, path, label) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const items = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { label });
    if (!Array.isArray(items)) throw new MonitorReadError(label, 'invalid response');
    all.push(...items);
    if (items.length < 100) return all;
  }
  throw new MonitorReadError(label, 'pagination limit');
}

export async function syncIssue(request, observation, { write = false } = {}) {
  const issues = await allPages(request, '/issues?state=all', 'Operations issue lookup');
  const candidates = issues.filter(issue => !issue.pull_request && (issue.title === issueTitle || readMarker(issue.body)));
  if (candidates.length > 1) throw new MonitorReadError('Operations issue lookup', 'multiple matching issues');
  const issue = candidates[0];
  let previous = null;
  if (issue) {
    if (issue.user?.login !== bot || issue.locked || !validId(issue.number) || !['open','closed'].includes(issue.state) || !(previous = readMarker(issue.body))) {
      throw new MonitorReadError('Operations issue lookup', 'matching issue is unmanaged or locked');
    }
    const comments = await allPages(request, `/issues/${issue.number}/comments`, 'Operations issue comment lookup');
    comments.sort((a,b) => Number(a.id) - Number(b.id));
    for (const comment of comments) {
      if (comment.user?.login === bot) previous = readMarker(comment.body) ?? previous;
    }
  }
  const plan = planIssue(observation, issue, previous);
  const actions = [];
  let number = issue?.number ?? null;
  if (plan.create) {
    actions.push('create');
    if (write) {
      const created = await request('/issues', { method: 'POST', body: { title: issueTitle, body: plan.comment }, label: 'Operations issue creation' });
      if (!validId(created?.number)) throw new MonitorReadError('Operations issue creation', 'invalid response');
      number = created.number;
    }
  } else if (issue) {
    if (plan.comment) {
      actions.push('comment');
      if (write) await request(`/issues/${number}/comments`, { method: 'POST', body: { body: plan.comment }, label: 'Operations issue update' });
    }
    if (plan.target && issue.state !== plan.target) {
      actions.push(plan.target === 'closed' ? 'close' : 'reopen');
      if (write) await request(`/issues/${number}`, { method: 'PATCH', body: { state: plan.target }, label: 'Operations issue state update' });
    }
  }
  return { mode: write ? 'publish' : 'read-only', actions, reason: plan.reason, url: number ? `${repoURL}/issues/${number}` : null };
}
