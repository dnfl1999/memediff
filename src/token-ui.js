import {parseToken} from './core.js';
import {formatDate} from './format.js';
import {readJSON,fetchMarket,OFFICIAL_CA} from './token-data.js';
import {mountIndexHealth} from './index-health-ui.js';
import {analyzeRepository,clearReport,cancelAnalysis,lockAnalysis} from './app.js';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function status(text,error=false){$('token-status').textContent=text;$('token-status').classList.toggle('error',error);}
function source(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
const money=n=>n===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n>0&&n<1?10:2}).format(n);
function renderMarket(data){
 $('token-result-title').textContent=data.name?`${data.name}${data.symbol?' / '+data.symbol:''}`:'Unknown token';
 $('market-metrics').replaceChildren(...[['Price',data.price],['FDV',data.fdv],['Market cap',data.marketCap],['Pool liquidity',data.liquidity],['24h pool volume',data.volume24h]].map(([label,value])=>{const n=el('article','');n.append(el('h3',label),el('strong',money(value)));return n;}));
 $('market-status').textContent=data.available?`Market data observed at ${formatDate(data.observedAt)}. One exact-CA Solana pool; values are not summed across pools.`:`No matching market data returned. The token may not be indexed yet; indexing delays are not proof of no trading. Fields are Unknown, not zero. Checked at ${formatDate(data.observedAt)}.`;
 $('market-source').replaceChildren(source('Original DexScreener API response ↗',data.source));
 if(data.pairUrl)$('market-source').append(source('Selected pool ↗',data.pairUrl));
}
let controller=null;
let stopHealth=()=>{};
function displayAssociation(mint,index,error){
 stopHealth();
 const content=el('div',''),notice=el('p','');notice.hidden=true;notice.setAttribute('role','status');
 $('association').replaceChildren(content,notice);
 const result=mountIndexHealth(content,mint,index,{error,visible:()=>!$('token-result').hidden,openAdvanced:()=>$('repo').focus()});
 stopHealth=result.stop;
 return {health:result.health,notice};
}
$('token-query').addEventListener('submit',async event=>{
 event.preventDefault();if(controller)return;if($('analyze').disabled){status('Wait for the current GitHub analysis or cancel it first.',true);return;}
 let mint;try{mint=parseToken($('token-ca').value);if(!mint)throw Error('Enter a Solana token CA.');}catch(e){status(e.message,true);return;}
 controller=new AbortController();const signal=controller.signal;
 lockAnalysis(true);$('analyze-token').disabled=true;$('live-demo').disabled=true;$('cancel-token').hidden=false;$('token-ca').disabled=true;
 stopHealth();clearReport();$('token-result').hidden=false;$('observed-ca').textContent=`Solana CA: ${mint}`;$('token-result-title').textContent='Token observation';
 $('market-metrics').replaceChildren();$('market-source').replaceChildren();$('market-status').textContent='Loading exact-CA market information…';$('association').replaceChildren(el('p','Checking the official Forks association index…'));status('Looking up token information and a verified GitHub association…');
 let githubOK=false,association=null,indexState;
 const marketTask=fetchMarket(mint,{signal}).then(data=>{if(!signal.aborted)renderMarket(data);}).catch(e=>{
   if(signal.aborted)return;
   $('market-status').textContent=`Market information Unavailable. ${e.message}`;
   $('market-metrics').replaceChildren(...['Price','FDV','Market cap','Pool liquidity','24h pool volume'].map(label=>{const n=el('article','');n.append(el('h3',label),el('strong','Unavailable'));return n;}));
   $('market-source').replaceChildren(source('DexScreener API source ↗',`https://api.dexscreener.com/tokens/v1/solana/${mint}`));
 });
 try{
   const index=await readJSON('./data/forks-index.json',{signal,timeout:10000});
   if(signal.aborted)return;
   const {health,notice}=displayAssociation(mint,index);
   indexState=health.state;
   association=indexState==='fresh'?health.record:null;
   if(association){
     status(`Verified indexed association: ${association.repo}. Analyzing GitHub automatically…`);
     $('repo').value=association.repo;$('token').value=mint;
     githubOK=await analyzeRepository(association.repo,mint);
     if(githubOK){const report=el('a','View GitHub report');report.href='#report';notice.append(report);notice.hidden=false;}
     else if(!signal.aborted){notice.textContent=`GitHub activity is unavailable. ${$('status').textContent}`;notice.hidden=false;}
   }
 }catch(e){indexState='unavailable';if(!signal.aborted)displayAssociation(mint,null,e.message);}
 finally{
   await marketTask;
   if(signal.aborted)status('Token analysis canceled. Completed observations, if any, are shown.',true);
   else status(githubOK?'Token lookup and GitHub analysis complete. Development Receipt exports are ready.':association?'Token lookup complete. The repository association is known, but GitHub analysis failed.':indexState==='unavailable'?'Token lookup finished with unavailable association data.':'Token lookup complete. See Index health for repository analysis availability.');
   controller=null;lockAnalysis(false);$('analyze-token').disabled=false;$('live-demo').disabled=false;$('cancel-token').hidden=true;$('token-ca').disabled=false;
 }
});
$('cancel-token').addEventListener('click',()=>{controller?.abort();cancelAnalysis();});
$('live-demo').addEventListener('click',()=>{if(controller||$('analyze').disabled)return;$('token-ca').value=OFFICIAL_CA;$('token-query').requestSubmit();$('token-status').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
