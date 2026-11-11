// Optional deployment only. No account, resource or public endpoint is created by this file.
import {parseToken} from '../src/core.js';
import {readJSON,verifyForksCoin,LookupError} from '../src/token-data.js';
const ORIGIN='https://dnfl1999.github.io';
export function createWorker({fetcher=fetch,cache=()=>globalThis.caches?.default}={}){
 return {async fetch(request,env,ctx){
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  const url=new URL(request.url);
  if(url.protocol!=='https:')return reply({error:'HTTPS required'},400);
  if(origin!==ORIGIN)return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept','Access-Control-Max-Age':'600'}});
  if(request.method!=='GET'||url.pathname!=='/v1/association'||[...url.searchParams.keys()].some(k=>k!=='mint')||url.searchParams.getAll('mint').length!==1)return reply({error:'Only GET /v1/association?mint=CA is supported'},400);
  let mint;try{mint=parseToken(url.searchParams.get('mint'));if(!mint)throw Error();}catch{return reply({error:'Invalid Solana CA'},400);}
  // Fail closed until an operator configures the native rate limiter binding.
  if(!env?.LIMITER)return reply({error:'Service not configured'},503);
  let allowed;try{allowed=await env.LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});}catch{return reply({error:'Rate limiter unavailable'},503);}
  if(!allowed.success)return reply({error:'Rate limit exceeded'},429);
  const key=new Request(url.origin+'/v1/association?mint='+mint);const store=cache();
  const hit=await store?.match(key);if(hit)return hit;
  try{
    const data=await readJSON('https://forks.wiki/api/coin?mint='+mint,{fetcher: (u,opts)=>fetcher(u,{...opts,redirect:'error'}),timeout:8000});
    if(data?.ok!==true||data.coin?.mint!==mint)throw new LookupError('data','Official API did not return a matching coin response.');
    const checkedAt=new Date().toISOString(),association=verifyForksCoin(mint,data,checkedAt);
    const response=reply({mint,checkedAt,association,complete:true,meaning:'Only the exact official response was checked; absence is not a safety judgment.'});
    response.headers.set('Cache-Control','public, max-age=300');if(store)ctx.waitUntil(store.put(key,response.clone()));return response;
  }catch(e){return reply({error:e.message,kind:e.kind},e.kind==='rate-limit'?429:e.kind==='timeout'?504:502);}
 }};
}
export default createWorker();
