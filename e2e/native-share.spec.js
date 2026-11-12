import {test,expect,mockGitHub,analyze,downloadReport} from './helpers.js';
const ca='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork',other='11111111111111111111111111111111',url='https://dnfl1999.github.io/memediff/?ca='+ca;
async function stub(page,mode='completed') {
  await page.evaluate(mode=>{
    window.shareCalls=[];window.copyCalls=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copyCalls.push(value);if(mode==='no-clipboard')throw Error('Denied');}}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:mode==='false'?()=>false:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,value:['unsupported','no-clipboard'].includes(mode)?undefined:data=>{
      window.shareCalls.push(data);
      if(mode==='pending')return new Promise(resolve=>window.finishShare=resolve);
      if(mode==='canceled'||mode==='failed')return Promise.reject(new DOMException('Test only',mode==='canceled'?'AbortError':'NotAllowedError'));
      return Promise.resolve();
    }});
  },mode);
}
test('keyboard native share hands off only CA and preserves loaded report, import, storage and network',async({page},info)=>{
  await mockGitHub(page);await page.goto('./?ca='+ca+'&private=secret#private-report');await analyze(page);await page.locator('#save').click();const previous=await downloadReport(page,'json',info);
  await page.locator('#import-file').setInputFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(previous))});await page.locator('#import-apply').click();
  const before=await page.evaluate(()=>JSON.stringify(localStorage)),comparison=await page.locator('#comparison').textContent(),requests=[];page.on('request',r=>requests.push(r.url()));await stub(page);
  await page.getByRole('button',{name:'Share',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#share-status')).toContainText('Delivery to a recipient is not confirmed');
  expect(await page.evaluate(()=>window.shareCalls)).toEqual([{url}]);expect(await page.evaluate(()=>window.copyCalls)).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);expect(await page.locator('#comparison').textContent()).toBe(comparison);expect(requests).toEqual([]);
  await expect(page.locator('#native-share')).toBeEnabled();await expect(page.locator('#copy-analysis-link')).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.share-controls').screenshot({path:info.outputPath('native-share.png')});
});
test('unsupported sharing and canShare false reuse copy; clipboard denial still offers manual selection',async({page})=>{
  await page.goto('./?ca='+ca);
  for(const mode of ['unsupported','false','no-clipboard']){
    await stub(page,mode);await page.locator('#native-share').click();await expect(page.locator('#share-status')).toContainText('Native sharing unavailable');
    await expect(page.locator('#analysis-link')).toHaveValue(url);expect(await page.evaluate(()=>window.shareCalls)).toEqual([]);expect(await page.evaluate(()=>window.copyCalls)).toEqual([url]);
    if(mode==='no-clipboard'){await expect(page.locator('#analysis-link')).toBeFocused();expect(await page.locator('#analysis-link').evaluate(e=>e.selectionEnd-e.selectionStart)).toBe(url.length);}
    else await expect(page.locator('#share-status')).toContainText('Analysis link copied');
  }
});
test('cancel never copies; native failure provides an explicit copy choice and permits retry',async({page})=>{
  await page.goto('./?ca='+ca);
  for(const mode of ['canceled','failed']){
    await stub(page,mode);await page.locator('#native-share').click();await expect(page.locator('#share-status')).toContainText(mode==='canceled'?'Share canceled':'Native sharing could not complete');expect(await page.evaluate(()=>window.copyCalls)).toEqual([]);await expect(page.locator('#native-share')).toBeEnabled();
    if(mode==='failed'){await page.locator('#copy-analysis-link').click();await expect(page.locator('#share-status')).toContainText('Analysis link copied');expect(await page.evaluate(()=>window.copyCalls)).toEqual([url]);}
  }
  await stub(page);await page.locator('#native-share').click();await expect(page.locator('#share-status')).toContainText('Share request handed');
});
test('pending native share serializes both buttons and stale completion cannot describe an edited CA',async({page})=>{
  await page.goto('./?ca='+ca);await stub(page,'pending');await page.locator('#native-share').click();await expect(page.locator('#native-share')).toBeDisabled();await expect(page.locator('#copy-analysis-link')).toBeDisabled();
  await page.evaluate(()=>{for(let i=0;i<3;i++){document.getElementById('native-share').dispatchEvent(new Event('click'));document.getElementById('copy-analysis-link').dispatchEvent(new Event('click'));}});
  expect(await page.evaluate(()=>window.shareCalls)).toEqual([{url}]);expect(await page.evaluate(()=>window.copyCalls)).toEqual([]);
  await page.locator('#token-ca').fill(other);await page.evaluate(()=>window.finishShare());await expect(page.locator('#native-share')).toBeEnabled();await expect(page.locator('#copy-analysis-link')).toBeEnabled();await expect(page.locator('#share-status')).toContainText('Share only');
  await stub(page);await page.locator('#native-share').click();expect(await page.evaluate(()=>window.shareCalls)).toEqual([{url:'https://dnfl1999.github.io/memediff/?ca='+other}]);
});
test('pending clipboard copy also blocks native share until completion',async({page})=>{
  await page.goto('./?ca='+ca);await stub(page);await page.evaluate(()=>{navigator.clipboard.writeText=()=>new Promise(resolve=>window.finishCopy=resolve);});await page.locator('#copy-analysis-link').click();await expect(page.locator('#native-share')).toBeDisabled();
  await page.evaluate(()=>document.getElementById('native-share').dispatchEvent(new Event('click')));expect(await page.evaluate(()=>window.shareCalls)).toEqual([]);await page.evaluate(()=>window.finishCopy());await expect(page.locator('#native-share')).toBeEnabled();
});
test('invalid input invokes neither native share nor clipboard and leaves existing storage untouched',async({page})=>{
  await page.goto('./');await stub(page);await page.evaluate(()=>localStorage.setItem('privacy-check','private report'));const before=await page.evaluate(()=>JSON.stringify(localStorage));
  for(const value of ['', 'javascript:alert(1)', '0'.repeat(44)]){await page.locator('#token-ca').fill(value);await page.locator('#native-share').click();await expect(page.locator('#share-status')).toHaveClass(/error/);}
  expect(await page.evaluate(()=>window.shareCalls)).toEqual([]);expect(await page.evaluate(()=>window.copyCalls)).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);
});
