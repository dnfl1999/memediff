import { parseToken, utcMillis } from './core.js';
import { MAX_ASSOCIATION_AGE, verifyForksCoin } from './token-data.js';

export const EXPIRING_WITHIN = 6 * 60 * 60 * 1000;

export function verificationWindow(checkedAt, now = Date.now()) {
  const verified = utcMillis(checkedAt);
  if (!Number.isFinite(verified) || !Number.isFinite(now) || verified > now) return null;
  const expiresAt = verified + MAX_ASSOCIATION_AGE;
  const remainingMs = expiresAt - now;
  const state = remainingMs < 0 ? 'expired' : remainingMs <= EXPIRING_WITHIN ? 'expiring' : 'fresh';
  return { state, ageMs: now - verified, remainingMs, expiresAt };
}

export function associationHealth(input, index, now = Date.now()) {
  const mint = parseToken(input);
  if (index?.schema !== 2 || !Array.isArray(index.entries)) return { state: 'unavailable' };
  const entries = index.entries.filter(entry => entry?.mint === mint);
  if (!entries.length) return { state: 'not-indexed' };
  if (entries.length !== 1) return { state: 'ambiguous' };
  const [entry] = entries;
  const record = verifyForksCoin(mint, { ok: true, coin: entry }, entry.checkedAt);
  const window = verificationWindow(entry.checkedAt, now);
  const indexTime = utcMillis(index.checkedAt);
  if (!record || record.source !== entry.source || !window || !Number.isFinite(indexTime) || indexTime > now ||
      utcMillis(entry.checkedAt) > indexTime) return { state: 'invalid' };
  return { ...window, record };
}

const failureLabels = {
  dns: 'DNS resolution failure', tcp: 'TCP connection failure', tls: 'TLS failure',
  timeout: 'request timeout', http: 'HTTP error', forbidden: 'access denied', 'rate-limit': 'rate limit',
  network: 'network failure', data: 'incomplete response', verification: 'association verification failure',
  canceled: 'canceled request', unavailable: 'source unavailable'
};

export function recordedRefreshFailure(index, now = Date.now()) {
  const operation = index?.operation;
  if (index?.schema !== 2 || !Array.isArray(index.entries) || operation?.outcome !== 'retained' ||
      operation.indexCheckedAt !== index.checkedAt || typeof operation.runId !== 'string' || !/^[1-9]\d{0,19}$/.test(operation.runId)) return null;
  const at = utcMillis(operation.at), last = utcMillis(index.checkedAt);
  if (!Number.isFinite(at) || !Number.isFinite(last) || at < last || at > now) return null;
  const failure = operation.failure;
  if (!failure || !Object.hasOwn(failureLabels, failure.category)) return null;
  const status = Number.isInteger(failure.status) && failure.status >= 400 && failure.status <= 599 ? ` (HTTP ${failure.status})` : '';
  return { at: operation.at, reason: failureLabels[failure.category] + status,
    url: `https://github.com/dnfl1999/memediff/actions/runs/${operation.runId}` };
}
