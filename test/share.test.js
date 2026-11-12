import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisLink, sharedToken, ANALYSIS_HOME} from '../src/share.js';
import {OFFICIAL_CA} from '../src/token-data.js';
const other='11111111111111111111111111111111';
test('analysis links use the fixed official Pages path and one exact CA only',()=>{
  for(const ca of [OFFICIAL_CA,other]){const u=new URL(analysisLink(ca));assert.equal(u.origin+u.pathname,ANALYSIS_HOME);assert.deepEqual([...u.searchParams],[['ca',ca]]);assert.equal(u.hash,'');assert.equal(sharedToken(u.search),ca);}
});
test('encoded CA and encoded parameter names decode exactly once',()=>{
  assert.equal(sharedToken('?%63%61=%44'+OFFICIAL_CA.slice(1)),OFFICIAL_CA);
  assert.throws(()=>sharedToken('?ca=%2544'+OFFICIAL_CA.slice(1)));
});
test('ordinary visits and unrelated parameters do not prefill anything',()=>{
  for(const search of ['', '?utm_source=example','?redirect=https%3A%2F%2Fevil.invalid','?CA='+OFFICIAL_CA])assert.equal(sharedToken(search),null);
});
test('unrelated query values cannot change the CA or generated destination',()=>{
  const ca=sharedToken('?ca='+OFFICIAL_CA+'&repo=attacker/repo&redirect=https://evil.invalid&baseline=secret');
  assert.equal(analysisLink(ca),ANALYSIS_HOME+'?ca='+OFFICIAL_CA);
});
test('duplicate, empty, spaced and oversized shared CA queries are rejected',()=>{
  for(const q of ['?ca=','?ca','?ca='+OFFICIAL_CA+'&ca='+other,'?ca='+OFFICIAL_CA+'&%63a='+OFFICIAL_CA,'?ca=%20'+OFFICIAL_CA,'?ca='+OFFICIAL_CA+'+','?ca='+ '1'.repeat(33),'?ca='+'1'.repeat(8193)])assert.throws(()=>sharedToken(q));
});
test('malicious CA values and URLs never become links or script content',()=>{
  for(const value of ['javascript:alert(1)','https://evil.invalid/','//evil.invalid','<img src=x onerror=alert(1)>',OFFICIAL_CA+'&redirect=evil','0'.repeat(44),'\u0000'+OFFICIAL_CA,'%44'+OFFICIAL_CA.slice(1)]){assert.throws(()=>analysisLink(value));assert.throws(()=>sharedToken('?ca='+encodeURIComponent(value)));}
});
test('malformed percent encoding, wrong types and full URLs fail safely',()=>{
  for(const q of ['?ca=%','?ca=%FF',null,{},'https://evil.invalid/?ca='+OFFICIAL_CA])assert.throws(()=>sharedToken(q));
  for(const value of ['',null,{},42,undefined])assert.throws(()=>analysisLink(value));
});
test('manually pasted surrounding whitespace is normalized without changing CA case',()=>{
  assert.equal(analysisLink(' '+OFFICIAL_CA+'\n'),ANALYSIS_HOME+'?ca='+OFFICIAL_CA);
  assert.equal(new URL(analysisLink(OFFICIAL_CA)).searchParams.get('ca'),OFFICIAL_CA);
});
