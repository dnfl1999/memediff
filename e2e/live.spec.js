import {test,expect,downloadReport,openAdvanced} from './helpers.js';
test.setTimeout(70000);
const official='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
let githubLimited=false;
function capture(page){const responses=[];page.on('response',r=>{if(/^https:\/\/(api.github.com|api.dexscreener.com)\//.test(r.url()))responses.push(r);});return responses;}
async function evidence(responses,diagnostics,info){
 const data=responses.map(r=>({url:r.url(),status:r.status(),remaining:r.headers()['x-ratelimit-remaining'],reset:r.headers()['x-ratelimit-reset']}));
 await info.attach('LIVE-api-evidence',{body:JSON.stringify({mocked:false,authenticated:false,observedAt:new Date().toISOString(),responses:data}),contentType:'application/json'});
 const limited=data.filter(r=>[403,429].includes(r.status));
 if(limited.length){diagnostics.expectedStatuses=[403,429];diagnostics.expectedURLs=['https://api.dexscreener.com/'];if(limited.some(r=>r.url.includes('api.github.com/')))githubLimited=true;test.skip(true,'Real API limited; evidence attached, no retry.');}
 expect(data.every(r=>r.status===200)).toBe(true);return data;
}
for(const [name,mint,repo]of [['MEMEDIFF',official,'dnfl1999/memediff'],['another Forks coin','ErSkb1HfhfihdCgqaAztAfWzpNHwLw4AzjA1EVWJfork','riansj2290/remote-ikan']])test(`LIVE CA-only ${name} auto-analysis and development exports`,async({page,diagnostics},info)=>{
 test.skip(githubLimited,'Previous live GitHub rate limit; no further GitHub requests.');
 const responses=capture(page);await page.goto('./');await expect(page.locator('#repo')).toBeHidden();
 await page.locator('#token-ca').fill(mint);await page.locator('#analyze-token').click();await expect(page.locator('#analyze-token')).toBeEnabled({timeout:55000});
 await evidence(responses,diagnostics,info);await expect(page.locator('#report-title')).toHaveText(repo);await expect(page.locator('#association')).toContainText('Exact CA');await expect(page.locator('#token-result')).toBeVisible();
 const data=await downloadReport(page,'json',info);expect(data.schema).toBe(1);expect(data.token).toBe(mint);expect(data.repo.toLowerCase()).toBe(repo);expect(data.source).toBe('github-live');expect(data.coverage).toMatchObject({commits:true,releases:true});
 await page.locator('[data-days="7"]').click();await page.locator('#save').click();await expect(page.locator('#comparison strong')).toHaveText('0 newly observed');await page.locator('#clear').click();await downloadReport(page,'png',info);
 await page.screenshot({path:info.outputPath('LIVE-ca-linked.png'),fullPage:true});
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
