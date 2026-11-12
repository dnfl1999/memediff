import { OFFICIAL_CA } from '../src/token-data.js';
import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['style.css', 'favicon.svg', 'robots.txt', 'sitemap.xml']) await copyFile(file, `dist/${file}`);
await writeFile('dist/index.html', (await readFile('index.html', 'utf8')).replaceAll('{{OFFICIAL_CA}}', OFFICIAL_CA));
await cp('src', 'dist/src', { recursive: true });
await cp('data', 'dist/data', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
console.log('Built static site: dist/');
