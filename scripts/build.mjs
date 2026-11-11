import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'favicon.svg']) await copyFile(file, `dist/${file}`);
await cp('src', 'dist/src', { recursive: true });
await cp('data', 'dist/data', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
console.log('Built static site: dist/');
