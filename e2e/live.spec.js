import {test,expect,downloadReport,openAdvanced} from './helpers.js';
import {isCommitProcessingTimeout} from '../src/github.js';
import {associationHealth,recordedRefreshFailure} from '../src/index-health.js';
import {marketObservation,MAX_ASSOCIATION_AGE} from '../src/token-data.js';
test.setTimeout(70000);
const official='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
let githubLimited=false;
function capture(page){const responses=[];page.on('response',r=>{if(/^https:\/\/(api.github.com|api.dexscreener.com)\//.test(r.url()))responses.push(r);});return responses;}
async function evidence(responses,diagnostics,info){
 const data=await Promise.all(responses.map(async r=>{
   const status=r.status(),headers=r.headers();
   const body=status>=400?await r.json().catch(()=>null):null;
   const text=value=>typeof value==='string'?value.slice(0,500):undefined;
   const errors=Array.isArray(body?.errors)?body.errors.slice(0,10).map(e=>({resource:text(e?.resource),field:text(e?.field),code:text(e?.code)})):undefined;
   return {url:r.url(),status,remaining:headers['x-ratelimit-remaining'],reset:headers['x-ratelimit-reset'],retryAfter:headers['retry-after'],requestId:headers['x-github-request-id'],
     message:text(body?.message),documentation:text(body?.documentation_url),errors};
 }));
 await info.attach('LIVE-api-evidence',{body:JSON.stringify({mocked:false,authenticated:false,observedAt:new Date().toISOString(),responses:data}),contentType:'application/json'});
 const commitList=r=>/^https:\/\/api.github.com\/repos\/[^/]+\/[^/]+\/commits\?/.test(r.url);
 const empty=r=>r.status===409&&commitList(r)&&/^Git Repository is empty\.?$/i.test(r.message||'');
 const limited=r=>r.status===429||r.status===403&&(r.remaining==='0'||Boolean(r.retryAfter)||/rate limit/i.test(r.message||''));
 const recovered=(r,i)=>r.status===422&&commitList(r)&&isCommitProcessingTimeout(r.message)&&data.slice(i+1).some(later=>later.url===r.url&&later.status===200);
 const expected=data.filter((r,i)=>empty(r)||limited(r)||recovered(r,i));
 diagnostics.expectedResponses=expected.map(({url,status})=>({url,status}));
 expect(data.filter(r=>r.status!==200&&!expected.includes(r)), 'Unrecovered real API responses').toEqual([]);
 if(data.some(limited)){
   if(data.some(r=>limited(r)&&r.url.includes('api.github.com/')))githubLimited=true;
   test.skip(true,'Real API limited; evidence attached, no retry.');
 }
 return data;
}
async function publishedIndex(page){
 const response=await page.request.get(new URL('data/forks-index.json',page.url()).href);
 expect(response.status()).toBe(200);
 return response.json();
}
const indexHealth=page=>page.getByRole('region',{name:'Index health'});
async function recordHealth(info,{health,index,now,clockMode}){
 await info.attach('LIVE-index-health',{contentType:'application/json',body:JSON.stringify({clockMode,indexCheckedAt:index.checkedAt,
   entries:index.entries.length,record:health.record??null,state:health.state,browserTime:new Date(now).toISOString(),
   autoAnalysis:health.state==='fresh'?'eligible':'blocked',recordedFailure:recordedRefreshFailure(index,now)})});
}
async function assertActualMarket(page,responses,mint,info){
 const response=responses.find(r=>r.url()===`https://api.dexscreener.com/tokens/v1/solana/${mint}`);
 expect(response?.status()).toBe(200);
 const payload=await response.json(),observed=marketObservation(mint,payload);
 await info.attach('LIVE-market-outcome',{contentType:'application/json',body:JSON.stringify({mint,status:200,returnedPairs:payload.length,exactPairs:observed.matchedPairs})});
 await expect(page.locator('#market-status')).toContainText(observed.available?'Market data observed':'No matching market data returned');
 if(!observed.available)await expect(page.locator('#market-metrics strong')).toHaveText(Array(5).fill('Unknown'));
}
for(const [name,mint,repo]of [['MEMEDIFF',official,'dnfl1999/memediff'],['another Forks coin','ErSkb1HfhfihdCgqaAztAfWzpNHwLw4AzjA1EVWJfork','riansj2290/remote-ikan']])test(`LIVE CA-only ${name} applies published verification and preserves market information`,async({page,diagnostics},info)=>{
 const responses=capture(page),requests=[];
 page.on('request',r=>requests.push(r.url()));
 await page.goto(name==='MEMEDIFF'?'./?ca='+mint:'./');await expect(page.locator('#repo')).toBeHidden();
 if(name==='MEMEDIFF') {
   await expect(page.locator('#token-ca')).toHaveValue(mint);await expect(page.locator('#share-status')).toContainText('No analysis has run');
   await expect(page.locator('#report')).toBeHidden();await expect(page.locator('#token-result')).toBeHidden();expect(responses).toHaveLength(0);
   expect(requests.filter(url=>url.endsWith('/data/forks-index.json'))).toEqual([]);
 } else await page.locator('#token-ca').fill(mint);
 const index=await publishedIndex(page),now=await page.evaluate(()=>Date.now());
 const health=associationHealth(mint,index,now);
 await recordHealth(info,{health,index,now,clockMode:'actual query time'});
 expect(['fresh','expiring','expired']).toContain(health.state);
 expect(health.record.repo).toBe(repo);
 test.skip(githubLimited&&health.state==='fresh','Previous live GitHub rate limit; Fresh CA would make another GitHub request.');
 await page.clock.setFixedTime(now);
 await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:55000});
 const pane=indexHealth(page);
 await expect(pane).toContainText(health.record.checkedAt);
 await expect(pane.getByRole('status')).toHaveText({fresh:'Fresh',expiring:'Expiring soon',expired:'Expired'}[health.state]);
 if(recordedRefreshFailure(index,now)) await expect(pane.getByRole('link',{name:'Workflow record'})).toBeVisible();
 if(health.state!=='fresh'){
   expect(requests.filter(url=>url.startsWith('https://api.github.com/'))).toEqual([]);
   await expect(page.locator('#report')).toBeHidden();
   await expect(pane.getByRole('button',{name:'Open Advanced Search'})).toBeVisible();
 }
 await evidence(responses,diagnostics,info);
 await assertActualMarket(page,responses,mint,info);
 if(health.state!=='fresh') return;
 await expect(page.locator('#report-title')).toHaveText(repo);await expect(page.locator('#association')).toContainText('Exact CA');await expect(page.locator('#token-result')).toBeVisible();
 const data=await downloadReport(page,'json',info);expect(data.schema).toBe(1);expect(data.token).toBe(mint);expect(data.repo.toLowerCase()).toBe(repo);expect(data.source).toBe('github-live');expect(data.coverage).toMatchObject({commits:true,releases:true});
 await page.locator('[data-days="7"]').click();await page.locator('#save').click();await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');await page.locator('#clear').click();await downloadReport(page,'png',info);
 if(name==='MEMEDIFF') {
   const requestCount=responses.length,stored=await page.evaluate(()=>JSON.stringify(localStorage));
   await page.locator('#copy-analysis-link').click();await expect(page.locator('#analysis-link')).toHaveValue('https://dnfl1999.github.io/memediff/?ca='+mint);await expect(page.locator('#copy-analysis-link')).toBeEnabled();
   await page.locator('#import-file').setInputFiles({name:'actual-schema-1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
   await expect(page.locator('#import-preview')).toBeVisible();await page.locator('#import-apply').click();
   await expect(page.locator('#comparison')).toContainText('Imported JSON baseline');
   await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');
   await expect(page.locator('.observation-timeline')).toContainText(data.since);
   await expect(page.locator('.observation-timeline')).toContainText('Shared interval');
   const explorer=page.getByRole('region',{name:'SHA Explorer'});
   await expect(explorer).toContainText('unverified imported JSON');
   await expect(explorer.getByRole('button',{name:'Newly observed in overlap (0)'})).toBeVisible();
   if(data.commits.length){
     await expect(explorer).toContainText('Observed in both');
     await expect(explorer.getByRole('link').first()).toHaveAttribute('href',/^https:\/\/github\.com\/dnfl1999\/memediff\/commit\/[a-f0-9]{40}$/);
   }
   await explorer.getByRole('button',{name:'Newly observed in overlap (0)'}).click();
   await expect(explorer.getByRole('status')).toHaveText('No SHA observations match this filter.');
   expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(stored);expect(responses.length).toBe(requestCount);
   const imported=await downloadReport(page,'json',info);expect(imported.comparison.baselineOrigin).toBe('imported-json');expect(imported.comparison.windows.overlap.durationMs).toBe(30*86400000);const png=await downloadReport(page,'png',info);expect(png.height).toBe(1260);
 }
 await page.screenshot({path:info.outputPath('LIVE-ca-linked.png'),fullPage:true});
});
test('LIVE MEMEDIFF expiry boundary blocks auto-analysis with the real index and market response',async({page,diagnostics},info)=>{
 const responses=capture(page),github=[];
 page.on('request',r=>{if(r.url().startsWith('https://api.github.com/'))github.push(r.url());});
 await page.goto('./?ca='+official);
 const index=await publishedIndex(page),entry=index.entries.find(item=>item.mint===official);
 expect(entry?.repo).toBe('dnfl1999/memediff');
 const now=Math.max(Date.now(),Date.parse(entry.checkedAt)+MAX_ASSOCIATION_AGE+1);
 await page.clock.setFixedTime(now);
 await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:40000});
 await recordHealth(info,{health:associationHealth(official,index,now),index,now,clockMode:'48-hour expiry boundary, browser clock controlled only'});
 await expect(indexHealth(page).getByRole('status')).toHaveText('Expired');
 await expect(indexHealth(page)).toContainText(entry.checkedAt);
 await expect(page.locator('#report')).toBeHidden();expect(github).toEqual([]);
 await evidence(responses,diagnostics,info);
 await assertActualMarket(page,responses,official,info);
 await indexHealth(page).screenshot({path:info.outputPath('LIVE-index-expired.png')});
});
test('LIVE general Solana meme token shows exact-CA market information without invented repository',async({page,diagnostics},info)=>{
 const mint='DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',responses=capture(page);await page.goto('./');await page.locator('#token-ca').fill(mint);await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:20000});const observed=await evidence(responses,diagnostics,info);
 expect(observed.some(r=>r.url.includes('api.github.com/'))).toBe(false);await expect(page.locator('#association')).toContainText('No verified GitHub repository found.');await expect(page.locator('#observed-ca')).toContainText(mint);await expect(page.locator('#token-result-title')).toContainText(/bonk/i);await expect(page.locator('#market-status')).toContainText('Market data observed');await expect(page.locator('#report')).toBeHidden();
 await page.screenshot({path:info.outputPath('LIVE-ca-unlinked.png'),fullPage:true});
});
test('LIVE Advanced Search preserves direct GitHub and name search',async({page,diagnostics},info)=>{
 test.skip(githubLimited,'Previous live GitHub rate limit; no further GitHub requests.');const responses=capture(page);await page.goto('./');await openAdvanced(page);await page.locator('#repo').fill('dnfl1999/memediff');await page.locator('#analyze').click();await expect(page.locator('#analyze')).toBeEnabled({timeout:50000});await evidence(responses,diagnostics,info);await expect(page.locator('#report-title')).toHaveText('dnfl1999/memediff');
 await page.locator('#advanced details > summary').click();await page.locator('#search-name').fill('memediff');await page.locator('#search-submit').click();await expect(page.locator('#search-submit')).toBeEnabled({timeout:20000});await evidence(responses,diagnostics,info);await expect(page.locator('#discovery-results button').first()).toBeVisible();
});
