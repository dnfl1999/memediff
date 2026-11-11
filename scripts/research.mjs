import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('.local',{recursive:true});
const html = await (await fetch('https://forks.wiki/launch')).text();
await writeFile('.local/forks-launch.html',html);
console.log([...html.matchAll(/(?:src|href)="([^"]+\.js[^"]*)"/g)].map(m=>m[1]).join('\n'));
