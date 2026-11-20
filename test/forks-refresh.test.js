import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refreshForksIndex } from '../scripts/forks-refresh.mjs';
import { OFFICIAL_CA, verifiedAssociation, verifyForksCoin } from '../src/token-data.js';

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
  assert.equal(verifiedAssociation(OFFICIAL_CA, result.index, Date.parse(oldAt) + 49 * 3600000).reason, 'stale');
});

test('missing validated fallback leaves the existing site artifact untouched', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run(url => url.hostname.endsWith('github.io') ? json({ ...previous, entries: [] }) :
    url.pathname.endsWith('/recent') ? json({ unrelated: true }) : undefined, { allowDeployedFallback: true }), /Invalid recent/);
  assert.equal(await readFile(f.path, 'utf8'), f.original);
});

test('a transient failure for one nonofficial mint keeps its older verification timestamp', async t => {
  const f = await fixture(t);
  const { index } = await f.run(url => url.searchParams.get('mint') === secondary ? json({}, { status: 503 }) : undefined);
  assert.equal(index.coverage.verified, 1);
  assert.equal(index.coverage.retained, 1);
  assert.equal(index.entries.find(e => e.mint === secondary).checkedAt, oldAt);
  assert.equal(verifiedAssociation(secondary, index, Date.parse(oldAt) + 49 * 3600000).reason, 'stale');
});

test('access or rate denial during coin revalidation preserves the complete prior index', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run(url => url.searchParams.get('mint') === secondary ? json({}, { status: 429 }) : undefined), /429/);
  assert.equal(f.requests.filter(u => u.searchParams.get('mint') === secondary).length, 1);
  assert.equal(await readFile(f.path, 'utf8'), f.original);
});
