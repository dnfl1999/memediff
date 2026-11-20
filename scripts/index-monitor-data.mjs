import { utcMillis } from '../src/core.js';
import { associationHealth } from '../src/index-health.js';
import { OFFICIAL_CA, verifyForksCoin } from '../src/token-data.js';

export const repository = 'dnfl1999/memediff';
export const repoURL = `https://github.com/${repository}`;
export const indexURL = 'https://dnfl1999.github.io/memediff/data/forks-index.json';
const api = `https://api.github.com/repos/${repository}`;
const refreshSteps = new Set([
  'Refresh exact-mint associations from official Forks API',
  'Prepare exact-mint index for Pages',
  'Prepare exact-mint index and report verification health'
]);
const categories = new Set(['dns', 'tcp', 'tls', 'timeout', 'http', 'forbidden', 'rate-limit', 'network', 'data', 'verification', 'canceled', 'unavailable']);
const stages = new Set(['published-index', 'forks-refresh', 'artifact-write']);
const knownCodes = /^(?:ENOTFOUND|EAI_(?:AGAIN|FAIL|NONAME)|ECONN(?:RESET|REFUSED|ABORTED)|E(?:NET|HOST)(?:DOWN|UNREACH)|EPIPE|ETIMEDOUT|UND_ERR_(?:SOCKET|(?:CONNECT|HEADERS|BODY)_TIMEOUT)|ERR_(?:TLS|SSL)_[A-Z_]{1,55}|CERT_[A-Z_]{1,55}|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT(?:_LOCALLY)?)$/;

export const validId = value => /^[1-9]\d{0,19}$/.test(String(value));
export const runURL = id => `${repoURL}/actions/runs/${id}`;
const iso = time => new Date(time).toISOString();

export class MonitorReadError extends Error {
  constructor(source, status) {
    super(`${source}: ${status}`);
    this.name = 'MonitorReadError';
    this.signal = status;
  }
}

export function monitorClient({ fetcher = fetch, token } = {}) {
  return async function request(path, { method = 'GET', body, text = false, label = 'GitHub API' } = {}) {
    const isIndex = path === indexURL;
    if (!isIndex && (!path.startsWith('/') || path.startsWith('//'))) throw new MonitorReadError(label, 'invalid path');
    const headers = { Accept: 'application/vnd.github+json' };
    if (!isIndex && token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetcher(isIndex ? indexURL : api + path, { method, headers,
        body: body ? JSON.stringify(body) : undefined, redirect: text ? 'follow' : 'error', signal: AbortSignal.timeout(12000) });
    } catch (error) {
      throw new MonitorReadError(label, error?.name === 'TimeoutError' ? 'timeout' : 'network error');
    }
    if (!response.ok) throw new MonitorReadError(label, `HTTP ${response.status}`);
    try { return text ? await response.text() : await response.json(); }
    catch { throw new MonitorReadError(label, 'invalid response'); }
  };
}

const readCode = error => error instanceof MonitorReadError ? error.signal : 'invalid response';

export function sanitizeFailure(failure) {
  if (!categories.has(failure?.category)) return null;
  return {
    stage: stages.has(failure.stage) ? failure.stage : null,
    category: failure.category,
    codes: Array.isArray(failure.codes) ? [...new Set(failure.codes.filter(code => typeof code === 'string' && knownCodes.test(code)))].slice(0, 5).sort() : [],
    status: Number.isInteger(failure.status) && failure.status >= 400 && failure.status <= 599 ? failure.status : null
  };
}

export function failureFromLog(log) {
  for (const line of log.split(/\r?\n/).reverse()) {
    const start = line.indexOf('{"event":"index-refresh-failed"');
    if (start === -1) continue;
    try {
      const record = JSON.parse(line.slice(start));
      const failure = sanitizeFailure(record.failure ?? record);
      if (failure) return failure;
    } catch { /* Logs may contain incomplete lines. */ }
  }
  if (/LookupError: Source unavailable: a network or browser CORS failure prevented access\./.test(log)) {
    return sanitizeFailure({ category: 'network' });
  }
  return null;
}

function parsePublishedIndex(index, now) {
  const invalid = () => { throw new MonitorReadError('Published index', 'invalid response'); };
  const health = associationHealth(OFFICIAL_CA, index, now);
  if (!health.record || health.record.repo !== repository || !index.entries.length || index.entries.length > 200) invalid();
  const seen = new Set();
  let latest = 0;
  for (const entry of index.entries) {
    const at = utcMillis(entry?.checkedAt);
    let validated;
    try { validated = verifyForksCoin(entry?.mint, {ok: true, coin: entry}, entry?.checkedAt); }
    catch { invalid(); }
    if (!validated || validated.source !== entry.source || seen.has(entry.mint) || !Number.isFinite(at) || at > utcMillis(index.checkedAt)) invalid();
    seen.add(entry.mint);
    latest = Math.max(latest, at);
  }
  const attempt = index.operation;
  const attemptAt = utcMillis(attempt?.at);
  const operation = validId(attempt?.runId) && attempt.indexCheckedAt === index.checkedAt &&
    attemptAt >= utcMillis(index.checkedAt) && attemptAt <= now && ['retained', 'refreshed'].includes(attempt.outcome)
    ? { runId: String(attempt.runId), at: attempt.at, outcome: attempt.outcome, failure: sanitizeFailure(attempt.failure) }
    : null;
  const count = value => Number.isInteger(value) && value >= 0 && value <= seen.size ? value : null;
  const verified = operation?.outcome === 'retained' ? 0 : count(index.coverage?.verified);
  const retained = operation?.outcome === 'retained' ? seen.size : count(index.coverage?.retained);
  return { state: health.state, checkedAt: index.checkedAt, lastVerifiedAt: iso(latest), verifiedAt: health.record.checkedAt,
    expiresAt: iso(health.expiresAt), entries: seen.size, verified, retained, remainingMs: health.remainingMs, operation };
}

const knownRun = run => validId(run?.id) && run.path === '.github/workflows/pages.yml' && run.head_branch === 'main' &&
  run.status === 'completed' && Number.isFinite(utcMillis(run.created_at));
const beforeRunEnds = (reportedIndex, run) => {
  const verifiedAt = utcMillis(reportedIndex.verifiedAt), operationAt = utcMillis(reportedIndex.operation.at);
  return verifiedAt >= utcMillis(run.run_started_at ?? run.created_at) && operationAt <= utcMillis(run.updated_at);
};

function refreshStep(jobs) {
  const verify = jobs.find(job => job.name === 'verify');
  const step = verify?.steps?.find(step => refreshSteps.has(step.name));
  return { jobId: verify?.id, state: ['failure', 'success'].includes(step?.conclusion) ? step.conclusion : 'not-run' };
}

async function readJobs(request, id) {
  const result = await request(`/actions/runs/${id}/jobs?filter=latest&per_page=100`, { label: 'Pages jobs' });
  if (!Array.isArray(result?.jobs)) throw new MonitorReadError('Pages jobs', 'invalid response');
  return result.jobs;
}

async function scheduledHealth(request) {
  let latest = null, attempt = null, streak = 0;
  try {
    const result = await request('/actions/workflows/pages.yml/runs?branch=main&event=schedule&status=completed&per_page=10', { label: 'Scheduled Pages runs' });
    if (!Array.isArray(result?.workflow_runs) || result.workflow_runs.some(run => !knownRun(run) || run.event !== 'schedule')) {
      throw new MonitorReadError('Scheduled Pages runs', 'invalid response');
    }
    const runs = result.workflow_runs.slice().sort((a,b) => utcMillis(b.created_at) - utcMillis(a.created_at));
    for (const run of runs) {
      const current = { id: String(run.id), at: Number.isFinite(utcMillis(run.updated_at)) ? run.updated_at : run.created_at,
        conclusion: ['success','failure','cancelled','timed_out','skipped','neutral','action_required','stale','startup_failure'].includes(run.conclusion) ? run.conclusion : 'unknown' };
      if (!latest) latest = { ...current, refresh: 'unknown' };
      const step = refreshStep(await readJobs(request, current.id));
      if (latest.id === current.id) latest.refresh = step.state;
      if (step.state === 'not-run') continue;
      if (!attempt) {
        let failure = null, diagnosticError = null;
        if (step.state === 'failure' && validId(step.jobId)) {
          try { failure = failureFromLog(await request(`/actions/jobs/${step.jobId}/logs`, { text: true, label: 'Pages refresh log' })); }
          catch (error) { diagnosticError = readCode(error); }
        }
        attempt = { ...current, refresh: step.state, failure, diagnosticError };
      }
      if (step.state === 'success') break;
      streak++;
    }
    return { status: 'available', latest, attempt, streak };
  } catch (error) {
    return { status: 'unavailable', error: readCode(error), latest, attempt, streak };
  }
}

async function publishedRecovery(request, index) {
  const id = index.operation?.runId;
  if (index.operation?.outcome !== 'refreshed' || index.verified === 0 || index.verified === null) return null;
  try {
    const run = await request(`/actions/runs/${id}`, { label: 'Published verification run' });
    if (!knownRun(run) || String(run.id) !== id || !beforeRunEnds(index, run)) return null;
    const jobs = await readJobs(request, id);
    if (refreshStep(jobs).state !== 'success' || !jobs.some(job => job.name === 'deploy' && job.conclusion === 'success')) return null;
    return { id, verifiedAt: index.verifiedAt, indexCheckedAt: index.checkedAt };
  } catch { return null; }
}

export async function observeMonitor(request, now = Date.now()) {
  const readIndex = async () => {
    try { return parsePublishedIndex(await request(indexURL, { label: 'Published index' }), now); }
    catch (error) { return { state: 'unavailable', error: readCode(error) }; }
  };
  const [index, schedule] = await Promise.all([readIndex(), scheduledHealth(request)]);
  const recovery = await publishedRecovery(request, index);
  const activeFailure = schedule.streak >= 2 && (!recovery || utcMillis(recovery.verifiedAt) <= utcMillis(schedule.attempt.at));
  return { at: iso(now), index, schedule, recovery, activeFailure };
}
