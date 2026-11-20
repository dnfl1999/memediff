import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseToken } from '../src/core.js';
import { LookupError, OFFICIAL_CA, readJSON, verifyForksCoin } from '../src/token-data.js';

const forkAPI = 'https://forks.wiki/api';
const recentURL = `${forkAPI}/tokens/recent`;
const publishedURL = 'https://dnfl1999.github.io/memediff/data/forks-index.json';
const officialRepo = 'dnfl1999/memediff';
const cap = 200;
const temporaryHTTP = new Set([500, 502, 503, 504]);
const dnsCodes = /^(?:ENOTFOUND|EAI_(?:AGAIN|FAIL|NONAME))$/;
const tcpCodes = /^(?:ECONN(?:RESET|REFUSED|ABORTED)|ENET(?:DOWN|UNREACH)|EHOST(?:DOWN|UNREACH)|EPIPE|UND_ERR_SOCKET)$/;
const tlsCodes = /^(?:ERR_(?:TLS|SSL)_[A-Z_]+|CERT_[A-Z_]+|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT(?:_LOCALLY)?)$/;
const timeoutCodes = /^(?:ETIMEDOUT|UND_ERR_(?:CONNECT|HEADERS|BODY)_TIMEOUT)$/;

function networkCodes(error) {
  if (!error) return [];
  return [error.code, ...networkCodes(error.cause), ...(error.errors ?? []).flatMap(networkCodes)]
    .filter(code => typeof code === 'string' && [dnsCodes, tcpCodes, tlsCodes, timeoutCodes].some(pattern => pattern.test(code)));
}

async function request(url, { fetcher, log, signal, wait, timeout }) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await readJSON(url, { fetcher, signal, timeout });
    } catch (error) {
      const codes = error.kind === 'network' ? [...new Set(networkCodes(error.cause))] : [];
      const category = codes.some(code => timeoutCodes.test(code)) ? 'timeout'
        : codes.some(code => dnsCodes.test(code)) ? 'dns'
        : codes.some(code => tlsCodes.test(code)) ? 'tls'
        : codes.some(code => tcpCodes.test(code)) ? 'tcp' : error.kind;
      const transient = category === 'timeout' || category === 'tcp' || category === 'network' || codes.includes('EAI_AGAIN');
      const retry = attempt === 1 && !signal.aborted && !error.retryAfter && (transient || temporaryHTTP.has(error.status));
      const endpoint = new URL(url);
      log({ event: 'request-error', at: new Date().toISOString(), endpoint: endpoint.origin + endpoint.pathname,
        attempt, category, codes, status: error.status ?? null, retry });
      if (!retry) throw error;
      await wait(750, undefined, { signal });
    }
  }
}

function validDate(value) {
  const time = Date.parse(value);
  return typeof value === 'string' && Number.isFinite(time) && new Date(time).toISOString() === value;
}

function indexEntries(index) {
  if (index?.schema !== 2 || !validDate(index.checkedAt) || Date.parse(index.checkedAt) > Date.now() + 60000 ||
      !Array.isArray(index.entries) || index.entries.length > cap) return null;
  const entries = new Map();
  for (const entry of index.entries) {
    try {
      const valid = verifyForksCoin(entry?.mint, { ok: true, coin: entry }, entry?.checkedAt);
      if (!valid || valid.source !== entry.source || entries.has(valid.mint) || !validDate(valid.checkedAt) || valid.checkedAt > index.checkedAt) return null;
      entries.set(valid.mint, entry);
    } catch { return null; }
  }
  return entries.get(OFFICIAL_CA)?.repo === officialRepo ? entries : null;
}

async function writeIndex(path, index) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(temporary, JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function refreshForksIndex({ path, local, allowDeployedFallback = false, fetcher = fetch,
  log = value => console.log(JSON.stringify(value)), wait = delay, timeout = 8000, signal = AbortSignal.timeout(120000) }) {
  const options = { fetcher, log, signal, wait, timeout };
  let published;
  let previous;
  try {
    published = await request(publishedURL, options);
    previous = indexEntries(published);
  } catch { /* The request recorded the reason. A fresh index can still be built. */ }
  const history = new Map([...(indexEntries(local) ?? []), ...(previous ?? [])]);
  const warn = event => log({ ...event, at: new Date().toISOString() });

  async function collect() {
    const recent = await request(recentURL, options);
    if (recent?.ok !== true || !Array.isArray(recent.tokens)) throw new LookupError('data', 'Invalid recent Forks listing.');
    const candidates = new Set([OFFICIAL_CA]);
    for (const item of [...recent.tokens, ...history.values()]) {
      try {
        const mint = parseToken(item?.mint);
        if (mint) candidates.add(mint);
      } catch { /* Invalid candidate addresses are never sent upstream. */ }
    }
    const mints = [...candidates].slice(0, cap);
    const entries = [], failures = [];
    const verify = async mint => {
      const data = await request(`${forkAPI}/coin?mint=${mint}`, options);
      if (data?.ok !== true || !data.coin) throw new LookupError('data', 'Invalid Forks coin response.');
      return verifyForksCoin(mint, data);
    };
    const official = await verify(OFFICIAL_CA);
    if (official?.repo !== officialRepo) throw new LookupError('verification', 'Official MemeDiff association could not be reverified.');
    entries.push(official);

    let cursor = 1, stop, verified = 1;
    async function worker() {
      while (!stop && !signal.aborted && cursor < mints.length) {
        const mint = mints[cursor++];
        try {
          const entry = await verify(mint);
          if (entry) {
            entries.push(entry);
            verified++;
          } else {
            failures.push({ mint, reason: 'No exact forks-kind repository association', retained: false });
          }
        } catch (error) {
          if (error.status === 403 || error.status === 429) stop = error;
          const prior = history.get(mint);
          if (prior) entries.push(prior);
          failures.push({ mint, reason: error.kind ?? 'unavailable', retained: Boolean(prior) });
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (stop) throw stop;
    if (signal.aborted) throw new LookupError('timeout', 'Forks refresh reached its overall deadline.');
    entries.sort((a, b) => a.mint.localeCompare(b.mint));
    failures.sort((a, b) => a.mint.localeCompare(b.mint));
    return {
      schema: 2, checkedAt: new Date().toISOString(), complete: false,
      scope: 'Recent official listings and previous CA history. Retained records preserve their last verification time.',
      sources: [recentURL, `${forkAPI}/coin?mint={CA}`],
      coverage: { recentCount: recent.tokens.length, candidateCount: candidates.size, attempted: mints.length,
        verified, retained: entries.length - verified, cap, capped: candidates.size > cap, pagination: 'Unconfirmed' },
      warnings: previous ? [] : ['Published index unavailable or invalid. The checked-in history was used.'],
      failures, entries
    };
  }

  let index;
  let status = 'refreshed';
  try {
    index = await collect();
    if (!indexEntries(index)) throw new LookupError('verification', 'Generated index failed validation.');
  } catch (error) {
    warn({ event: 'index-refresh-failed', category: error.kind ?? 'unavailable', status: error.status ?? null });
    if (!allowDeployedFallback || !previous) throw error;
    index = published;
    status = 'retained-published-index';
  }

  await writeIndex(path, index);
  warn({ event: 'index-result', status, checkedAt: index.checkedAt, coverage: index.coverage, entryCount: index.entries.length });
  return { status, index };
}
