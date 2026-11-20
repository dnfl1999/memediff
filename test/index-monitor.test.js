import test from 'node:test';
import assert from 'node:assert/strict';
import { failureFromLog, indexURL, monitorClient, observeMonitor, runURL } from '../scripts/index-monitor-data.mjs';
import { issueTitle, renderSummary, syncIssue } from '../scripts/index-monitor-issues.mjs';
import { OFFICIAL_CA, verifyForksCoin } from '../src/token-data.js';

const hour = 3600000;
const now = Date.parse('2026-11-20T06:00:00.000Z');
const iso = ms => new Date(ms).toISOString();
const bot = { login: 'github-actions[bot]' };
const step = 'Prepare exact-mint index and report verification health';
const unresolved = { category: 'dns', stage: 'forks-refresh', codes: ['ENOTFOUND'], status: null };
const run = (id, at, conclusion = 'failure', event = 'schedule') => ({ id, path: '.github/workflows/pages.yml', head_branch: 'main',
  status: 'completed', conclusion, created_at: iso(at), run_started_at: iso(at), updated_at: iso(at + 10000), event });
const jobs = (status, deployed = false) => ({ jobs: [{ id: 55, name: 'verify', steps: [{ name: step, conclusion: status }] },
  { name: 'deploy', conclusion: deployed ? 'success' : 'skipped' }] });
const index = (ageHours, operation) => {
  const checkedAt = iso(now - ageHours * hour);
  const entries = [verifyForksCoin(OFFICIAL_CA, { ok:true, coin:{kind:'forks',mint:OFFICIAL_CA,repo:'dnfl1999/memediff'} },checkedAt)];
  return { schema:2, checkedAt, entries, coverage:{verified:1,retained:0}, ...(operation ? { operation:{...operation,indexCheckedAt:checkedAt} } : {}) };
};
const oldRun = run(33, now - 5*hour), olderRun = run(22, now - 11*hour), previousSuccess = run(11, now - 17*hour, 'success');

function observations({ snapshot = index(30), runs = [oldRun, olderRun, previousSuccess], runJobs = {}, extra = {} } = {}) {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({path, options});
    if (Object.hasOwn(extra, path)) return extra[path];
    if (path === indexURL) return snapshot;
    if (path.startsWith('/actions/workflows/pages.yml/runs?')) return { workflow_runs:runs };
    if (path === '/actions/jobs/55/logs') return '2026-11-20T00:02:03Z '+JSON.stringify({event:'index-refresh-failed',failure:unresolved});
    const id = path.match(/^\/actions\/runs\/(\d+)\/jobs\?/i)?.[1];
    if (id) return runJobs[id] ?? jobs(id === '11' ? 'success' : 'failure');
    assert.fail('Unexpected request');
  };
  return { request, calls };
}

test('two scheduled refresh failures qualify independently of the fresh published index', async () => {
  const snapshot = index(30, { runId:'99',outcome:'retained',at:iso(now-hour),failure:unresolved });
  const { request,calls } = observations({ snapshot });
  const result = await observeMonitor(request,now);
  assert.equal(result.index.state,'fresh');
  assert.equal(result.index.verified,0);
  assert.equal(result.index.retained,1);
  assert.equal(result.schedule.streak,2);
  assert.equal(result.activeFailure,true);
  assert.equal(result.schedule.latest.id,'33');
  assert.equal(result.schedule.attempt.failure.category,'dns');
  assert.equal(result.recovery,null);
  assert.ok(calls.every(call=>!call.options.method));
  assert.equal(snapshot.entries[0].checkedAt,result.index.verifiedAt);
});

test('a single failed refresh and an unrelated workflow failure do not qualify', async () => {
  const {request} = observations({ runJobs:{33:jobs('skipped'),22:jobs('failure')} });
  const result = await observeMonitor(request,now);
  assert.equal(result.activeFailure,false);
  assert.equal(result.schedule.latest.refresh,'not-run');
  assert.equal(result.schedule.attempt.id,'22');
  assert.equal(result.schedule.streak,1);
});

test('six-hour boundary and exact 48 hours are expiring; the next millisecond is expired',async()=>{
  for(const [age,state] of [[42-1/hour,'fresh'],[42,'expiring'],[48,'expiring'],[48+1/hour,'expired']]) {
    const {request}=observations({ snapshot:index(age),runs:[previousSuccess] });
    const seen=await observeMonitor(request,now);
    assert.equal(seen.index.state,state);
    assert.equal(Date.parse(seen.index.expiresAt)-Date.parse(seen.index.verifiedAt),48*hour);
    assert.equal(seen.activeFailure,false);
  }
});

test('invalid published data does not hide a scheduled outage or invent a verification',async()=>{
  for(const snapshot of [null,{schema:2,entries:[]},{...index(10),entries:[...index(10).entries,...index(10).entries]},index(-1)]) {
    const {request}=observations({snapshot});
    const seen=await observeMonitor(request,now);
    assert.equal(seen.index.state,'unavailable');
    assert.equal(seen.index.verifiedAt,undefined);
    assert.equal(seen.activeFailure,true);
  }
});

test('history API errors preserve independent age alerts and never imply a DNS diagnosis',async()=>{
  for(const status of [403,429,503]) {
    const api=monitorClient({fetcher: async url=>url===indexURL ? Response.json(index(49)) : Response.json({message:'SECRET private response'}, {status})});
    const seen=await observeMonitor(api,now);
    assert.equal(seen.schedule.status,'unavailable');
    assert.equal(seen.schedule.error,`HTTP ${status}`);
    assert.equal(seen.activeFailure,false);
    assert.equal(seen.index.state,'expired');
    assert.doesNotMatch(renderSummary(seen,'Read-only','No issue change'),/SECRET|dns/i);
  }
});

test('recovery requires a published refresh proof, official time within the run and successful deploy',async()=>{
  const verified=now-5*60000;
  const newRun=run(44,verified-1000,'success','push');
  const snapshot=index((now-verified)/hour,{runId:'44',outcome:'refreshed',at:iso(verified+2000)});
  const fixture={snapshot,runJobs:{44:jobs('success',true)},extra:{'/actions/runs/44':newRun}};
  const success=await observeMonitor(observations(fixture).request,now);
  assert.equal(success.recovery.verifiedAt,iso(verified));
  assert.equal(success.activeFailure,false);
  for(const changes of [{runJobs:{44:jobs('success',false)}},{runJobs:{44:jobs('skipped',true)}},
    {extra:{'/actions/runs/44':{...newRun,run_started_at:iso(verified+1)}}},
    {snapshot:{...snapshot,operation:{...snapshot.operation,outcome:'retained'}}}]) {
    const result=await observeMonitor(observations({...fixture,...changes}).request,now);
    assert.equal(result.recovery,null);
    assert.equal(result.activeFailure,true);
  }
});

test('legacy network markers and structured logs expose only recognized diagnostic fields',()=>{
  const raw='Timestamp '+JSON.stringify({event:'index-refresh-failed',failure:{...unresolved,codes:['ENOTFOUND','ghp_example'],endpoint:'Bearer private'}});
  assert.deepEqual(failureFromLog(raw),unresolved);
  assert.equal(failureFromLog('LookupError: Source unavailable: a network or browser CORS failure prevented access.').category,'network');
  assert.equal(failureFromLog('ENOTFOUND in arbitrary logging'),null);
});

test('API client uses an auth header only on GitHub and redacts response bodies and network exceptions',async()=>{
  const token='test-secret';
  const client=monitorClient({token,fetcher:async(url,options)=>{
    assert.equal(options.headers.Authorization,url===indexURL ? undefined : `Bearer ${token}`);
    if(url===indexURL)return Response.json(index(30));
    if(url.endsWith('/issues'))return new Response('private credential test-secret',{status:403});
    throw Error(`network message ${token}`);
  }});
  await client(indexURL);
  await assert.rejects(client('/issues'),err=>err.message==='GitHub API: HTTP 403'&&!err.cause);
  await assert.rejects(client('/another'),err=>err.message==='GitHub API: network error'&&!err.cause);
});

function issueStore() {
  let issue=null;
  const comments=[],writes=[];
  const store={ problems:new Map(),comments,writes,get issue(){return issue;},set issue(value){issue=value;} };
  store.request=async(path,{method='GET',body}={})=>{
    if(store.problems.has(`${method} ${path.split('?')[0]}`))throw new Error(store.problems.get(`${method} ${path.split('?')[0]}`));
    if(method==='GET'&&path.startsWith('/issues?'))return issue?[issue]:[];
    if(method==='GET'&&path.startsWith('/issues/7/comments?'))return comments.slice();
    writes.push({method,path,body});
    if(method==='POST'&&path==='/issues')return issue={...body,number:7,user:bot,state:'open'};
    if(method==='POST'&&path==='/issues/7/comments')return comments[comments.push({...body,user:bot,id:comments.length+1})-1];
    if(method==='PATCH'&&path==='/issues/7')return issue={...issue,state:body.state};
    assert.fail('Unexpected issue request');
  };
  return store;
}

test('read-only rehearsal creates nothing; one issue receives only meaningful changes and reopens for a new episode',async()=>{
  const store=issueStore();
  const first=await observeMonitor(observations().request,now);
  assert.deepEqual((await syncIssue(store.request,first)).actions,['create']);
  assert.equal(store.writes.length,0);
  assert.deepEqual((await syncIssue(store.request,first,{write:true})).actions,['create']);
  assert.equal(store.issue.title,issueTitle);
  assert.match(store.issue.body,/@dnfl1999/);
  assert.ok(store.issue.body.includes(runURL('33')));
  assert.deepEqual((await syncIssue(store.request,{...first,at:iso(now+hour),schedule:{...first.schedule,streak:3}},{write:true})).actions,[]);
  const expiring={...first,at:iso(now+2*hour),index:{...first.index,state:'expiring',remainingMs:5*hour}};
  assert.deepEqual((await syncIssue(store.request,expiring,{write:true})).actions,['comment']);
  assert.deepEqual((await syncIssue(store.request,expiring,{write:true})).actions,[]);
  const expired={...expiring,at:iso(now+3*hour),index:{...expiring.index,state:'expired',remainingMs:-1}};
  assert.deepEqual((await syncIssue(store.request,expired,{write:true})).actions,['comment']);
  const healthy={...first,at:iso(now+5*hour),activeFailure:false,index:{...first.index,state:'fresh'}};
  assert.deepEqual((await syncIssue(store.request,healthy,{write:true})).actions,[]);
  assert.equal(store.issue.state,'open');
  const recovered={...healthy,recovery:{id:'77',verifiedAt:iso(now+4*hour)}};
  assert.deepEqual((await syncIssue(store.request,recovered,{write:true})).actions,['comment','close']);
  assert.equal(store.issue.state,'closed');
  assert.deepEqual((await syncIssue(store.request,recovered,{write:true})).actions,[]);
  assert.deepEqual((await syncIssue(store.request,{...first,at:iso(now+6*hour)},{write:true})).actions,['comment','reopen']);
  assert.equal(store.writes.filter(w=>w.path==='/issues'&&w.method==='POST').length,1);
});

test('issue lookup and comment failures stop writes; retry after a failed close does not duplicate the recovery comment',async()=>{
  const first=await observeMonitor(observations().request,now);
  const store=issueStore();
  store.problems.set('GET /issues','cannot read issues');
  await assert.rejects(syncIssue(store.request,first,{write:true}),/cannot read issues/);
  assert.equal(store.writes.length,0);
  store.problems.clear();
  await syncIssue(store.request,first,{write:true});
  const recovered={...first,activeFailure:false,recovery:{id:'77',verifiedAt:iso(now+hour)},at:iso(now+2*hour)};
  store.problems.set('POST /issues/7/comments','cannot update');
  await assert.rejects(syncIssue(store.request,recovered,{write:true}),/cannot update/);
  assert.equal(store.issue.state,'open');
  store.problems.clear();
  store.problems.set('PATCH /issues/7','cannot close');
  await assert.rejects(syncIssue(store.request,recovered,{write:true}),/cannot close/);
  assert.equal(store.comments.length,1);
  store.problems.clear();
  assert.deepEqual((await syncIssue(store.request,recovered,{write:true})).actions,['close']);
  assert.equal(store.comments.length,1);
});

test('existing unmanaged operations issue prevents both mutation and duplicate creation',async()=>{
  const store=issueStore();
  store.issue={title:issueTitle,user:{login:'human'},number:7,state:'open',body:'existing'};
  await assert.rejects(syncIssue(store.request,await observeMonitor(observations().request,now),{write:true}),/unmanaged/);
  assert.equal(store.writes.length,0);
});
