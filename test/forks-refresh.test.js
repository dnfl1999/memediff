import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refreshForksIndex, summarizeIndexHealth } from '../scripts/forks-refresh.mjs';
import { OFFICIAL_CA, verifyForksCoin } from '../src/token-data.js';
import { associationHealth } from '../src/index-health.js';

const secondary = '11111111111111111111111111111111';
const coin = (mint, repo = mint === OFFICIAL_CA ? 'dnfl1999/memediff' : 'a/b') => ({ ok: true, coin: { mint, repo, kind: 'forks' } });
const json = (value, init) => new Response(JSON.stringify(value), init);
const oldAt = '2026-01-01T00:00:00.000Z';
const previous = { schema: 2, checkedAt: oldAt, entries: [OFFICIAL_CA, secondary].map(mint => verifyForksCoin(mint, coin(mint), oldAt)) };

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'memediff-index-'));
  const path = join(dir, 'index.json');
  t.after(async () => { await rm(path, { force: true }); await rmdir(dir); });
  const original = JSON.stringify(previous, null, 2) + '\n';
  await writeFile(path, original);
  const entries = [], requests = [];
  const run = (handler, options) => refreshForksIndex({ path, local: previous, log: v => entries.push(v), wait: async () => {},
    fetcher: (raw, request) => {
      const url = new URL(raw);
      requests.push(url);
      const reply = handler(url, request);
      if (reply !== undefined) return reply;
      if (url.hostname.endsWith('github.io')) return json(previous);
      if (url.pathname.endsWith('/recent')) return json({ ok: true, tokens: [{ mint: secondary }] });
      return json(coin(url.searchParams.get('mint')));
    }, ...options });
  return { run, path, dir, original, entries, requests };
}

test('valid Forks data replaces the index once and refreshes only verified timestamps', async t => {
  const f = await fixture(t);
  const result = await f.run(() => undefined);
  assert.equal(result.status, 'refreshed');
  assert.deepEqual(JSON.parse(await readFile(f.path, 'utf8')), result.index);
  assert.deepEqual(await readdir(f.dir), ['index.json']);
  assert.equal(result.index.coverage.verified, 2);
  assert.equal(result.index.coverage.retained, 0);
  assert.ok(result.index.entries.every(e => e.checkedAt > oldAt));
});

for (const [code, category, attempts] of [
  ['EAI_AGAIN', 'dns', 2], ['ENOTFOUND', 'dns', 1], ['ECONNREFUSED', 'tcp', 2],
  ['CERT_HAS_EXPIRED', 'tls', 1], ['UND_ERR_CONNECT_TIMEOUT', 'timeout', 2]
]) {
  test(`${code} is classified, logged without error text and retried only when appropriate`, async t => {
    const f = await fixture(t);
    await assert.rejects(f.run(url => {
      if (url.pathname.endsWith('/recent')) throw new TypeError('secret', { cause: { code, message: 'sensitive detail' } });
    }));
    assert.equal(await readFile(f.path, 'utf8'), f.original);
    const errors = f.entries.filter(e => e.event === 'request-error');
    assert.equal(errors.length, attempts);
    assert.ok(errors.every(e => e.category === category && e.codes.includes(code) && Number.isFinite(Date.parse(e.at))));
    assert.doesNotMatch(JSON.stringify(f.entries), /secret|sensitive detail/);
  });
}

test('an actual elapsed request timeout aborts and is retried once', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run((url, { signal }) => {
    if (url.pathname.endsWith('/recent')) return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  }, { timeout: 5 }), /timed out/i);
  assert.equal(f.entries.filter(e => e.event === 'request-error' && e.category === 'timeout').length, 2);
  assert.equal(f.requests.filter(u => u.pathname.endsWith('/recent')).length, 2);
});

test('a transient 503 can be followed by an actual successful index refresh', async t => {
  const f = await fixture(t);
  let attempt = 0;
  const result = await f.run(url => {
    if (url.pathname.endsWith('/recent') && ++attempt === 1) return json({}, { status: 503 });
  });
  assert.equal(attempt, 2);
  assert.equal(result.status, 'refreshed');
  assert.equal(result.index.coverage.verified, 2);
});

for (const [status, attempts, headers] of [[403, 1], [429, 1], [503, 2], [503, 1, { 'retry-after': '120' }]]) {
  test(`HTTP ${status} uses the allowed attempt count and leaves the prior file intact`, async t => {
    const f = await fixture(t);
    await assert.rejects(f.run(url => {
      if (url.pathname.endsWith('/recent')) return json({}, { status, headers });
    }));
    assert.equal(f.requests.filter(u => u.pathname.endsWith('/recent')).length, attempts);
    assert.equal(f.entries.find(e => e.event === 'request-error').status, status);
    assert.equal(await readFile(f.path, 'utf8'), f.original);
  });
}

test('code deploy can reuse the validated published index with original timestamps during revalidation failure', async t => {
  const f = await fixture(t);
  const handler = url => url.searchParams.get('mint') === OFFICIAL_CA ? json(coin(OFFICIAL_CA, 'a/b')) : undefined;
  await assert.rejects(f.run(handler), /reverified/);
  const result = await f.run(handler, { allowDeployedFallback: true });
  assert.equal(result.status, 'retained-published-index');
  assert.equal(await readFile(f.path, 'utf8'), f.original);
  assert.equal(associationHealth(OFFICIAL_CA, result.index, Date.parse(oldAt) + 49 * 3600000).state, 'expired');
});

test('missing validated fallback leaves the existing site artifact untouched', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run(url => url.hostname.endsWith('github.io') ? json({ ...previous, entries: [] }) : undefined,
    { allowDeployedFallback: true }), /Published index failed validation/);
  assert.equal(f.requests.length, 1);
  assert.equal(await readFile(f.path, 'utf8'), f.original);
});

test('a transient failure for one nonofficial mint keeps its older verification timestamp', async t => {
  const f = await fixture(t);
  const { index } = await f.run(url => url.searchParams.get('mint') === secondary ? json({}, { status: 503 }) : undefined);
  assert.equal(index.coverage.verified, 1);
  assert.equal(index.coverage.retained, 1);
  assert.equal(index.entries.find(e => e.mint === secondary).checkedAt, oldAt);
  assert.equal(associationHealth(secondary, index, Date.now()).state, 'expired');
});

test('access or rate denial during coin revalidation preserves the complete prior index', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run(url => url.searchParams.get('mint') === secondary ? json({}, { status: 429 }) : undefined), /429/);
  assert.equal(f.requests.filter(u => u.searchParams.get('mint') === secondary).length, 1);
  assert.equal(await readFile(f.path, 'utf8'), f.original);
});

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mintFor = n => '1'.repeat(30) + alphabet[Math.floor(n / 58)] + alphabet[n % 58];
const public117 = { ...previous, entries: [...previous.entries,
  ...Array.from({ length: 115 }, (_, i) => { const mint = mintFor(i + 256); return verifyForksCoin(mint, coin(mint), oldAt); })] };
const checkedIn27 = { ...previous, entries: public117.entries.slice(0,27) };

test('deployment failure preserves all 117 public entries and timestamps and records the actual operations reason', async t => {
  const f = await fixture(t);
  const result = await f.run(url => {
    if (url.hostname.endsWith('github.io')) return json(public117);
    if (url.pathname.endsWith('/recent')) throw new TypeError('fetch failure', { cause: { code: 'ENOTFOUND' } });
    assert.fail('unexpected request after DNS failure');
  }, { allowDeployedFallback: true, local: checkedIn27, runId: '44660317318' });
  const {operation,...snapshot} = JSON.parse(await readFile(f.path,'utf8'));
  assert.deepEqual(snapshot, public117);
  assert.equal(operation.failure.category, 'dns');
  assert.deepEqual(operation.failure.codes, ['ENOTFOUND']);
  assert.equal(operation.indexCheckedAt, oldAt);
  assert.equal(result.freshlyVerified, 0);
  assert.equal(result.retainedCount,117);
  assert.equal(result.health.counts.expired,117);
  assert.equal(result.health.lastVerifiedAt,oldAt);
  assert.equal(result.health.nextExpiry,null);
});

test('a fetch failure of the public index prevents any overwrite using only local history', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run(url => url.hostname.endsWith('github.io') ? json({}, {status:403}) : assert.fail('must stop before a replacement'),
    {local:checkedIn27,allowDeployedFallback:true}), error => error.refresh?.failure.stage === 'published-index');
  assert.equal(await readFile(f.path,'utf8'), f.original);
});

test('partial upstream shapes preserve previous entries; a later successful response verifies anew', async t => {
  const f = await fixture(t);
  const options = { runId:'44660317318', local:checkedIn27 };
  const partial = await f.run(url => url.hostname.endsWith('github.io') ? json(public117) :
    url.searchParams.has('mint') && url.searchParams.get('mint') !== OFFICIAL_CA ? json({ok:true,coin:{kind:'forks'}}) : undefined, options);
  assert.equal(partial.retainedCount,116);
  assert.equal(partial.freshlyVerified,1);
  assert.equal(partial.index.entries.length,117);
  assert.equal(partial.health.counts.expired,116);
  const recovered = await f.run(url => url.hostname.endsWith('github.io') ? json(partial.index) : undefined,options);
  assert.equal(recovered.index.entries.length,117);
  assert.equal(recovered.freshlyVerified,117);
  assert.equal(recovered.retainedCount,0);
  assert.equal(recovered.index.operation.outcome,'refreshed');
  assert.equal(recovered.index.operation.failure,undefined);
});

test('index summary separates partial expiry, next expiry and the official expiry',()=>{
  const now=Date.parse('2026-11-20T00:00:00.000Z');
  const checkedAt=new Date(now).toISOString();
  const index={checkedAt,entries:[
    {...previous.entries[0],checkedAt:new Date(now-43*3600000).toISOString()},
    {...previous.entries[1],checkedAt:new Date(now-3600000).toISOString()}, public117.entries[2]]};
  const summary=summarizeIndexHealth(index,now);
  assert.deepEqual(summary.counts,{fresh:1,expiring:1,expired:1,invalid:0});
  assert.equal(summary.official.state,'expiring');
  assert.equal(summary.official.expiresAt,'2026-11-20T05:00:00.000Z');
  assert.equal(summary.nextExpiry,summary.official.expiresAt);
});
