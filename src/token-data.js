import { parseRepo, parseToken } from './core.js';
export const OFFICIAL_CA='DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork';
export const MAX_ASSOCIATION_AGE=48*60*60*1000;
export class LookupError extends Error { constructor(kind,message){super(message);this.name='LookupError';this.kind=kind;} }
export async function readJSON(url,{fetcher=fetch,signal,timeout=10000}={}) {
  const controller=new AbortController(); let timedOut=false;
  const abort=()=>controller.abort(); if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
  try {
    const r=await fetcher(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
    if(r.status===403)throw new LookupError('forbidden','Access denied (403). This source is unavailable.');
    if(r.status===429)throw new LookupError('rate-limit',`API request limit (429). ${r.headers.get('retry-after')?`Retry after ${r.headers.get('retry-after')}.`:'Please try again later.'} No automatic retry was made.`);
    if(!r.ok)throw new LookupError('http',`Source unavailable (HTTP ${r.status}).`);
    try{return await r.json();}catch(e){if(controller.signal.aborted)throw e;throw new LookupError('data','Source returned unreadable data.');}
  }catch(e){
    if(timedOut)throw new LookupError('timeout','Source timed out. Please try again later.');
    if(signal?.aborted)throw new LookupError('canceled','Token analysis canceled.');
    if(e instanceof LookupError)throw e;
    throw new LookupError('network','Source unavailable: a network or browser CORS failure prevented access.');
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function verifyForksCoin(input,data,checkedAt=new Date().toISOString()){
  const mint=parseToken(input),coin=data?.coin;
  if(!mint||data?.ok!==true||coin?.kind!=='forks'||coin.mint!==mint||typeof coin.repo!=='string'||coin.repo.includes('://'))return null;
  try{return{mint,repo:parseRepo(coin.repo),kind:'forks',checkedAt,source:`https://forks.wiki/api/coin?mint=${mint}`,name:typeof coin.name==='string'?coin.name.slice(0,120):null,symbol:typeof coin.symbol==='string'?coin.symbol.slice(0,40):null};}catch{return null;}
}
export function verifiedAssociation(input,index,now=Date.now()){
  const mint=parseToken(input);
  if(index?.schema!==2||!Array.isArray(index.entries))throw new LookupError('data','Verified association index unavailable or incompatible.');
  const entries=index.entries.filter(e=>e.mint===mint);
  if(entries.length!==1)return{match:null,reason:entries.length?'ambiguous':'not-indexed',indexAt:index.checkedAt};
  const entry=entries[0],time=Date.parse(entry.checkedAt);
  if(!Number.isFinite(time)||time>now+60000||now-time>MAX_ASSOCIATION_AGE)return{match:null,reason:'stale',indexAt:index.checkedAt};
  const validated=verifyForksCoin(mint,{ok:true,coin:entry},entry.checkedAt);
  if(!validated||entry.source!==validated.source)return{match:null,reason:'invalid',indexAt:index.checkedAt};
  return{match:validated,reason:'indexed',indexAt:index.checkedAt};
}
function number(value){if(value===null||value===undefined||value===''||typeof value==='boolean')return null;if(typeof value!=='number'&&(typeof value!=='string'||!/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)))return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
export function marketObservation(input,data,observedAt=new Date().toISOString()){
  const mint=parseToken(input);
  if(!Array.isArray(data))throw new LookupError('data','Market API returned an unexpected response.');
  const pairs=data.filter(p=>p?.chainId==='solana'&&p.baseToken?.address===mint&&typeof p.pairAddress==='string');
  // Pair prices describe the base token. Never reuse quote-token prices or sum pools.
  pairs.sort((a,b)=>(number(b.liquidity?.usd)??-1)-(number(a.liquidity?.usd)??-1)||(number(b.volume?.h24)??-1)-(number(a.volume?.h24)??-1)||a.pairAddress.localeCompare(b.pairAddress));
  const pair=pairs[0];
  return{mint,observedAt,source:`https://api.dexscreener.com/tokens/v1/solana/${mint}`,available:!!pair,matchedPairs:pairs.length,name:typeof pair?.baseToken?.name==='string'?pair.baseToken.name.slice(0,120):null,symbol:typeof pair?.baseToken?.symbol==='string'?pair.baseToken.symbol.slice(0,40):null,price:number(pair?.priceUsd),fdv:number(pair?.fdv),marketCap:number(pair?.marketCap),liquidity:number(pair?.liquidity?.usd),volume24h:number(pair?.volume?.h24),pairAddress:pair?.pairAddress||null,pairUrl:pair&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pair.pairAddress)?`https://dexscreener.com/solana/${pair.pairAddress}`:null};
}
export async function fetchMarket(mint,options={}){const validated=parseToken(mint);if(!validated)throw new LookupError('input','Enter a Solana token CA.');const data=await readJSON(`https://api.dexscreener.com/tokens/v1/solana/${validated}`,options);return marketObservation(validated,data);}
