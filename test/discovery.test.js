import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRepositories, createForksIndex, lookupMint } from '../src/discovery.js';
const ca='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
const time='2026-11-11T08:00:00Z';
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
test('repository name search is explicit, bounded, public and sanitizes results',async()=>{
 let requested;
 const result=await searchRepositories('MemeDiff',{fetcher:async(url,options)=>{requested={url,options};return response({items:[{full_name:'dnfl1999/MemeDiff',private:false,description:'<img onerror=x>'},{full_name:'private/repo',private:true},{full_name:'https://evil.test/a/b',private:false}],incomplete_results:true});}});
 assert.match(decodeURIComponent(requested.url),/MemeDiff in:name is:public/);assert.match(requested.url,/per_page=10/);assert.equal(requested.options.credentials,'omit');
 assert.deepEqual(result.items.map(i=>i.repo),['dnfl1999/memediff']);assert.equal(result.incomplete,true);
});
test('invalid search input never sends a request',async()=>{
 for(const q of ['', 'x','a'.repeat(81),'memediff user:someone','https://github.com/a/b'])await assert.rejects(searchRepositories(q,{fetcher:()=>{throw Error('Should not request');}}),/Enter 2/);
});
test('search rate limits, malformed data and network failures are explicit',async()=>{
 for(const status of [403,429])await assert.rejects(searchRepositories('test',{fetcher:async()=>response({},status,{'retry-after':'60'})}),/Retry after 60 seconds/);
 await assert.rejects(searchRepositories('test',{fetcher:async()=>response({},422)}),/422/);
 await assert.rejects(searchRepositories('test',{fetcher:async()=>response({})}),/unexpected/);
 await assert.rejects(searchRepositories('test',{fetcher:async()=>{throw Error('network');}}),/network/);
});
test('Forks index requires exact mint and explicit repo, rejects ambiguity and guesses',()=>{
 const entry={mint:ca,repo:'dnfl1999/memediff'};
 const index=createForksIndex({ok:true,tokens:[entry,{mint:'invalid',repo:'a/b'},{mint:'11111111111111111111111111111111',name:'MemeDiff'}]},{ok:true,tokens:[entry]},time);
 assert.equal(index.entries.length,1);assert.equal(lookupMint(ca,index).repo,'dnfl1999/memediff');
 assert.equal(lookupMint('11111111111111111111111111111111',index),null);
 assert.equal(createForksIndex({ok:true,tokens:[entry,{...entry,repo:'different/repo'}]},{ok:true,tokens:[]},time).entries.length,0);
 assert.throws(()=>createForksIndex({ok:false},{},time),/Invalid/);
 assert.throws(()=>lookupMint(ca,{}),/unavailable/);assert.throws(()=>lookupMint('',index),/Enter a Solana/);
});
