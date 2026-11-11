import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseToken} from '../src/core.js';
import {readJSON,verifyForksCoin,OFFICIAL_CA} from '../src/token-data.js';
const recentURL='https://forks.wiki/api/tokens/recent';
const recent=await readJSON(recentURL,{timeout:15000});
if(recent?.ok!==true||!Array.isArray(recent.tokens))throw Error('Invalid recent listing; preserve previous deployment.');
let local={entries:[]},deployed={entries:[]};const warnings=[];
try{local=JSON.parse(await readFile('data/forks-index.json','utf8'));}catch{}
try{deployed=await readJSON('https://dnfl1999.github.io/memediff/data/forks-index.json',{timeout:15000});}catch(e){warnings.push('Previous deployed index unavailable; using checked-in history: '+e.kind);}
const candidates=new Set([OFFICIAL_CA]);
for(const item of [...recent.tokens,...(deployed.entries||[]),...(local.entries||[])]){try{const mint=parseToken(item.mint);if(mint)candidates.add(mint);}catch{}}
const mints=[...candidates].slice(0,200),entries=[],failures=[];let position=0;
async function collect(){while(position<mints.length){const mint=mints[position++];try{const data=await readJSON(`https://forks.wiki/api/coin?mint=${mint}`,{timeout:12000});const entry=verifyForksCoin(mint,data);if(entry)entries.push(entry);else failures.push({mint,reason:'No exact forks-kind repository association'});}catch(e){failures.push({mint,reason:e.kind||'unavailable'});}}}
await Promise.all([collect(),collect(),collect()]);
if(!entries.some(e=>e.mint===OFFICIAL_CA&&e.repo==='dnfl1999/memediff'))throw Error('Official MemeDiff mapping could not be freshly verified; preserve previous deployment.');
entries.sort((a,b)=>a.mint.localeCompare(b.mint));
const index={schema:2,checkedAt:new Date().toISOString(),complete:false,scope:'Recent official listings plus previously observed CA history; each entry rechecked with /api/coin. Not a complete registry.',sources:[recentURL,'https://forks.wiki/api/coin?mint={CA}'],coverage:{recentCount:recent.tokens.length,candidateCount:candidates.size,attempted:mints.length,verified:entries.length,cap:200,capped:candidates.size>200,pagination:'Unconfirmed: tested page/limit/offset returned the same 20 records.'},warnings,failures,entries};
await mkdir('data',{recursive:true});await writeFile('data/forks-index.json',JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({checkedAt:index.checkedAt,coverage:index.coverage,warnings,failures}));
