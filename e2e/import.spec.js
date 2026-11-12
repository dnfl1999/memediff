import {test,expect,mockGitHub,analyze,downloadReport} from './helpers.js';
import {readFile} from 'node:fs/promises';
const upload = (page, data) => page.locator('#import-file').setInputFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))});
const storage = page => page.evaluate(()=>JSON.stringify(localStorage));

test('downloaded schema 1 import previews, compares locally, exports provenance and preserves saved baseline',async({page},info)=>{
  const api=await mockGitHub(page);await page.goto('./');await analyze(page);
  const previous=await downloadReport(page,'json',info);api.revision=1;await analyze(page);await page.locator('#save').click();
  const before=await storage(page),requests=[];page.on('request',r=>requests.push(r.url()));
  await page.locator('#import-open').focus();
  const chooser=page.waitForEvent('filechooser');await page.keyboard.press('Enter');
  await (await chooser).setFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(previous))});
  await expect(page.locator('#import-preview')).toBeVisible();
  await expect(page.locator('#import-details')).toContainText('fixture/project');
  await expect(page.locator('#import-details')).toContainText('Not recorded');
  await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');
  expect(await storage(page)).toBe(before);
  await page.locator('#import-apply').click();await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');
  await expect(page.locator('#comparison')).toContainText('Imported JSON baseline');
  await page.locator('[data-days="7"]').click();await expect(page.locator('#comparison')).toContainText('always uses 30-day');
  const exported=await downloadReport(page,'json',info);expect(exported.schema).toBe(1);expect(exported.selectedDays).toBe(7);expect(exported.comparison.baselineOrigin).toBe('imported-json');expect(exported.comparison.commitDelta).toBe(1);
  await downloadReport(page,'png',info);
  expect(await storage(page)).toBe(before);expect(requests).toEqual([]);
  expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#import-preview').screenshot({path:info.outputPath('import-preview.png')});
  await page.locator('#import-restore').click();await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');expect(await storage(page)).toBe(before);
});

test('import persists only on explicit save, retains unverified label after reload, and existing save/delete still work',async({page},info)=>{
  const api=await mockGitHub(page);await page.goto('./');await analyze(page);const previous=await downloadReport(page,'json',info);
  api.revision=1;await analyze(page);await upload(page,previous);await page.locator('#import-apply').click();
  expect(await storage(page)).toBe('{}');await page.locator('#import-save').click();
  await expect(page.locator('#import-status')).toContainText('Imported baseline saved');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('memediff:v1:fixture/project:main:')));
  expect(saved.fetchedAt).toBe(previous.fetchedAt);expect(saved.baselineOrigin).toBe('imported-json');
  await page.reload();await analyze(page);await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');await expect(page.locator('#comparison')).toContainText('Unverified');
  await page.locator('#save').click();await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');await expect(page.locator('#comparison')).not.toContainText('Imported JSON baseline');
  await page.locator('#clear').click();expect(await storage(page)).toBe('{}');
});

test('invalid imports and canceled selection preserve current report, comparison and storage without network traffic',async({page},info)=>{
  await mockGitHub(page);await page.goto('./');await analyze(page);await page.locator('#save').click();
  const valid=await downloadReport(page,'json',info),before=await storage(page),comparison=await page.locator('#comparison').textContent(),requests=[];page.on('request',r=>requests.push(r.url()));
  const cases=[['{','Invalid JSON'],[{...valid,repo:'other/repo'},'Different repository'],[{...valid,token:'11111111111111111111111111111111'},'Different token CA'],[{...valid,branch:'develop'},'Different branch'],[{...valid,commits:[{...valid.commits[0],sha:'bad'}]},'SHA'],[{...valid,fetchedAt:'2026-02-30T00:00:00Z'},'calendar date'],[{...valid,coverage:{...valid.coverage,commits:'true'}},'coverage'],[' '.repeat(2*1024*1024+1),'2 MiB']];
  for(const [data,error]of cases){await upload(page,data);await expect(page.locator('#import-status')).toContainText(error);await expect(page.locator('#report')).toBeVisible();expect(await page.locator('#comparison').textContent()).toBe(comparison);expect(await storage(page)).toBe(before);}
  await upload(page,valid);await expect(page.locator('#import-preview')).toBeVisible();await page.locator('#import-dismiss').click();await expect(page.locator('#import-preview')).toBeHidden();
  await page.locator('#import-file').setInputFiles([]);expect(await page.locator('#comparison').textContent()).toBe(comparison);expect(await storage(page)).toBe(before);expect(requests).toEqual([]);
});

test('partial imported observations stay partial and failed storage does not discard comparison',async({page},info)=>{
  await mockGitHub(page);await page.goto('./');await analyze(page);const previous=await downloadReport(page,'json',info);previous.coverage.releases=false;
  await upload(page,previous);await page.locator('#import-apply').click();await expect(page.locator('#comparison')).toContainText('incomplete collection');
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Blocked');};});await page.locator('#import-save').click();
  await expect(page.locator('#import-status')).toContainText('Could not save');await expect(page.locator('#comparison')).toContainText('Imported JSON baseline');
});

test('a pending file read cannot attach its preview to a later live analysis',async({page},info)=>{
  await mockGitHub(page);await page.goto('./');await analyze(page);const previous=await downloadReport(page,'json',info);
  await page.evaluate(()=>{const read=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>{window.finishImport=async()=>resolve(await read.call(this));});};});
  await upload(page,previous);await expect.poll(()=>page.evaluate(()=>typeof window.finishImport)).toBe('function');
  await analyze(page);await page.evaluate(()=>window.finishImport());await expect(page.locator('#import-preview')).toBeHidden();expect(await storage(page)).toBe('{}');
});

test('real archived schema 1 JSON can be previewed against matching current repository without fetching its URLs',async({page})=>{
  const old=JSON.parse(await readFile(new URL('../docs/examples/memediff-source-2026-11-11.json',import.meta.url),'utf8'));
  await page.route('https://api.github.com/**',route=>route.fulfill({headers:{'access-control-allow-origin':'*'},json:route.request().url().includes('/commits?')?[]:route.request().url().includes('/releases?')?[]:{full_name:old.repo,default_branch:old.branch,private:false}}));
  await page.goto('./');await analyze(page,old.repo);const requests=[];page.on('request',r=>requests.push(r.url()));await upload(page,old);await expect(page.locator('#import-preview')).toBeVisible();await page.locator('#import-apply').click();await expect(page.locator('#comparison')).toContainText('Imported JSON baseline');expect(requests).toEqual([]);
});
