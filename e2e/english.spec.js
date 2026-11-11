import { test, expect, mockGitHub, analyze, downloadReport } from './helpers.js';

// The interface must stay English even on a Korean-language device.
test.use({locale:'ko-KR', timezoneId:'Asia/Seoul'});

test('English metadata, UI, validation and UTC dates on a non-English device', async ({page}) => {
  const api=await mockGitHub(page); await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page).toHaveTitle('MemeDiff — Less Hype. More Evidence.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/Track real GitHub activity/);
  await page.locator('#analyze').click();
  await expect(page.locator('#status')).toContainText('Enter a GitHub repository URL');
  expect(api.requests).toHaveLength(0);
  await analyze(page); await page.locator('#save').click();
  await expect(page.locator('#report-meta')).toContainText(/Observed at [A-Z][a-z]{2} \d+, \d{4}, \d{2}:\d{2}:\d{2} UTC/);
  await expect(page.locator('#comparison')).toContainText('UTC');
  const text=await page.evaluate(()=>document.body.textContent+Array.from(document.querySelectorAll('*')).flatMap(e=>['aria-label','alt','title','placeholder'].map(a=>e.getAttribute(a)||'')).join(' '));
  expect(text).not.toMatch(/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u);
  const broken=await page.locator('a[href^="#"]').evaluateAll(links=>links.filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.href));
  expect(broken).toEqual([]);
  for(const url of await page.locator('a[href^="https:"]').evaluateAll(links=>links.map(a=>a.href))) expect(new URL(url).protocol).toBe('https:');
});

test('pre-English schema-1 baseline stays readable and unmodified', async ({page},testInfo) => {
  await mockGitHub(page); await page.goto('./'); await analyze(page);
  const current=await downloadReport(page,'json',testInfo);
  const {comparison,selectedDays,...legacy}=current;
  legacy.methodology='기본 브랜치의 committer timestamp 기준';
  legacy.commits=legacy.commits.slice(0,2); legacy.metrics[30].commits=2;
  const key=`memediff:v1:${legacy.repo}:${legacy.branch}:${legacy.token}`;
  const serialized=JSON.stringify(legacy);
  await page.evaluate(({key,serialized})=>localStorage.setItem(key,serialized),{key,serialized});
  await page.reload(); await analyze(page);
  await expect(page.locator('#comparison strong')).toHaveText('1 newly observed');
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(serialized);
  const exported=await downloadReport(page,'json',testInfo);
  expect(Object.keys(exported).sort()).toEqual(Object.keys(current).sort());
  expect(exported.schema).toBe(1); expect(exported.comparison.commitDelta).toBe(1);
  expect(exported.comparison.observed).toEqual(['c'.repeat(40)]);
  expect(exported.methodology).toMatch(/^Rolling 7\/30-day/);
  await page.locator('#clear').click();
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBeNull();
});

test('English layout fits narrow mobile, tablet and desktop widths', async ({page},testInfo) => {
  await mockGitHub(page); await page.goto('./'); await analyze(page);
  for(const width of [360,768,1024,1440]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const id of ['analyze','save','json','png','clear','copy-ca']) {
      const box=await page.locator(`#${id}`).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width);
    }
    const hero=await page.locator('.hero h1').boundingBox(), art=await page.locator('.hero-art').boundingBox();
    if(art) expect(hero.x+hero.width).toBeLessThan(art.x);
    await page.screenshot({path:testInfo.outputPath(`english-${width}.png`),fullPage:true});
  }
});
