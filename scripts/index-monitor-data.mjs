import { utcMillis } from '../src/core.js';
import { associationHealth } from '../src/index-health.js';
import { OFFICIAL_CA, verifyForksCoin } from '../src/token-data.js';
import { diagnosticName, diagnosticStage, maxDiagnosticArchiveBytes, sanitizeFailure } from './index-diagnostic.mjs';
import { readDiagnosticArchive } from './index-diagnostic-archive.mjs';
import { qaChecks, qaMatchesStep } from './qa-diagnostic.mjs';
export { sanitizeFailure } from './index-diagnostic.mjs';

export const repository = 'dnfl1999/memediff';
export const repoURL = `https://github.com/${repository}`;
export const indexURL = 'https://dnfl1999.github.io/memediff/data/forks-index.json';
const api = `https://api.github.com/repos/${repository}`;
const refreshSteps = new Set([
  'Refresh exact-mint associations from official Forks API',
  'Prepare exact-mint index for Pages',
  'Prepare exact-mint index and report verification health'
]);

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
  let rateLimit;
  return async function request(path, { method = 'GET', body, text = false, binary = false, label = 'GitHub API' } = {}) {
    const isIndex = path === indexURL;
    if (!isIndex && (!path.startsWith('/') || path.startsWith('//'))) throw new MonitorReadError(label, 'invalid path');
    if (!isIndex && rateLimit) throw new MonitorReadError(label, rateLimit);
    const headers = { Accept: 'application/vnd.github+json' };
    if (!isIndex && token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetcher(isIndex ? indexURL : api + path, { method, headers,
        body: body ? JSON.stringify(body) : undefined, redirect: text || binary ? 'follow' : 'error', signal: AbortSignal.timeout(12000) });
    } catch (error) {
      throw new MonitorReadError(label, error?.name === 'TimeoutError' ? 'timeout' : 'network error');
    }
    if (!response.ok) {
      const status = `HTTP ${response.status}`;
      if (!isIndex && (response.status === 429 || (response.status === 403 &&
          (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after'))))) rateLimit = status;
      throw new MonitorReadError(label, status);
    }
    try { return binary ? await readArchiveBody(response) : text ? await response.text() : await response.json(); }
    catch { throw new MonitorReadError(label, 'invalid response'); }
  };
}

async function readArchiveBody(response) {
  if (Number(response.headers.get('content-length')) > maxDiagnosticArchiveBytes) {
    await response.body?.cancel();
    return null;
  }
  const parts = [];
  let size = 0;
  for await (const part of response.body) {
    size += part.byteLength;
    if (size > maxDiagnosticArchiveBytes) return null;
    parts.push(part);
  }
  return Buffer.concat(parts, size);
}

const readCode = error => error instanceof MonitorReadError ? error.signal : 'invalid response';

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
const startedAt = run => utcMillis(run.run_started_at ?? run.created_at);
const withinRun = (at, run) => utcMillis(at) >= startedAt(run) && utcMillis(at) < utcMillis(run.updated_at) + 1000;

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

function matchesRun(record, run, jobs) {
  if (!record || record.runId !== String(run.id) || record.runAttempt !== run.run_attempt || record.event !== run.event ||
      !withinRun(record.recordedAt, run) || (record.forks.observedAt && !withinRun(record.forks.observedAt, run))) return false;
  for (const [field, name] of [['verify', 'verify'], ['deploy', 'deploy'], ['publicQA', 'public-qa']]) {
    const job = jobs.find(item => item.name === name);
    if (record.stages[field] !== diagnosticStage(job ? job.conclusion : 'skipped')) return false;
  }
  if (record.qa) {
    for (const [key, { stage, step }] of Object.entries(qaChecks)) {
      const job = jobs.find(item => item.name === (stage === 'verify' ? 'verify' : 'public-qa'));
      const conclusion = job?.steps?.find(item => item.name === step)?.conclusion;
      const check = record.qa[key];
      if (!qaMatchesStep(check, diagnosticStage(conclusion ?? (job?.conclusion === 'skipped' || !job ? 'skipped' : undefined))) ||
          [check.startedAt, check.completedAt].some(at => at !== null && !withinRun(at, run))) return false;
    }
  }
  const step = refreshStep(jobs).state;
  if (step === 'failure') return record.forks.state === 'failed';
  if (step === 'success') return record.forks.state === 'refreshed' || (record.forks.state === 'retained' && run.event !== 'schedule');
  return false;
}

async function pagesDiagnostic(request, run, jobs, now) {
  if (!Number.isInteger(run.run_attempt) || run.run_attempt < 1) return null;
  const name = diagnosticName(run.run_attempt);
  try {
    const result = await request(`/actions/runs/${run.id}/artifacts?name=${name}&per_page=100`, { label: 'Pages diagnostic list' });
    const candidates = Array.isArray(result?.artifacts) ? result.artifacts.filter(item => item.name === name) : [];
    if (candidates.length !== 1) return null;
    const [artifact] = candidates;
    if (artifact.expired !== false || !(utcMillis(artifact.expires_at) > now) || !validId(artifact.id) ||
        String(artifact.workflow_run?.id) !== String(run.id) || !Number.isInteger(artifact.size_in_bytes) ||
        artifact.size_in_bytes < 1 || artifact.size_in_bytes > maxDiagnosticArchiveBytes) return null;
    // The GitHub REST endpoint controls the signed storage redirect. Artifact-supplied URLs are ignored.
    const bytes = await request(`/actions/artifacts/${artifact.id}/zip`, { binary: true, label: 'Pages diagnostic archive' });
    if (bytes?.length !== artifact.size_in_bytes) return null;
    const record = readDiagnosticArchive(bytes, artifact.digest);
    return matchesRun(record, run, jobs) ? { record, url: `${runURL(run.id)}/artifacts/${artifact.id}` } : null;
  } catch { return null; }
}

async function scheduledFailure(request, run, jobs, step, now) {
  const diagnostic = await pagesDiagnostic(request, run, jobs, now);
  if (diagnostic?.record.forks.failure) return { failure: diagnostic.record.forks.failure, evidence: 'diagnostic artifact',
    artifactURL: diagnostic.url, qa: diagnostic.record.qa };
  if (!validId(step.jobId)) return { failure: null, evidence: 'unavailable' };
  try {
    const failure = failureFromLog(await request(`/actions/jobs/${step.jobId}/logs`, { text: true, label: 'Pages refresh log' }));
    return { failure, evidence: failure ? 'job log' : 'unavailable' };
  } catch (error) { return { failure: null, evidence: 'unavailable', diagnosticError: readCode(error) }; }
}

async function scheduledHealth(request, now) {
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
      const jobs = await readJobs(request, current.id);
      const step = refreshStep(jobs);
      if (latest.id === current.id) latest.refresh = step.state;
      if (step.state === 'not-run') continue;
      if (!attempt) {
        const diagnostic = step.state === 'failure' ? await scheduledFailure(request, run, jobs, step, now) : {};
        attempt = { ...current, refresh: step.state, ...diagnostic };
      }
      if (step.state === 'success') break;
      streak++;
    }
    return { status: 'available', latest, attempt, streak };
  } catch (error) {
    return { status: 'unavailable', error: readCode(error), latest, attempt, streak };
  }
}

async function publishedEvidence(request, index, now) {
  const id = index.operation?.runId;
  if (!id) return { index, recovery: null };
  try {
    const run = await request(`/actions/runs/${id}`, { label: 'Published verification run' });
    if (!knownRun(run) || String(run.id) !== id || !withinRun(index.operation.at, run)) return { index, recovery: null };
    const jobs = await readJobs(request, id);
    if (refreshStep(jobs).state !== 'success' || !jobs.some(job => job.name === 'deploy' && job.conclusion === 'success')) return { index, recovery: null };
    const diagnostic = await pagesDiagnostic(request, run, jobs, now);
    const forks = diagnostic?.record.forks;
    const matchesIndex = forks?.state === index.operation.outcome && forks.officialVerifiedAt === index.verifiedAt &&
      forks.latestVerifiedAt === index.lastVerifiedAt && forks.newlyVerified === index.verified && forks.retained === index.retained;
    if (diagnostic && !matchesIndex) return { index, recovery: null };
    if (matchesIndex) {
      index = { ...index, operation: { ...index.operation, failure: forks.failure, artifactURL: diagnostic.url, qa: diagnostic.record.qa } };
    }
    const recovered = index.operation.outcome === 'refreshed' && index.verified > 0 && withinRun(index.verifiedAt, run);
    const recovery = recovered ? { id, verifiedAt: index.verifiedAt, indexCheckedAt: index.checkedAt,
      ...(matchesIndex ? { artifactURL: diagnostic.url } : {}) } : null;
    return { index, recovery };
  } catch { return { index, recovery: null }; }
}

export async function observeMonitor(request, now = Date.now()) {
  const readIndex = async () => {
    try { return parsePublishedIndex(await request(indexURL, { label: 'Published index' }), now); }
    catch (error) { return { state: 'unavailable', error: readCode(error) }; }
  };
  const [published, schedule] = await Promise.all([readIndex(), scheduledHealth(request, now)]);
  const { index, recovery } = await publishedEvidence(request, published, now);
  const activeFailure = schedule.streak >= 2 && (!recovery || utcMillis(recovery.verifiedAt) <= utcMillis(schedule.attempt.at));
  return { at: iso(now), index, schedule, recovery, activeFailure };
}
