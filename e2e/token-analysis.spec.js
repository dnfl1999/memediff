import {test,expect,mockGitHub,downloadReport,analyze} from './helpers.js';
const ca='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork',other='11111111111111111111111111111111';
async function setup(page,{entries,market=[],...options}={}){
 const api=await mockGitHub(page,options);
 const entry={mint:ca,repo:'fixture/project',kind:'forks',checkedAt:new Date().toISOString(),source:`https://forks.wiki/api/coin?mint=${ca}`};
 await page.route('**/data/forks-index.json',r=>r.fulfill({json:{schema:2,checkedAt:entry.checkedAt,complete:false,entries:entries??[entry]}}));
 await page.route('https://api.dexscreener.com/**',r=>r.fulfill({json:market}));
 await page.goto('./');return api;
}
async function token(page,value=ca){await page.locator('#token-ca').fill(value);await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:20000});}
test('CA-only one click automatically analyzes GitHub and preserves schema, baselines and exports',async({page},info)=>{
 const api=await setup(page);await expect(page.locator('#repo')).toBeHidden();await token(page);
 await expect(page.locator('#report')).toBeVisible();await expect(page.locator('#association')).toContainText('fixture/project');expect(api.requests[0]).toBe('https://api.github.com/repos/fixture/project');
 await page.locator('#save').click();api.revision=1;await token(page);await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');
 await page.locator('[data-days="7"]').click();const data=await downloadReport(page,'json',info);expect(data.schema).toBe(1);expect(data.token).toBe(ca);expect(data.selectedDays).toBe(7);expect(data.comparison.observed).toEqual(['d'.repeat(40)]);expect(data).not.toHaveProperty('market');
 await downloadReport(page,'png',info);await page.locator('#clear').click();await expect(page.locator('#comparison')).toContainText('No saved baseline');
 await page.screenshot({path:info.outputPath('ca-linked.png'),fullPage:true});
});
test('live demo uses the official CA with no repository input or second click',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Try Live Demo',exact:true}).click();await expect(page.locator('#report')).toBeVisible();await expect(page.locator('#token-ca')).toHaveValue(ca);await expect(page.locator('#repo')).toBeHidden();
});
test('unlinked exact-CA market data is shown with separate FDV, cap, unknown liquidity and zero volume',async({page},info)=>{
 const api=await setup(page,{entries:[],market:[{chainId:'ethereum',baseToken:{address:other,name:'Wrong chain'}},{chainId:'solana',baseToken:{address:other,name:'Example token',symbol:'EXAMPLE'},pairAddress:ca,priceUsd:'0.01',fdv:123,marketCap:45,liquidity:null,volume:{h24:0}}]});await token(page,other);
 await expect(page.locator('#association')).toContainText('No verified GitHub repository found.');await expect(page.locator('#token-result-title')).toHaveText('Example token / EXAMPLE');await expect(page.locator('#market-metrics strong')).toHaveText(['$0.01','$123.00','$45.00','Unknown','$0.00']);expect(api.requests).toHaveLength(0);await expect(page.locator('#report')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('ca-unlinked.png'),fullPage:true});
});
test('absent market data does not become zero and invalid CA sends no requests',async({page})=>{
 const api=await setup(page,{entries:[]});let dex=0;page.on('request',r=>{if(r.url().includes('dexscreener'))dex++;});await token(page,'bad');await expect(page.locator('#token-status')).toContainText('Base58');expect(dex).toBe(0);await token(page,other);await expect(page.locator('#market-metrics strong')).toHaveText(['Unknown','Unknown','Unknown','Unknown','Unknown']);expect(api.requests).toHaveLength(0);
});
for(const status of [403,429])test(`market ${status} stays unavailable while known GitHub activity still loads`,async({page,diagnostics})=>{
 await setup(page);diagnostics.expectedStatuses=[status];diagnostics.expectedURLs=['https://api.dexscreener.com/'];await page.route('https://api.dexscreener.com/**',r=>r.fulfill({status,json:{}}));await token(page);await expect(page.locator('#market-status')).toContainText(String(status));await expect(page.locator('#market-metrics strong')).toHaveText(Array(5).fill('Unavailable'));await expect(page.locator('#report')).toBeVisible();
});
test('network/CORS failure does not fabricate market values',async({page,diagnostics})=>{
 await setup(page,{entries:[]});diagnostics.allowApiAbort=true;diagnostics.expectedURLs=['https://api.dexscreener.com/'];await page.route('https://api.dexscreener.com/**',r=>r.abort('failed'));await token(page,other);await expect(page.locator('#market-status')).toContainText('network or browser CORS');await expect(page.locator('#report')).toBeHidden();
});
test('index failure keeps token information and blocks guessed GitHub requests',async({page,diagnostics})=>{
 const api=await setup(page);diagnostics.expectedStatuses=[503];diagnostics.expectedURLs=[new URL('data/forks-index.json',page.url()).href];await page.route('**/data/forks-index.json',r=>r.fulfill({status:503,json:{}}));await token(page);await expect(page.locator('#association')).toContainText('Association lookup Unavailable');await expect(page.locator('#token-result')).toBeVisible();expect(api.requests).toHaveLength(0);
});
test('stale association is not auto-analyzed and direct GitHub still works',async({page})=>{
 const api=await setup(page,{entries:[{mint:ca,kind:'forks',repo:'fixture/project',source:`https://forks.wiki/api/coin?mint=${ca}`,checkedAt:new Date(Date.now()-49*3600000).toISOString()}]});await token(page);await expect(page.locator('#association')).toContainText('older than 48 hours');expect(api.requests).toHaveLength(0);await analyze(page);await expect(page.locator('#report')).toBeVisible();await expect(page.locator('#token-result')).toBeHidden();
});
test('GitHub 404 preserves observed token information and explains development failure',async({page,diagnostics})=>{
 diagnostics.expectedStatuses=[404];await setup(page,{error:404});await token(page);await expect(page.locator('#association')).toContainText('404');await expect(page.locator('#token-result')).toBeVisible();await expect(page.locator('#report')).toBeHidden();
});
test('timeout and cancellation restore controls without stale development exports',async({page,diagnostics})=>{
 await setup(page,{entries:[]});diagnostics.allowApiAbort=true;diagnostics.expectedURLs=['https://api.dexscreener.com/'];
 let release;const gate=new Promise(r=>release=r);await page.route('https://api.dexscreener.com/**',async r=>{await gate;await r.abort().catch(()=>{});});
 await page.clock.install();await page.locator('#token-ca').fill(other);await page.locator('#analyze-token').click();await page.clock.fastForward(11000);await expect(page.locator('#market-status')).toContainText('timed out');await expect(page.locator('#analyze-token')).toBeEnabled();
 await page.locator('#analyze-token').click();await page.locator('#cancel-token').click();await expect(page.locator('#token-status')).toContainText('canceled');await expect(page.locator('#analyze-token')).toBeEnabled();await expect(page.locator('#report')).toBeHidden();release();
});
