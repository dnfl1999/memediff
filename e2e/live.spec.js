import {test,expect,downloadReport,downloadPeriodExports,openAdvanced} from './helpers.js';
import {classifyLiveResponses,limited} from './http-evidence.js';
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
 const classifications=classifyLiveResponses(data);
 const expected=data.filter((_,i)=>classifications[i].expected);
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
 if (!githubLimited) {
   await indexHealth(page).getByRole('button',{name:'Open Advanced Search'}).click();
   await page.clock.setFixedTime(Date.now());
   await page.locator('#repo').fill('dnfl1999/memediff');
   await page.locator('#analyze').click();
   await expect(page.locator('#analyze')).toBeEnabled({timeout:50000});
   await evidence(responses,diagnostics,info);
   await expect(page.locator('#report-title')).toHaveText('dnfl1999/memediff');
   await expect(page.getByRole('region',{name:'Compare Two Periods'})).toBeVisible();
   await info.attach('LIVE-expired-direct-report',{contentType:'application/json',body:JSON.stringify({expiredIndexChecked:true,
     repo:'dnfl1999/memediff',directReportVisible:true,periodComparisonVisible:true})});
 }
});
test('LIVE general Solana meme token shows exact-CA market information without invented repository',async({page,diagnostics},info)=>{
 const mint='DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',responses=capture(page);await page.goto('./');await page.locator('#token-ca').fill(mint);await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:20000});const observed=await evidence(responses,diagnostics,info);
 expect(observed.some(r=>r.url.includes('api.github.com/'))).toBe(false);await expect(page.locator('#association')).toContainText('No verified GitHub repository found.');await expect(page.locator('#observed-ca')).toContainText(mint);await expect(page.locator('#token-result-title')).toContainText(/bonk/i);await expect(page.locator('#market-status')).toContainText('Market data observed');await expect(page.locator('#report')).toBeHidden();
 await page.screenshot({path:info.outputPath('LIVE-ca-unlinked.png'),fullPage:true});
});
test('LIVE Advanced Search preserves direct GitHub and name search',async({page,diagnostics},info)=>{
 test.skip(githubLimited,'Previous live GitHub rate limit; no further GitHub requests.');const responses=capture(page);const requests=[];
 page.on('request',request=>{if(/^https:\/\/(api.github.com|api.dexscreener.com)\//.test(request.url()))requests.push(request.url());});
 await page.goto('./');await openAdvanced(page);await page.locator('#repo').fill('dnfl1999/memediff');await page.locator('#analyze').click();await expect(page.locator('#analyze')).toBeEnabled({timeout:50000});await evidence(responses,diagnostics,info);await expect(page.locator('#report-title')).toHaveText('dnfl1999/memediff');
 const downloaded=await downloadReport(page,'json',info);
 const day=86400000,end=Date.parse(downloaded.fetchedAt),since=Date.parse(downloaded.since);
 const dayStart=Date.parse(downloaded.fetchedAt.slice(0,10));
 const utcDay=offset=>new Date(dayStart+offset*day).toISOString().slice(0,10);
 const choices=[['A',utcDay(-13),utcDay(-7)],['B',utcDay(-6),utcDay(0)]];
 const raw=async path=>(await Promise.all(responses
   .filter(response=>response.status()===200&&new URL(response.url()).pathname===`/repos/dnfl1999/memediff/${path}`)
   .map(response=>response.json()))).flat();
 const commits=await raw('commits'), releases=await raw('releases');
 const requestCount=requests.length;
 const comparison=page.getByRole('region',{name:'Compare Two Periods'});
 for(const [key,start,last] of choices){
   await comparison.getByLabel(`Period ${key} start date`).fill(start);
   await comparison.getByLabel(`Period ${key} end date`).fill(last);
 }
 await comparison.getByRole('button',{name:'Compare periods'}).click();
 const files=await downloadPeriodExports(page,info);
 expect(files.json.repository).toMatchObject({name:downloaded.repo,branch:downloaded.branch,url:'https://github.com/dnfl1999/memediff'});
 expect(files.json.collection).toMatchObject({startUtc:downloaded.since,endInclusiveUtc:downloaded.fetchedAt});
 expect(files.json.observedAtUtc).toBe(downloaded.fetchedAt);
 const number=(n,complete)=>n?new Intl.NumberFormat('en-US').format(n)+(complete?'':' observed'):complete?'0':'Unknown';
 const verified=[];
 for(const [key,start,last] of choices){
   const from=Math.max(since,Date.parse(start)),until=Math.min(end+1,Date.parse(last)+day);
   const contains=value=>Date.parse(value)>=from&&Date.parse(value)<until;
   const shas=new Map(commits.filter(row=>contains(row.commit.committer.date)).map(row=>[row.sha.toLowerCase(),row]));
   const publicReleases=new Map(releases.filter(row=>!row.draft&&contains(row.published_at)).map(row=>[row.id,row]));
   const linkedAuthors=new Set([...shas.values()].map(row=>row.author?.login?.toLowerCase()).filter(Boolean));
   const unlinked=[...shas.values()].filter(row=>!row.author?.login).length;
   const exported=files.json.periods[key.toLowerCase()];
   const confirmed=(count,complete)=>count||complete?count:null;
   expect(exported.selected).toEqual({startDateUtc:start,endDateUtc:last});
   expect(exported.effective).toEqual({startUtc:new Date(from).toISOString(),endExclusiveUtc:new Date(until).toISOString(),lastIncludedUtc:new Date(until-1).toISOString()});
   expect(exported.counts).toMatchObject({commits:confirmed(shas.size,downloaded.coverage.commits),
     releases:confirmed(publicReleases.size,downloaded.coverage.releases),authors:confirmed(linkedAuthors.size,downloaded.coverage.commits),
     unlinkedCommits:confirmed(unlinked,downloaded.coverage.commits)});
   expect(exported.commits.map(row=>row.sha.toLowerCase()).sort()).toEqual([...shas.keys()].sort());
   for(const row of exported.commits)expect(row.url).toBe(`https://github.com/dnfl1999/memediff/commit/${row.sha}`);
   expect(exported.releases.map(row=>row.id).sort()).toEqual([...publicReleases.keys()].sort());
   for(const row of exported.releases)expect(row.url).toBe(publicReleases.get(row.id).html_url);
   await expect(comparison.getByRole('link',{name:`Period ${key} commits evidence: ${number(shas.size,downloaded.coverage.commits)}`,exact:true})).toBeVisible();
   await expect(comparison.getByRole('link',{name:`Period ${key} releases evidence: ${number(publicReleases.size,downloaded.coverage.releases)}`,exact:true})).toBeVisible();
   const card=comparison.getByRole('article',{name:`Period ${key} evidence`});
   await expect(card.locator('summary').last()).toHaveText(`Linked GitHub authors · ${number(linkedAuthors.size,downloaded.coverage.commits)}`);
   if(shas.size){
     const items=card.locator('details').first();
     await items.locator('summary').click();
     await expect(items.locator('.period-sha')).toHaveCount(shas.size);
     const actual=await items.locator('.period-sha').evaluateAll(links=>links.map(link=>link.href.split('/').at(-1).toLowerCase()));
     expect(actual.sort()).toEqual([...shas.keys()].sort());
   }
   verified.push({period:key,startDate:start,endDate:last,from:new Date(from).toISOString(),through:new Date(until-1).toISOString(),
     durationMs:Math.min(end,Date.parse(last)+day)-from,commits:shas.size,releases:publicReleases.size,authors:linkedAuthors.size,
     unlinkedCommits:[...shas.values()].filter(row=>!row.author?.login).length});
 }
 expect(requests).toHaveLength(requestCount);
 await info.attach('LIVE-period-comparison',{contentType:'application/json',body:JSON.stringify({repo:downloaded.repo,branch:downloaded.branch,
   since:downloaded.since,observedAt:downloaded.fetchedAt,coverage:downloaded.coverage,verifiedAgainstGitHubResponses:true,
   additionalAPIRequests:requests.length-requestCount,periods:verified,json:files.jsonFile,png:files.pngFile})});
 await page.locator('#advanced details > summary').click();await page.locator('#search-name').fill('memediff');await page.locator('#search-submit').click();await expect(page.locator('#search-submit')).toBeEnabled({timeout:20000});await evidence(responses,diagnostics,info);await expect(page.locator('#discovery-results button').first()).toBeVisible();
});
