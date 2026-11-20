import test from 'node:test';import assert from 'node:assert/strict';
import {OFFICIAL_CA as ca,readJSON,verifyForksCoin,marketObservation,fetchMarket} from '../src/token-data.js';
import {associationHealth,recordedRefreshFailure,verificationWindow} from '../src/index-health.js';
import {createWorker} from '../serverless/worker.js';
const coin={mint:ca,kind:'forks',repo:'dnfl1999/memediff',name:'MemeDiff',symbol:'MEMEDIFF'};
const pair={chainId:'solana',baseToken:{address:ca,name:'MemeDiff',symbol:'MEMEDIFF'},pairAddress:'GJhnfPkf1mNw1jaoZBmQKi4jT41vhi6XQgSQxx7C9kh4',priceUsd:'0.000002',fdv:2000,marketCap:null,liquidity:{usd:null},volume:{h24:0}};
test('association requires exact CA, forks kind, explicit valid repository',()=>{
 assert.equal(verifyForksCoin(ca,{ok:true,coin}).repo,'dnfl1999/memediff');
 for(const change of [{kind:'other'},{mint:'11111111111111111111111111111111'},{repo:null},{repo:'https://evil.test/a/b'},{repo:'a/b/tree/main'}])assert.equal(verifyForksCoin(ca,{ok:true,coin:{...coin,...change}}),null);
 assert.equal(verifyForksCoin(ca,{ok:false,coin}),null);
});
test('index rejects old schema, duplicate, stale and future associations without guessing',()=>{
 const now=Date.now(),entry=verifyForksCoin(ca,{ok:true,coin},new Date(now).toISOString());const index={schema:2,checkedAt:entry.checkedAt,entries:[entry]};
 assert.equal(associationHealth(ca,index,now).record.repo,'dnfl1999/memediff');
 assert.equal(associationHealth(ca,{...index,entries:[entry,entry]},now).state,'ambiguous');
 assert.equal(associationHealth(ca,{...index,entries:[{...entry,checkedAt:new Date(now-49*3600000).toISOString()}]},now).state,'expired');
 assert.equal(associationHealth(ca,{...index,entries:[{...entry,checkedAt:new Date(now+1).toISOString()}]},now).state,'invalid');
 assert.equal(associationHealth(ca,{...index,entries:[{...entry,source:'https://example.com/'}]},now).state,'invalid');
 assert.equal(associationHealth(ca,{...index,entries:[{...entry,checkedAt:'bad'}]},now).state,'invalid');
 assert.equal(associationHealth(ca,{...index,entries:[]}).state,'not-indexed');
 assert.equal(associationHealth(ca,{schema:1,entries:[entry]}).state,'unavailable');
});
test('verification age uses exact UTC, six-hour warning and inclusive 48-hour expiry boundary',()=>{
 const iso='2026-11-18T20:43:46.517Z',at=Date.parse(iso),hour=3600000;
 for(const [delta,state,remaining] of [[0,'fresh',48*hour],[42*hour-1,'fresh',6*hour+1],[42*hour,'expiring',6*hour],
   [48*hour,'expiring',0],[48*hour+1,'expired',-1]]) assert.deepEqual(verificationWindow(iso,at+delta),{state,ageMs:delta,remainingMs:remaining,expiresAt:at+48*hour});
 for(const malformed of ['2026-11-31T00:00:00.000Z','2026-11-18T20:43:46+00:00','bad',42]) assert.equal(verificationWindow(malformed,at),null);
 assert.equal(verificationWindow(iso,at-1),null);
});
test('browser failure notice requires a published operations record tied to the index with a valid Actions run',()=>{
 const checkedAt='2026-11-18T20:44:01.396Z', at='2026-11-20T02:44:57.189Z', now=Date.parse(at)+100;
 const operation={outcome:'retained',at,indexCheckedAt:checkedAt,runId:'44660317318',failure:{category:'dns',status:null}};
 const index={schema:2,checkedAt,entries:[],operation};
 assert.equal(recordedRefreshFailure(index,now).reason,'DNS resolution failure');
 assert.match(recordedRefreshFailure(index,now).url,/\/actions\/runs\/44660317318$/);
 assert.equal(recordedRefreshFailure({...index,operation:undefined},now),null);
 for(const mutation of [{runId:'javascript:0'},{indexCheckedAt:at},{at:'2026-11-20T02:44:58.189Z'},
   {outcome:'refreshed'},{failure:{category:'<script>'}}]) assert.equal(recordedRefreshFailure({...index,operation:{...operation,...mutation}},now),null);
});
test('market identity validates chain and exact base CA, preserves unknown versus zero',()=>{
 const r=marketObservation(ca,[{...pair,chainId:'ethereum'},{...pair,baseToken:{address:'other'},quoteToken:{address:ca}},pair]);
 assert.equal(r.matchedPairs,1);assert.equal(r.price,0.000002);assert.equal(r.marketCap,null);assert.equal(r.liquidity,null);assert.equal(r.volume24h,0);assert.equal(r.fdv,2000);
 assert.equal(marketObservation(ca,[]).available,false);
 assert.equal(marketObservation(ca,[{...pair,priceUsd:'',marketCap:false,fdv:-1}]).price,null);
 assert.throws(()=>marketObservation(ca,{}),/unexpected/);
});
test('market picks one pool by liquidity and never adds duplicate volumes',()=>{
 const r=marketObservation(ca,[{...pair,liquidity:{usd:1},volume:{h24:100}},{...pair,liquidity:{usd:2},volume:{h24:20}}]);assert.equal(r.volume24h,20);assert.equal(r.liquidity,2);
});
test('read-only requests distinguish 403, 429, timeout, cancellation, invalid JSON and network/CORS',async()=>{
 for(const [status,kind]of [[403,'forbidden'],[429,'rate-limit'],[500,'http']])await assert.rejects(readJSON('https://example.test',{fetcher:async()=>new Response('{}',{status})}),e=>e.kind===kind);
 await assert.rejects(readJSON('x',{fetcher:async()=>new Response('bad')}),e=>e.kind==='data');
 await assert.rejects(readJSON('x',{fetcher:async()=>{throw TypeError('Failed to fetch');}}),e=>e.kind==='network');
 const hanging=async(u,{signal})=>new Promise((r,reject)=>{if(signal.aborted)reject(Error());else signal.addEventListener('abort',()=>reject(Error()));});
 await assert.rejects(readJSON('x',{fetcher:hanging,timeout:5}),e=>e.kind==='timeout');
 const c=new AbortController();c.abort();await assert.rejects(readJSON('x',{fetcher:hanging,signal:c.signal}),e=>e.kind==='canceled');
});
test('market fetch encodes only a validated CA and omits credentials',async()=>{
 await fetchMarket(ca,{fetcher:async(url,options)=>{assert.equal(url,`https://api.dexscreener.com/tokens/v1/solana/${ca}`);assert.equal(options.credentials,'omit');return new Response('[]');}});
 await assert.rejects(fetchMarket('bad',{fetcher:()=>assert.fail('request sent')}));
});
test('optional Worker denies arbitrary hosts, methods, origins and missing rate limiter',async()=>{
 const worker=createWorker({fetcher:()=>assert.fail('must not request'),cache:()=>null});const base='https://service.test/v1/association?mint='+ca;
 const req=(url=base,opts={})=>new Request(url,{headers:{Origin:'https://dnfl1999.github.io'},...opts});
 assert.equal((await worker.fetch(req(),{},{})).status,503);
 assert.equal((await worker.fetch(req(base+'&url=https://evil.test'),{},{})).status,400);
 assert.equal((await worker.fetch(req(base,{method:'POST'}),{},{})).status,400);
 assert.equal((await worker.fetch(req(base,{headers:{Origin:'https://evil.test'}}),{},{})).status,403);
 assert.equal((await worker.fetch(req(),{LIMITER:{limit:async()=>({success:false})}},{})).status,429);
});
test('optional Worker pins upstream, disables redirects and preserves cached observation time',async()=>{
 let saved,calls=0;const worker=createWorker({cache:()=>({match:async()=>saved?.clone(),put:async(k,v)=>{saved=v;}}),fetcher:async(url,options)=>{calls++;assert.equal(url,'https://forks.wiki/api/coin?mint='+ca);assert.equal(options.redirect,'error');return new Response(JSON.stringify({ok:true,coin}));}});
 const req=()=>new Request('https://service.test/v1/association?mint='+ca,{headers:{Origin:'https://dnfl1999.github.io'}});const env={LIMITER:{limit:async()=>({success:true})}},promises=[],ctx={waitUntil:p=>promises.push(p)};
 const a=await worker.fetch(req(),env,ctx);await Promise.all(promises);const b=await worker.fetch(req(),env,ctx);assert.equal(calls,1);assert.deepEqual(await a.json(),await b.json());assert.equal(b.headers.get('Access-Control-Allow-Origin'),'https://dnfl1999.github.io');
});
