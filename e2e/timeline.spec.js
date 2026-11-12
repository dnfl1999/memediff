import {test,expect,mockGitHub,analyze,downloadReport} from './helpers.js';
import {readFile} from 'node:fs/promises';
import {DAY,summarize} from '../src/core.js';
const upload=(page,data)=>page.locator('#import-file').setInputFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
function older(report,age) {
  const p=structuredClone(report),shift=age*DAY;
  p.fetchedAt=new Date(Date.parse(p.fetchedAt)-shift).toISOString();p.since=new Date(Date.parse(p.since)-shift).toISOString();
  for(const x of [...p.commits,...p.releases])x.date=new Date(Date.parse(x.date)-shift).toISOString();
  p.metrics=summarize(p.commits,p.releases,Date.parse(p.fetchedAt));return p;
}
for(const [age,relation,label] of [[10,'overlap','Shared interval'],[30,'touching','Boundary only'],[40,'disjoint','No overlap']])test(`UTC timeline ${relation} preserves 30-day calculation, local data and exports`,async({page},info)=>{
  await mockGitHub(page);await page.goto('./');await analyze(page);await page.locator('#save').click();
  const current=await downloadReport(page,'json',info),previous=older(current,age),before=await page.evaluate(()=>JSON.stringify(localStorage)),requests=[];
  page.on('request',r=>requests.push(r.url()));await upload(page,previous);await page.locator('#import-apply').click();
  const timeline=page.locator('.observation-timeline');await expect(timeline).toBeVisible();await expect(timeline).toContainText(previous.since);await expect(timeline).toContainText(current.fetchedAt);await expect(timeline).toContainText(label);
  await expect(page.locator('.timeline-overlap')).toHaveCount(relation==='disjoint'?0:2);
  if(relation==='disjoint')await expect(page.locator('#comparison')).toContainText('N/A — no shared interval');
  for(const days of [7,30]){await page.locator(`[data-days="${days}"]`).click();const exported=await downloadReport(page,'json',info);expect(exported.selectedDays).toBe(days);expect(exported.comparison.windows.relation).toBe(relation);expect(exported.comparison.windows.previous.start).toBe(previous.since);expect(exported.comparison.windows.current.end).toBe(current.fetchedAt);}
  // Additive comparison fields in v1.2 remain importable under schema 1.
  const roundtrip=await downloadReport(page,'json',info);await upload(page,roundtrip);await expect(page.locator('#import-status')).toContainText('Structure and identity match');
  const png=await downloadReport(page,'png',info);expect(png.height).toBe(1260);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);expect(requests).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await timeline.screenshot({path:info.outputPath(`timeline-${relation}.png`)});
});
test('stored baseline timeline works with partial API collection and invalid imports preserve it',async({page,diagnostics},info)=>{
  const api=await mockGitHub(page);await page.goto('./');await analyze(page);await page.locator('#save').click();
  const current=await downloadReport(page,'json',info);api.commitError=429;diagnostics.expectedStatuses=[429];await analyze(page);
  await expect(page.locator('.observation-timeline')).toContainText('Shared interval');await expect(page.locator('#comparison')).toContainText('incomplete collection');
  const before=await page.locator('#comparison').textContent();await upload(page,{...current,since:'2026-02-30T00:00:00Z'});await expect(page.locator('#import-status')).toContainText('calendar date');expect(await page.locator('#comparison').textContent()).toBe(before);
});
test('actual v1.1 MEMEDIFF artifact shows a local timeline without requesting embedded URLs',async({page},info)=>{
  const previous=JSON.parse(await readFile(new URL('../docs/examples/memediff-v1.1-2026-11-12.json',import.meta.url),'utf8'));
  await page.route('https://api.github.com/**',r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:r.request().url().includes('?')?[]:{full_name:previous.repo,default_branch:previous.branch,private:false}}));
  await page.goto('./');await page.locator('#advanced > summary').click();await page.locator('#token').fill(previous.token);await analyze(page,previous.repo);
  const requests=[];page.on('request',r=>requests.push(r.url()));await upload(page,previous);await page.locator('#import-apply').click();await expect(page.locator('.observation-timeline')).toContainText(previous.since);await expect(page.locator('#comparison')).toContainText('Unverified');
  const data=await downloadReport(page,'json',info);expect(data.comparison.windows.previous.end).toBe(previous.fetchedAt);expect(requests).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe('{}');
});
