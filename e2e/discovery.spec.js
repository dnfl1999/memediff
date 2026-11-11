import {test,expect,mockGitHub,downloadReport} from './helpers.js';
const ca='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
async function open(page){await page.goto('./');await page.locator('#advanced > summary').click();await page.locator('#advanced details > summary').click();}
test('name search supports keyboard selection, safe text and existing analysis',async({page},info)=>{
 await mockGitHub(page);let searches=0;
 await page.route('https://api.github.com/search/repositories?**',route=>{searches++;return route.fulfill({json:{items:[{full_name:'fixture/project',private:false,description:'<img src=x onerror=alert(1)>'}],incomplete_results:true}});});
 await open(page);await page.locator('#search-name').fill('fixture');expect(searches).toBe(0);await page.locator('#search-name').press('Enter');
 const select=page.getByRole('button',{name:'Select fixture/project',exact:true});await expect(select).toBeVisible();await expect(page.locator('#discovery-status')).toContainText('incomplete');await expect(page.locator('#discovery-results img')).toHaveCount(0);
 await select.focus();await page.keyboard.press('Enter');await expect(page.locator('#repo')).toBeFocused();await expect(page.locator('#repo')).toHaveValue('fixture/project');await page.locator('#analyze').click();await expect(page.locator('#report')).toBeVisible();expect(searches).toBe(1);await page.screenshot({path:info.outputPath('discovery.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('search empty results and API rate limit provide recovery without retry',async({page,diagnostics})=>{
 let count=0;diagnostics.expectedStatuses=[429];await page.route('https://api.github.com/search/**',r=>{count++;return count===1?r.fulfill({json:{items:[]}}):r.fulfill({status:429,headers:{'retry-after':'60','access-control-expose-headers':'retry-after'},json:{}});});await open(page);await page.locator('#search-name').fill('unknown');await page.locator('#search-submit').click();await expect(page.locator('#discovery-status')).toContainText('No public repository matches');await page.locator('#search-submit').click();await expect(page.locator('#discovery-status')).toContainText('Retry after 60 seconds');expect(count).toBe(2);await expect(page.locator('#search-submit')).toBeEnabled();
});
