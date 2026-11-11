import { mkdir, writeFile } from 'node:fs/promises';
import { createForksIndex } from '../src/discovery.js';
const urls=['https://forks.wiki/api/tokens/recent','https://forks.wiki/api/tokens?repos=dnfl1999%2Fmemediff'];
const responses=await Promise.all(urls.map(async url=>{
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`Official Forks API returned ${r.status}; no retry or inferred associations.`);
  return r.json();
}));
const index=createForksIndex(...responses,new Date().toISOString());
await mkdir('data',{recursive:true});
await writeFile('data/forks-index.json',JSON.stringify(index,null,2)+'\n');
console.log(`Indexed ${index.entries.length} exact-mint associations from the official API at ${index.checkedAt}.`);
