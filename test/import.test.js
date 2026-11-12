import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseImport, readImportFile, importedComparison, MAX_IMPORT_BYTES} from '../src/import.js';
import {summarize, DAY} from '../src/core.js';
import {receiptData} from '../src/receipt.js';
const original = JSON.parse(await readFile(new URL('../docs/examples/memediff-source-2026-11-11.json', import.meta.url), 'utf8'));
const current = {...original, fetchedAt:'2026-11-12T07:31:25.463Z', since:'2026-10-13T07:31:25.463Z'};
const copy = () => structuredClone(original);
test('real historical schema 1 export imports without changing its report or selected display', () => {
  const snapshot = parseImport(JSON.stringify(original),current);
  assert.equal(snapshot.repo,original.repo); assert.deepEqual(snapshot.commits,original.commits);
  assert.equal(snapshot.selectedDays,undefined); assert.equal(snapshot.comparison,undefined);
  assert.equal(importedComparison(snapshot,current).baselineOrigin,'imported-json');
});
for (const [name, mutate, message] of [
  ['schema',x=>x.schema=2,/schema/], ['source',x=>x.source='demo',/source/],
  ['repository',x=>x.repo='other/project',/Different repository/],
  ['coin',x=>x.token='11111111111111111111111111111111',/Different token CA/],
  ['invalid CA',x=>x.token='0'.repeat(44),/Solana/],
  ['branch',x=>x.branch='develop',/Different branch/],
  ['missing field',x=>delete x.branch,/structure/],
  ['SHA',x=>x.commits[0].sha='javascript:alert(1)',/SHA/],
  ['duplicate SHA',x=>x.commits.push(x.commits[0]),/duplicate/],
  ['calendar date',x=>x.commits[0].date='2026-02-30T00:00:00Z',/calendar/],
  ['future observation',x=>x.fetchedAt='2027-01-01T00:00:00.000Z',/newer/],
  ['window',x=>x.since='2026-11-01T00:00:00.000Z',/30-day/],
  ['out-of-window record',x=>x.commits[0].date='2020-01-01T00:00:00Z',/outside/],
  ['metrics',x=>x.metrics[30].commits++,/metrics/],
  ['negative count',x=>x.metrics[7].contributors=-1,/metrics/],
  ['coverage',x=>x.coverage.commits='true',/coverage/],
  ['collection cap',x=>x.commits=Array(1001).fill(x.commits[0]),/limit/],
  ['unsafe URL',x=>x.commits[0].url='javascript:alert(1)',/URL/],
  ['extra field',x=>x.script='<script>alert(1)</script>',/structure/],
  ['display window',x=>x.selectedDays=365,/window/]
]) test(`import rejects ${name}`,()=>{const x=copy();mutate(x);assert.throws(()=>parseImport(JSON.stringify(x),current),message);});
test('invalid JSON, primitives and unsafe object keys are rejected',()=>{
  for(const raw of ['{','null','[]','true','{"__proto__":{}}','{"constructor":{}}'])assert.throws(()=>parseImport(raw,current));
});
test('oversize, empty and wrong-extension files fail before reading bytes',async()=>{
  for(const [name,size]of [['x.json',MAX_IMPORT_BYTES+1],['x.json',0],['x.html',1]])await assert.rejects(readImportFile({name,size,text:()=>assert.fail('must not read')},current));
  assert.throws(()=>parseImport(' '.repeat(MAX_IMPORT_BYTES+1),current),/2 MiB/);
  assert.throws(()=>parseImport('한'.repeat(MAX_IMPORT_BYTES/2),current),/2 MiB/);
});
test('file read errors are actionable',async()=>assert.rejects(readImportFile({name:'x.json',size:10,text:async()=>{throw Error();}},current),/Could not read/));
test('comparison is recomputed; imported values and HTML cannot become an attestation',()=>{
  const x=copy();x.description='<img src=x onerror=alert(1)>';x.comparison={observed:['fake'],commitDelta:999999};
  const p=parseImport(JSON.stringify(x),current),c=importedComparison(p,current);
  assert.equal(c.commitDelta,0);assert.deepEqual(c.observed,[]);assert.match(c.note,/unverified/);
  assert.match(receiptData(current,7,c).baseline,/IMPORTED \/ UNVERIFIED/);
});
test('partial releases and commits remain explicitly incomplete',()=>{
  for(const kind of ['commits','releases']){const x=copy();x.coverage[kind]=false;assert.equal(importedComparison(parseImport(JSON.stringify(x),current),current).partial,true);}
});
test('rolling-window missing SHA excludes aged-out records and uses 30-day counts',()=>{
  const p=parseImport(JSON.stringify(original),current);
  const c={...current,commits:current.commits.slice(1)};c.metrics=summarize(c.commits,c.releases,Date.parse(c.fetchedAt));
  let result=importedComparison(p,c);assert.deepEqual(result.missing,[p.commits[0].sha]);assert.equal(result.commitDelta,-1);
  c.fetchedAt=new Date(Date.parse(original.fetchedAt)+31*DAY).toISOString();c.since=new Date(Date.parse(c.fetchedAt)-30*DAY).toISOString();c.commits=[];c.metrics=summarize([],[],Date.parse(c.fetchedAt));
  assert.deepEqual(importedComparison(p,c).missing,[]);
});
test('empty repository and saved imported baseline remain schema 1 compatible',()=>{
  const x=copy();x.commits=[];x.releases=[];x.branch=null;x.metrics=summarize([],[],Date.parse(x.fetchedAt));x.baselineOrigin='imported-json';
  assert.equal(parseImport(JSON.stringify(x),{...current,branch:null}).schema,1);
});
test('release URLs retain GitHub repository casing while dates, IDs and counts are validated',()=>{
  const x=copy();x.releases=[{id:1,name:'v1',date:x.fetchedAt,prerelease:false,url:'https://github.com/DNFL1999/MemeDiff/releases/tag/V1'}];x.metrics=summarize(x.commits,x.releases,Date.parse(x.fetchedAt));
  assert.equal(parseImport(JSON.stringify(x),current).releases.length,1);
  for(const change of [{id:-1},{prerelease:'false'},{date:'2020-01-01T00:00:00Z'},{url:'https://github.com/other/project/releases/tag/v1'}]){const broken=structuredClone(x);Object.assign(broken.releases[0],change);assert.throws(()=>parseImport(JSON.stringify(broken),current));}
});
