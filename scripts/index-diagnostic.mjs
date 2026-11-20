import { utcMillis } from '../src/core.js';
import { exact, validQa } from './qa-diagnostic.mjs';

export const diagnosticFile = 'index-diagnostic.json';
export const maxDiagnosticBytes = 8192;
export const maxDiagnosticArchiveBytes = 16384;
export const diagnosticName = attempt => `pages-index-diagnostic-attempt-${attempt}`;
export const pagesWorkflow = 'Verify and deploy Pages';
const categories = new Set(['dns', 'tcp', 'tls', 'timeout', 'http', 'forbidden', 'rate-limit', 'network', 'data', 'verification', 'canceled', 'unavailable']);
const failureStages = new Set(['published-index', 'forks-refresh', 'artifact-write']);
const knownCodes = /^(?:ENOTFOUND|EAI_(?:AGAIN|FAIL|NONAME)|ECONN(?:RESET|REFUSED|ABORTED)|E(?:NET|HOST)(?:DOWN|UNREACH)|EPIPE|ETIMEDOUT|UND_ERR_(?:SOCKET|(?:CONNECT|HEADERS|BODY)_TIMEOUT)|ERR_(?:TLS|SSL)_[A-Z_]{1,55}|CERT_[A-Z_]{1,55}|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT(?:_LOCALLY)?)$/;

export function sanitizeFailure(failure) {
  if (!categories.has(failure?.category)) return null;
  return {
    stage: failureStages.has(failure.stage) ? failure.stage : null,
    category: failure.category,
    codes: Array.isArray(failure.codes) ? [...new Set(failure.codes.filter(code => typeof code === 'string' && knownCodes.test(code)))].slice(0, 5).sort() : [],
    status: Number.isInteger(failure.status) && failure.status >= 400 && failure.status <= 599 ? failure.status : null
  };
}

const timestamp = value => Number.isFinite(utcMillis(value));
const count = value => Number.isInteger(value) && value >= 0 && value <= 200;
const id = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
export const diagnosticRunURL = runId => `https://github.com/dnfl1999/memediff/actions/runs/${runId}`;

function validFailure(failure) {
  if (failure === null) return true;
  if (!exact(failure, ['stage', 'category', 'codes', 'status'])) return false;
  const safe = sanitizeFailure(failure);
  return !!safe && safe.stage === failure.stage && safe.status === failure.status && JSON.stringify(safe.codes) === JSON.stringify(failure.codes);
}

function validForks(forks) {
  if (!exact(forks, ['state', 'observedAt', 'newlyVerified', 'retained', 'latestVerifiedAt', 'officialVerifiedAt', 'failure'])) return false;
  if (forks.state === 'not-run' || forks.state === 'unavailable') {
    return [forks.observedAt, forks.newlyVerified, forks.retained, forks.latestVerifiedAt, forks.officialVerifiedAt, forks.failure].every(value => value === null);
  }
  if (!['refreshed', 'retained', 'failed'].includes(forks.state) || !timestamp(forks.observedAt) || !count(forks.newlyVerified) ||
      (forks.retained !== null && !count(forks.retained)) || forks.newlyVerified + (forks.retained ?? 0) > 200 || !validFailure(forks.failure)) return false;
  const hasTimes = timestamp(forks.latestVerifiedAt) && timestamp(forks.officialVerifiedAt) &&
    utcMillis(forks.officialVerifiedAt) <= utcMillis(forks.latestVerifiedAt) && utcMillis(forks.latestVerifiedAt) <= utcMillis(forks.observedAt);
  if (forks.state === 'refreshed') return forks.newlyVerified > 0 && forks.retained !== null && hasTimes && forks.failure === null;
  if (forks.state === 'retained') return forks.newlyVerified === 0 && forks.retained > 0 && hasTimes && forks.failure !== null;
  return forks.newlyVerified === 0 && (hasTimes || (forks.latestVerifiedAt === null && forks.officialVerifiedAt === null));
}

function parseCanonical(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > maxDiagnosticBytes) return null;
  try {
    const value = JSON.parse(raw);
    return [JSON.stringify(value), JSON.stringify(value, null, 2)].includes(raw.trim()) ? value : null;
  } catch { return null; }
}

export function parseDiagnostic(raw) {
  const value = parseCanonical(raw);
  const keys = ['schemaVersion', 'runId', 'runAttempt', 'workflow', 'event', 'recordedAt', 'actionsURL', 'stages', 'forks'];
  if (value?.schemaVersion === 2) keys.push('qa');
  if (!exact(value, keys) ||
      ![1, 2].includes(value.schemaVersion) || !id(value.runId) || !Number.isInteger(value.runAttempt) || value.runAttempt < 1 || value.runAttempt > 1000 ||
      value.workflow !== pagesWorkflow || !['push', 'pull_request', 'schedule', 'workflow_dispatch'].includes(value.event) ||
      !timestamp(value.recordedAt) || value.actionsURL !== diagnosticRunURL(value.runId) ||
      !exact(value.stages, ['verify', 'deploy', 'publicQA']) || Object.values(value.stages).some(status => !stageResults.has(status)) ||
      !validForks(value.forks) || (value.forks.observedAt !== null && utcMillis(value.forks.observedAt) > utcMillis(value.recordedAt)) ||
      (value.schemaVersion === 2 && !validQa(value.qa, value))) return null;
  return value;
}

const stageResults = new Set(['success', 'failure', 'cancelled', 'not-run', 'unavailable']);
export function diagnosticStage(status) {
  if (status === 'skipped') return 'not-run';
  if (status === 'timed_out' || status === 'startup_failure') return 'failure';
  return stageResults.has(status) ? status : 'unavailable';
}

const emptyForks = state => ({ state, observedAt: null, newlyVerified: null, retained: null,
  latestVerifiedAt: null, officialVerifiedAt: null, failure: null });

export function forkDiagnostic({ state, health, failure, newlyVerified = 0, retained = null, at = new Date().toISOString() }) {
  const record = { state, observedAt: at, newlyVerified, retained, latestVerifiedAt: health?.lastVerifiedAt ?? null,
    officialVerifiedAt: health?.official?.verifiedAt ?? null, failure: sanitizeFailure(failure) };
  return validForks(record) ? record : emptyForks('unavailable');
}

export function buildDiagnostic({ runId, runAttempt, workflow, event, stages, refreshOutcome, refreshData, qa, now = new Date().toISOString() }) {
  const fromStep = parseCanonical(refreshData);
  const attempted = ['success', 'failure', 'cancelled'].includes(refreshOutcome);
  const skipped = refreshOutcome === 'skipped' || (!refreshOutcome && (event === 'pull_request' || stages.verify === 'skipped'));
  let forks = emptyForks(skipped ? 'not-run' : 'unavailable');
  if (attempted && validForks(fromStep) && ((refreshOutcome === 'failure' && fromStep.state === 'failed') ||
      (refreshOutcome === 'success' && ['refreshed', 'retained'].includes(fromStep.state))) &&
      utcMillis(fromStep.observedAt) <= utcMillis(now)) forks = fromStep;
  const value = { schemaVersion: qa === undefined ? 1 : 2, runId, runAttempt, workflow, event, recordedAt: now,
    actionsURL: diagnosticRunURL(runId), stages: { verify: diagnosticStage(stages.verify), deploy: diagnosticStage(stages.deploy),
      publicQA: diagnosticStage(stages.publicQA) }, forks };
  if (qa !== undefined) value.qa = qa;
  if (!parseDiagnostic(JSON.stringify(value) + '\n')) throw new Error('Diagnostic run metadata is invalid or exceeds the size limit.');
  return value;
}
