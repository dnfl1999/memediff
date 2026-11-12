import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeShare,analysisLink} from '../src/share.js';
import {OFFICIAL_CA as ca} from '../src/token-data.js';
test('native share passes exactly the validated CA-only URL, without title, text or files',async()=>{
  let received;const platform={canShare(data){assert.equal(this,platform);assert.deepEqual(Object.keys(data),['url']);return true;},share(data){assert.equal(this,platform);received=data;return Promise.resolve();}};
  assert.deepEqual(await nativeShare(ca,platform),{status:'completed',url:analysisLink(ca)});assert.deepEqual(received,{url:analysisLink(ca)});
});
test('share is invoked synchronously before yielding, preserving user activation',async()=>{
  let called=false;const promise=nativeShare(ca,{share(){called=true;return Promise.resolve();}});assert.equal(called,true);await promise;
});
test('missing share or rejected canShare is unsupported without invoking share',async()=>{
  for(const platform of [undefined,{}, {share:1},{canShare:()=>false,share(){throw Error('Must not run')}}])assert.equal((await nativeShare(ca,platform)).status,'unsupported');
});
test('share works without the optional canShare API',async()=>assert.equal((await nativeShare(ca,{share:async()=>{}})).status,'completed'));
test('AbortError is cancellation; other errors and capability exceptions are failures',async()=>{
  for(const name of ['AbortError','NotAllowedError','InvalidStateError','DataError','TypeError'])assert.equal((await nativeShare(ca,{share:async()=>{throw Object.assign(Error('private diagnostic'),{name});}})).status,name==='AbortError'?'canceled':'failed');
  assert.equal((await nativeShare(ca,{share(){},canShare(){throw Error('blocked')}})).status,'failed');
});
test('invalid CA never invokes capability checks or native UI',async()=>{
  let calls=0;for(const value of ['', 'javascript:alert(1)', 'https://evil.invalid', '0'.repeat(44)])await assert.rejects(nativeShare(value,{canShare(){calls++;},share(){calls++;}}));assert.equal(calls,0);
});
