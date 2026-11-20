import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { buildDiagnostic, diagnosticFile, diagnosticName, forkDiagnostic, maxDiagnosticBytes, parseDiagnostic } from '../scripts/index-diagnostic.mjs';
import { diagnosticChecksum, readDiagnosticArchive } from '../scripts/index-diagnostic-archive.mjs';
import { indexURL, monitorClient, observeMonitor } from '../scripts/index-monitor-data.mjs';
import { renderSummary, syncIssue } from '../scripts/index-monitor-issues.mjs';
import { emptyQa, qaChecks } from '../scripts/qa-diagnostic.mjs';
import { OFFICIAL_CA, verifyForksCoin } from '../src/token-data.js';

const iso = millis => new Date(millis).toISOString();
const hour = 3600000;
const now = Date.parse('2026-11-20T09:00:00Z');
const oldTime = iso(now - 31 * hour);
const refreshTime = iso(now - hour + 1000);
const healthy = { lastVerifiedAt: refreshTime, official: { verifiedAt: refreshTime } };
const retained = { lastVerifiedAt: oldTime, official: { verifiedAt: oldTime } };
const dns = { stage: 'forks-refresh', category: 'dns', codes: ['ENOTFOUND'], status: null };
const origin = { runId: '77', runAttempt: 2, workflow: 'Verify and deploy Pages', event: 'schedule', now: iso(now - hour + 4000) };
const failures = { verify: 'failure', deploy: 'skipped', publicQA: 'skipped' };
const success = { verify: 'success', deploy: 'success', publicQA: 'success' };
function record({ state = 'failed', data, stages = failures, refreshOutcome = state === 'failed' ? 'failure' : 'success', ...options } = {}) {
  const fork = data ?? forkDiagnostic({ state, at: refreshTime, health: state === 'refreshed' ? healthy : retained,
    failure: state === 'refreshed' ? null : dns, newlyVerified: state === 'refreshed' ? 1 : 0, retained: state === 'refreshed' ? 0 : 117 });
  return buildDiagnostic({ ...origin, ...options, stages, refreshOutcome, refreshData: JSON.stringify(fork) });
}

function zip(raw, { name = diagnosticFile, compressed = true, stream = true } = {}) {
  const data = Buffer.from(raw), filename = Buffer.from(name), packed = compressed ? deflateRawSync(data) : data;
  const flags = stream ? 8 : 0, method = compressed ? 8 : 0, crc = diagnosticChecksum(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(flags, 6); local.writeUInt16LE(method, 8); local.writeUInt16LE(filename.length, 26);
  if (!stream) { local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); }
  const descriptor = Buffer.alloc(stream ? 16 : 0);
  if (stream) { descriptor.writeUInt32LE(0x08074b50); descriptor.writeUInt32LE(crc, 4); descriptor.writeUInt32LE(packed.length, 8); descriptor.writeUInt32LE(data.length, 12); }
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(flags, 8); central.writeUInt16LE(method, 10); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length + packed.length + descriptor.length, 16);
  return Buffer.concat([local, filename, packed, descriptor, central, filename, end]);
}
const archive = (value, options) => zip(JSON.stringify(value, null, 2) + '\n', options);
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

test('records a successful refresh independently of a failed or unrun Pages deploy', () => {
  const value = record({state:'refreshed',stages:{verify:'success',deploy:'failure',publicQA:'skipped'}});
  assert.equal(value.forks.state,'refreshed');
  assert.equal(value.forks.newlyVerified,1);
  assert.deepEqual(value.stages,{verify:'success',deploy:'failure',publicQA:'not-run'});
  assert.equal(value.actionsURL,'https://github.com/dnfl1999/memediff/actions/runs/77');
});

test('records a failed refresh and a successful fallback deployment with the prior verification untouched', () => {
  assert.equal(record().forks.state,'failed');
  assert.deepEqual(record().stages,{verify:'failure',deploy:'not-run',publicQA:'not-run'});
  const reused = record({state:'retained',stages:success,event:'push'});
  assert.equal(reused.stages.deploy,'success');
  assert.equal(reused.forks.newlyVerified,0);
  assert.equal(reused.forks.retained,117);
  assert.equal(reused.forks.officialVerifiedAt,oldTime);
  assert.deepEqual(reused.forks.failure,dns);
});

test('timeout, HTTP 403/429/5xx and unknown prior records preserve only confirmed values', () => {
  const causes = [{ category:'timeout', codes:['UND_ERR_CONNECT_TIMEOUT'] },
    { category:'forbidden',status:403 }, { category:'rate-limit',status:429 }, { category:'http',status:503 }];
  for (const cause of causes) {
    const result = record({data:forkDiagnostic({state:'failed',at:refreshTime,failure:{...cause,stage:'forks-refresh',token:'secret',stack:'private'}})});
    assert.equal(result.forks.failure.category,cause.category);
    assert.equal(result.forks.failure.status,cause.status??null);
    assert.equal(result.forks.latestVerifiedAt,null);
    assert.equal(result.forks.retained,null);
    assert.doesNotMatch(JSON.stringify(result),/secret|private/);
  }
});

test('missing stages and malformed outputs are not run or unavailable without invented values', () => {
  for (const [outcome,state] of [['skipped','not-run'],['success','unavailable'],['failure','unavailable'],['cancelled','unavailable'],[undefined,'unavailable']]) {
    const result=buildDiagnostic({...origin,stages:{},refreshOutcome:outcome,refreshData:'{"credential":"secret"}'});
    assert.equal(result.forks.state,state);
    assert.equal(result.forks.newlyVerified,null);
    assert.equal(result.stages.deploy,'unavailable');
    assert.doesNotMatch(JSON.stringify(result),/credential|secret/);
  }
});

test('strict JSON rejects over-size, duplicate keys, wrong schemas, bad URLs and nested unknown fields', () => {
  const good=record(), raw=JSON.stringify(good);
  assert.deepEqual(parseDiagnostic(raw),good);
  assert.equal(parseDiagnostic(' '.repeat(maxDiagnosticBytes)+raw),null);
  assert.equal(parseDiagnostic(raw.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1')),null);
  for (const value of [{...good,schemaVersion:2},{...good,actionsURL:'https://example.test/'},{...good,runAttempt:0},
    {...good,forks:{...good.forks,auth:'private'}},{...good,forks:{...good.forks,retained:-1}},
    {...good,forks:{...good.forks,observedAt:'2026-11-31T00:00:00Z'}}, {...good,forks:{...good.forks,failure:{...dns,codes:['private']}}}]) {
    assert.equal(parseDiagnostic(JSON.stringify(value)),null);
  }
});

test('ZIP validator accepts one bounded file, verifies checksum and digest, rejects corruption and path changes', () => {
  const value=record(), bytes=archive(value);
  assert.equal(diagnosticChecksum(Buffer.from('123456789')),0xcbf43926);
  assert.deepEqual(readDiagnosticArchive(bytes,digest(bytes)),value);
  assert.deepEqual(readDiagnosticArchive(archive(value,{compressed:false,stream:false})),value);
  assert.equal(readDiagnosticArchive(bytes,'sha256:bad'),null);
  assert.equal(readDiagnosticArchive(archive(value,{name:'../index-diagnostic.json'})),null);
  assert.equal(readDiagnosticArchive(zip('x'.repeat(maxDiagnosticBytes+1))),null);
  const corrupt=archive(value,{compressed:false}); corrupt[60]^=1;
  assert.equal(readDiagnosticArchive(corrupt),null);
  assert.equal(readDiagnosticArchive(bytes.subarray(0,bytes.length-22)),null);
});

const run = (id, delta, conclusion = 'failure', event = 'schedule') => ({ id, run_attempt:2, path:'.github/workflows/pages.yml',
  head_branch:'main', status:'completed', created_at:iso(now-delta*hour), run_started_at:iso(now-delta*hour),
  updated_at:iso(now-delta*hour+10000), conclusion,event });
const lastRun = run(77,1);
const previous = run(66,6);
const before = run(55,12,'success');
const publishedRun = run(88,1-20000/hour,'success','push');
const step = 'Prepare exact-mint index and report verification health';
const jobs = (status, deploy = 'skipped') => [{id:status==='failure'?23:24,name:'verify',conclusion:status,
  steps:[{name:step,conclusion:status}]}, {name:'deploy',conclusion:deploy},{name:'public-qa',conclusion:deploy}];
const index = (officialAt, operation) => ({schema:2,checkedAt:officialAt,entries:[verifyForksCoin(OFFICIAL_CA,
  {ok:true,coin:{mint:OFFICIAL_CA,kind:'forks',repo:'dnfl1999/memediff'}},officialAt)], coverage:{verified:1,retained:0},
  ...(operation?{operation:{...operation,indexCheckedAt:officialAt}}:{})});

function apiFixture({ scheduledRecord, scheduledArtifact, publicRecord, snapshot = index(oldTime), missingLog = false,
  blockedList = false, unitOutcome } = {}) {
  const calls=[];
  const bundles = new Map([[77,scheduledRecord], [88,publicRecord]].filter(([,value])=>value).map(([id,value])=>[id,archive(value)]));
  const request=async(path,options={})=>{
    calls.push({path,options});
    if(path===indexURL)return snapshot;
    if(path.startsWith('/actions/workflows'))return {workflow_runs:[lastRun,previous,before]};
    if(path==='/actions/runs/88')return publishedRun;
    if(path==='/actions/jobs/23/logs') {
      if (missingLog) throw Error('unreachable login credentials');
      return 'LookupError: Source unavailable: a network or browser CORS failure prevented access.';
    }
    if(path.includes('/jobs?')) {
      const id=Number(path.match(/\/runs\/(\d+)/)[1]);
      const runJobs=jobs(id===55||id===88?'success':'failure',id===88?'success':'skipped');
      if (unitOutcome && id === 77) runJobs[0].steps.push({ name: qaChecks.unit.step, conclusion: unitOutcome });
      return {jobs:runJobs};
    }
    if(path.includes('/artifacts?')) {
      if (blockedList) throw Error('inaccessible');
      const id=Number(path.match(/\/runs\/(\d+)/)[1]), bytes=bundles.get(id);
      return {artifacts:bytes?[{id:id+100,name:diagnosticName(2),size_in_bytes:bytes.length,expired:false,
        expires_at:iso(now+hour),workflow_run:{id},digest:digest(bytes),archive_download_url:'https://example.test/provided-url',
        ...(id===77 ? scheduledArtifact : {})}]:[]};
    }
    const download=Number(path.match(/^\/actions\/artifacts\/(\d+)\/zip$/)?.[1]);
    if (download) return bundles.get(download-100);
    throw Error('unexpected request');
  };
  return { request, calls };
}

test('Monitor prefers a matching latest-attempt artifact and does not fetch untrusted URLs or unnecessary logs', async()=>{
  const fixture=apiFixture({scheduledRecord:record()});
  const seen=await observeMonitor(fixture.request,now);
  assert.equal(seen.activeFailure,true);
  assert.deepEqual(seen.schedule.attempt.failure,dns);
  assert.equal(seen.schedule.attempt.evidence,'diagnostic artifact');
  assert.match(renderSummary(seen,'Read-only','No issue change'),/runs\/77\/artifacts\/177/);
  assert.ok(fixture.calls.some(call=>call.options.binary));
  assert.ok(fixture.calls.every(call=>!call.path.includes('example.test')&&!call.path.endsWith('/logs')));
});

test('missing, expired, damaged and mismatched artifacts fall back to logs, then to unavailable',async()=>{
  for(const fixture of [apiFixture(),apiFixture({scheduledRecord:record(),scheduledArtifact:{expired:true}}),
    apiFixture({scheduledRecord:record(),scheduledArtifact:{expires_at:iso(now-hour)}}),
    apiFixture({scheduledRecord:record(),scheduledArtifact:{digest:'sha256:bad'}}),
    apiFixture({scheduledRecord:record({runId:'70'})}),apiFixture({scheduledRecord:record({runAttempt:1})}),
    apiFixture({scheduledRecord:record({state:'retained',stages:success})}),apiFixture({blockedList:true})]) {
    const seen=await observeMonitor(fixture.request,now);
    assert.equal(seen.schedule.attempt.failure.category,'network');
    assert.equal(seen.schedule.attempt.evidence,'job log');
    assert.equal(seen.activeFailure,true);
  }
  const missing=await observeMonitor(apiFixture({missingLog:true}).request,now);
  assert.equal(missing.schedule.attempt.failure,null);
  assert.equal(missing.schedule.attempt.evidence,'unavailable');
  assert.doesNotMatch(renderSummary(missing,'Read-only','No issue change'),/credentials/);
});

test('validated refreshed evidence supports recovery; retained deploy, older success and index contradictions do not',async()=>{
  const officialAt=iso(now-hour+21000), recordedAt=iso(now-hour+24000);
  const operation={runId:'88',at:iso(now-hour+23000),outcome:'refreshed'};
  const snapshot=index(officialAt,operation);
  const publicRecord=record({state:'refreshed',runId:'88',event:'push',stages:success,now:recordedAt,data:forkDiagnostic({
    state:'refreshed',health:{lastVerifiedAt:officialAt,official:{verifiedAt:officialAt}},at:officialAt,newlyVerified:1,retained:0})});
  const healthy=await observeMonitor(apiFixture({snapshot,publicRecord}).request,now);
  assert.equal(healthy.activeFailure,false);
  assert.match(healthy.recovery.artifactURL,/runs\/88\/artifacts\/188$/);
  const conflicting=record({state:'refreshed',runId:'88',event:'push',stages:success,now:recordedAt,data:forkDiagnostic({
    state:'refreshed',health:{lastVerifiedAt:oldTime,official:{verifiedAt:oldTime}},at:officialAt,newlyVerified:1,retained:0})});
  assert.equal((await observeMonitor(apiFixture({snapshot,publicRecord:conflicting}).request,now)).recovery,null);
  const fallback=index(oldTime,{...operation,outcome:'retained',failure:dns});
  const recordFallback=record({state:'retained',runId:'88',event:'push',stages:success,now:recordedAt,
    data:forkDiagnostic({state:'retained',retained:1,health:retained,at:officialAt,failure:dns})});
  const stillFailed=await observeMonitor(apiFixture({snapshot:fallback,publicRecord:recordFallback}).request,now);
  assert.equal(stillFailed.recovery,null);
  assert.equal(stillFailed.activeFailure,true);
  assert.ok(stillFailed.index.operation.artifactURL);
});

test('new artifact carrying the same diagnosis does not update an existing incident', async()=>{
  let issue;
  const writes=[];
  const writer=async(path,{method='GET',body}={})=>{
    if(method==='GET'&&path.startsWith('/issues?'))return issue?[issue]:[];
    if(method==='GET'&&path.includes('/comments'))return [];
    writes.push(method);
    return issue={...body,number:1,user:{login:'github-actions[bot]'},state:'open'};
  };
  const fixture=apiFixture({scheduledRecord:record()});
  const first=await observeMonitor(fixture.request,now);
  const oldEvidence={...first,schedule:{...first.schedule,attempt:{...first.schedule.attempt,evidence:'job log',artifactURL:undefined}}};
  assert.deepEqual((await syncIssue(writer,oldEvidence,{write:true})).actions,['create']);
  assert.deepEqual((await syncIssue(writer,first,{write:true})).actions,[]);
  const knownQa = passed => {
    const missing = emptyQa('unavailable', origin);
    const unit = { ...missing, status:'success', evidence:'node-test-json', passed, failed:0, skipped:0,
      startedAt:refreshTime, completedAt:refreshTime };
    return { unit, preDeploy:missing, publicMock:emptyQa('skipped', origin), publicLive:emptyQa('skipped', origin) };
  };
  for (const passed of [160,161]) {
    const scheduledRecord = record({ qa:knownQa(passed) });
    const withQa = await observeMonitor(apiFixture({ scheduledRecord, unitOutcome:'success' }).request, now);
    assert.ok(renderSummary(withQa, 'Read-only', 'No issue change').includes(`${passed} passed / 0 failed / 0 skipped`));
    assert.deepEqual((await syncIssue(writer,withQa,{write:true})).actions,[]);
  }
  const mismatch = await observeMonitor(apiFixture({ scheduledRecord:record({ qa:knownQa(160) }), unitOutcome:'failure' }).request, now);
  assert.equal(mismatch.schedule.attempt.evidence,'job log');
  assert.doesNotMatch(renderSummary(mismatch, 'Read-only', 'No issue change'), /160 passed/);
  assert.deepEqual(writes,['POST']);
});

test('rate-limited GitHub reader stops further API requests while leaving the public index independent',async()=>{
  for(const status of [403,429]) {
    let requests=0;
    const client=monitorClient({fetcher:async url=>{requests++;return url===indexURL?Response.json({index:true}):new Response('',{status,headers:{'retry-after':'30'}});}});
    await assert.rejects(client('/actions/something'),new RegExp(`HTTP ${status}`));
    await assert.rejects(client('/actions/fallback'),new RegExp(`HTTP ${status}`));
    assert.deepEqual(await client(indexURL),{index:true});
    assert.equal(requests,2);
  }
});
