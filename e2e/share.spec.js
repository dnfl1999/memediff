import {test,expect,mockGitHub,downloadReport} from './helpers.js';
const ca='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork',other='11111111111111111111111111111111';
const home='https://dnfl1999.github.io/memediff/';
async function setup(page){
  const api=await mockGitHub(page),requests=[];
  page.on('request',r=>{if(/^https:\/\/api\./.test(r.url())||r.url().includes('/data/forks-index.json'))requests.push(r.url());});
  const entry={mint:ca,repo:'fixture/project',kind:'forks',checkedAt:new Date().toISOString(),source:`https://forks.wiki/api/coin?mint=${ca}`};
  await page.route('**/data/forks-index.json',r=>r.fulfill({json:{schema:2,checkedAt:entry.checkedAt,entries:[entry]}}));
  await page.route('https://api.dexscreener.com/**',r=>r.fulfill({json:[]}));return{api,requests};
}
test('shared and directly entered CA use the same analysis; sharing preserves import, baseline, timeline and exports',async({page,context},info)=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);const {requests}=await setup(page);
  await page.goto('./?ca='+ca+'&repo=evil/repo&redirect=https://evil.invalid#private-data');
  await expect(page.locator('#token-ca')).toHaveValue(ca);await expect(page.locator('#share-status')).toContainText('No analysis has run');
  await expect(page.locator('#share-context')).toContainText('matches the official MEMEDIFF');await expect(page.locator('#token-result')).toBeHidden();await expect(page.locator('#report')).toBeHidden();expect(requests).toEqual([]);
  await page.locator('#analyze-token').click();await expect(page.locator('#report')).toBeVisible();await expect(page.locator('#analyze-token')).toBeEnabled();const shared=await downloadReport(page,'json',info);const firstRequests=[...requests];
  await page.locator('#token-ca').fill(ca);await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled();const direct=await downloadReport(page,'json',info);expect(direct.metrics).toEqual(shared.metrics);expect(direct.token).toBe(shared.token);expect(direct.repo).toBe(shared.repo);const paths=urls=>urls.map(value=>{const u=new URL(value);return u.origin+u.pathname;});expect(paths(requests.slice(firstRequests.length))).toEqual(paths(firstRequests));expect(Date.parse(direct.fetchedAt)).toBeGreaterThan(Date.parse(shared.fetchedAt));
  await page.locator('#save').click();await page.locator('#import-file').setInputFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(shared))});await page.locator('#import-apply').click();await expect(page.locator('.observation-timeline')).toBeVisible();
  const stored=await page.evaluate(()=>JSON.stringify(localStorage)),comparison=await page.locator('#comparison').textContent(),count=requests.length;
  await page.locator('#copy-analysis-link').focus();await page.keyboard.press('Enter');await expect(page.locator('#share-status')).toContainText('Analysis link copied');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(home+'?ca='+ca);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(stored);expect(await page.locator('#comparison').textContent()).toBe(comparison);expect(requests.length).toBe(count);
  await page.locator('[data-days="7"]').click();const output=await downloadReport(page,'json',info);expect(output.comparison.baselineOrigin).toBe('imported-json');expect(output.selectedDays).toBe(7);await downloadReport(page,'png',info);
  await page.locator('#share-fallback').scrollIntoViewIfNeeded();await page.locator('.share-controls').screenshot({path:info.outputPath('share-link.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('arbitrary valid CA stays distinct from MEMEDIFF and never invents a repository',async({page})=>{
  const {api,requests}=await setup(page);await page.goto('./?ca='+other);await expect(page.locator('#share-context')).toContainText('not the official MEMEDIFF');expect(requests).toEqual([]);
  await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled();await expect(page.locator('#association')).toContainText('No verified GitHub repository found');expect(api.requests).toEqual([]);await expect(page.locator('#report')).toBeHidden();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.locator('#copy-analysis-link').click();await expect(page.locator('#analysis-link')).toHaveValue(home+'?ca='+other);
});
test('clipboard rejection and unavailable API expose a selectable manual-copy link',async({page})=>{
  await setup(page);await page.goto('./?ca='+ca);
  for(const missing of [false,true]){
    await page.evaluate(missing=>Object.defineProperty(navigator,'clipboard',{value:missing?undefined:{writeText:async()=>{throw Error('Denied')}},configurable:true}),missing);
    await page.locator('#copy-analysis-link').click();await expect(page.locator('#share-status')).toContainText('Clipboard unavailable');await expect(page.locator('#analysis-link')).toBeFocused();await expect(page.locator('#analysis-link')).toHaveValue(home+'?ca='+ca);
    expect(await page.locator('#analysis-link').evaluate(e=>e.selectionEnd-e.selectionStart)).toBe((home+'?ca='+ca).length);await expect(page.locator('#copy-analysis-link')).toBeEnabled();
  }
});
test('invalid and malicious shared parameters retain the ordinary screen without requests or redirects',async({page})=>{
  const {requests}=await setup(page);
  for(const query of ['ca=','ca='+ca+'&ca='+other,'ca=%20'+ca,'ca=%FF','ca='+encodeURIComponent('https://evil.invalid/'),'ca='+encodeURIComponent('<script>window.__xss=1</script>')]){
    await page.goto('./?'+query);await expect(page.locator('#share-status')).toContainText('Invalid shared CA');await expect(page.locator('#token-ca')).toHaveValue('');await expect(page.locator('#report')).toBeHidden();await expect(page.locator('#token-result')).toBeHidden();expect(new URL(page.url()).pathname).toMatch(/\/$/);expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  }
  expect(requests).toEqual([]);await page.locator('#token-ca').fill(ca);await page.locator('#analyze-token').click();await expect(page.locator('#report')).toBeVisible();
});
test('normal visits ignore unrelated parameters and invalid manual CA cannot copy a stale link',async({page})=>{
  const {requests}=await setup(page);await page.goto('./?redirect=https://evil.invalid&repo=evil/repo');await expect(page.locator('#token-ca')).toHaveValue('');await expect(page.locator('#share-status')).toContainText('Share only');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text}},configurable:true}));
  await page.locator('#token-ca').fill(ca);await page.locator('#copy-analysis-link').click();await expect(page.locator('#share-status')).toContainText('copied');
  await page.locator('#token-ca').fill('javascript:alert(1)');await expect(page.locator('#share-fallback')).toBeHidden();await page.locator('#copy-analysis-link').click();await expect(page.locator('#share-status')).toContainText('Solana address');expect(await page.evaluate(()=>window.copied)).toBe(home+'?ca='+ca);expect(requests).toEqual([]);
});
test('late clipboard completion cannot label an edited CA as copied',async({page})=>{
  await setup(page);await page.goto('./?ca='+ca);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>new Promise(resolve=>window.finishCopy=resolve)},configurable:true}));
  await page.locator('#copy-analysis-link').click();await expect(page.locator('#copy-analysis-link')).toBeDisabled();await page.locator('#token-ca').fill(other);await page.evaluate(()=>window.finishCopy());await expect(page.locator('#copy-analysis-link')).toBeEnabled();await expect(page.locator('#share-status')).toContainText('Share only');await expect(page.locator('#share-fallback')).toBeHidden();
});
test('shared-link reload does not read or overwrite existing browser baselines',async({page})=>{
  const {requests}=await setup(page);await page.goto('./');await page.evaluate(()=>localStorage.setItem('memediff:v1:fixture/project:main:','private baseline marker'));
  const before=await page.evaluate(()=>JSON.stringify(localStorage));await page.goto('./?ca='+ca);await expect(page.locator('#share-status')).toContainText('No analysis has run');await page.reload();await expect(page.locator('#share-status')).toContainText('No analysis has run');expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);expect(requests).toEqual([]);
});
