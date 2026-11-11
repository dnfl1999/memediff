import {test,expect} from './helpers.js';
test('official brand assets load, hero CTA works and reduced motion is respected',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 const images=page.locator('img');await expect(images).toHaveCount(3);
 for(const image of await images.all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth===512)).toBe(true);}
 await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content','https://dnfl1999.github.io/memediff/assets/social-preview.png');
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
 await page.getByRole('link',{name:'Analyze a token',exact:false}).click();await expect(page).toHaveURL(/#analyzer$/);
 await expect(page.locator('#token-ca')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('brand-home.png'),fullPage:true});
});
