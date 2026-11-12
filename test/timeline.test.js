import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DAY, observationWindows, compareSnapshots, utcMillis} from '../src/core.js';
import {parseImport, importedComparison} from '../src/import.js';
import {timelineRows, windowSummary} from '../src/timeline.js';
import {receiptData, drawReceipt} from '../src/receipt.js';
const end = Date.parse('2026-11-12T12:00:00.001Z');
const snap = (ms=end) => ({schema:1,source:'github-live',repo:'a/b',token:'',branch:'main',fetchedAt:new Date(ms).toISOString(),since:new Date(ms-30*DAY).toISOString(),commits:[],releases:[],metrics:{7:{commits:0},30:{commits:0}},coverage:{commits:true,releases:true}});
test('identical observation periods share the entire 30-day interval',()=>{
  const w=observationWindows(snap(),snap());assert.equal(w.overlap.durationMs,30*DAY);assert.equal(w.relation,'overlap');
  assert.deepEqual(timelineRows(w).map(r=>[r.left,r.width,r.overlap.width]),[[0,1,1],[0,1,1]]);
});
test('offset periods retain exact UTC milliseconds and proportional overlap',()=>{
  const w=observationWindows(snap(end-10*DAY),snap());assert.equal(w.overlap.durationMs,20*DAY);assert.equal(w.gapMs,0);
  assert.equal(w.overlap.start,snap().since);assert.equal(w.overlap.end,snap(end-10*DAY).fetchedAt);
  assert.deepEqual(timelineRows(w).map(r=>[r.left,r.width,r.overlap.left,r.overlap.width]),[[0,.75,.25,.5],[.25,.75,.25,.5]]);
});
test('exactly touching periods have inclusive boundary but zero shared duration',()=>{
  const a=snap(end-30*DAY),b=snap();a.commits=[{sha:'boundary',date:b.since},{sha:'aged',date:new Date(Date.parse(b.since)-1).toISOString()}];
  const c=compareSnapshots(a,b);assert.equal(c.windows.relation,'touching');assert.equal(c.windows.overlap.durationMs,0);assert.deepEqual(c.missing,['boundary']);assert.match(windowSummary(c.windows),/Boundary only/);
});
test('one millisecond overlap and gap are never rounded into a shared duration',()=>{
  const overlap=observationWindows(snap(end-30*DAY+1),snap());assert.equal(overlap.overlap.durationMs,1);
  const gap=observationWindows(snap(end-30*DAY-1),snap());assert.equal(gap.overlap,null);assert.equal(gap.gapMs,1);assert.equal(gap.relation,'disjoint');
});
test('non-overlapping periods preserve descriptive counts and have no missing set',()=>{
  const a=snap(end-60*DAY),b=snap();a.commits=[{sha:'old',date:a.fetchedAt}];a.metrics[30].commits=1;
  b.commits=[{sha:'new',date:b.fetchedAt}];b.metrics[30].commits=1;
  const c=compareSnapshots(a,b);assert.deepEqual(c.observed,['new']);assert.deepEqual(c.missing,[]);assert.equal(c.commitDelta,0);assert.equal(c.windows.gapMs,30*DAY);assert.match(windowSummary(c.windows),/not applicable/);
});
test('missing SHA membership is limited to both ends of the shared interval',()=>{
  const a=snap(end-DAY),b=snap();a.commits=[{sha:'in',date:a.fetchedAt},{sha:'after',date:b.fetchedAt},{sha:'before',date:new Date(Date.parse(b.since)-1).toISOString()}];
  assert.deepEqual(compareSnapshots(a,b).missing,['in']);
});
test('invalid UTC dates, reversed observations and inconsistent ranges fail closed',()=>{
  for(const fetchedAt of ['2026-02-30T12:00:00Z','bad','2026-11-12T12:00:00+00:00','2026-11-12T24:00:00Z']) {
    assert.ok(Number.isNaN(utcMillis(fetchedAt)));assert.equal(compareSnapshots({...snap(),fetchedAt},snap()),null);
  }
  assert.equal(compareSnapshots(snap(end+1),snap()),null);
  assert.equal(compareSnapshots({...snap(),since:'bad'},snap()),null);
  assert.equal(compareSnapshots(snap(),{...snap(),since:snap(end-DAY).since}),null);
});
test('leap day and month boundaries are UTC durations, independent of DST',()=>{
  const leap=Date.parse('2024-03-01T00:00:00Z'),w=observationWindows(snap(leap-DAY),snap(leap));
  assert.equal(w.previous.end,'2024-02-29T00:00:00.000Z');assert.equal(w.overlap.durationMs,29*DAY);
  assert.equal(observationWindows(snap(Date.parse('2026-03-08T00:00:00Z')),snap(Date.parse('2026-03-09T00:00:00Z'))).overlap.durationMs,29*DAY);
});
test('legacy baselines without since still compare and incomplete releases warn',()=>{
  const a=snap();delete a.since;a.coverage.releases=false;const before=JSON.stringify(a);
  assert.equal(compareSnapshots(a,snap()).partial,true);assert.equal(JSON.stringify(a),before);
});
for(const file of ['memediff-source-2026-11-11.json','memediff-v1.1-2026-11-12.json'])test(`actual historical ${file} preserves schema 1 and ignores embedded comparison`,async()=>{
  const old=JSON.parse(await readFile(new URL('../docs/examples/'+file,import.meta.url),'utf8'));
  const current=structuredClone(old);current.fetchedAt=new Date(Date.parse(old.fetchedAt)+DAY).toISOString();current.since=new Date(Date.parse(current.fetchedAt)-30*DAY).toISOString();
  old.comparison={windows:{relation:'fabricated'},observed:['fake']};const baseline=parseImport(JSON.stringify(old),current),c=importedComparison(baseline,current);
  assert.equal(c.windows.overlap.durationMs,29*DAY);assert.deepEqual(c.observed,[]);assert.equal(c.baselineOrigin,'imported-json');
  const roundtrip=parseImport(JSON.stringify({...current,comparison:c,selectedDays:7}),current);assert.equal(roundtrip.schema,1);assert.equal(roundtrip.comparison,undefined);
});
test('comparison PNG keeps UTC periods, source warnings and unverified origin at either display window',()=>{
  const a=snap(end-40*DAY),b=snap(),c={...compareSnapshots(a,b),baselineOrigin:'imported-json'};
  for(const days of [7,30]) {
    const data=receiptData(b,days,c);assert.match(data.changes,/N\/A/);assert.match(data.baseline,/UNVERIFIED/);assert.equal(data.windows.relation,'disjoint');
    const lines=[],ctx={fillRect(){},fillText(s,x,y){lines.push({s,y})},measureText:s=>({width:s.length*8})};drawReceipt(ctx,b,days,c);
    assert.ok(lines.some(l=>l.s.includes(a.since)));assert.ok(lines.some(l=>l.s.includes(b.since)));assert.ok(lines.some(l=>l.s.includes('No overlap')));assert.ok(lines.some(l=>l.s.includes('not a signed certificate')));assert.ok(lines.every(l=>l.y<1260));
  }
});
