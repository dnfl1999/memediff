import {parseToken} from './core.js';
import {formatDate} from './format.js';
import {readJSON,fetchMarket,verifiedAssociation,OFFICIAL_CA} from './token-data.js';
import {analyzeRepository,clearReport,cancelAnalysis,lockAnalysis} from './app.js';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function status(text,error=false){$('token-status').textContent=text;$('token-status').classList.toggle('error',error);}
function source(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
const money=n=>n===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n>0&&n<1?10:2}).format(n);
function renderMarket(data){
 $('token-result-title').textContent=data.name?`${data.name}${data.symbol?' / '+data.symbol:''}`:'Unknown token';
 $('market-metrics').replaceChildren(...[['Price',data.price],['FDV',data.fdv],['Market cap',data.marketCap],['Pool liquidity',data.liquidity],['24h pool volume',data.volume24h]].map(([label,value])=>{const n=el('article','');n.append(el('h3',label),el('strong',money(value)));return n;}));
 $('market-status').textContent=data.available?`Market data observed at ${formatDate(data.observedAt)}. One exact-CA Solana pool; values are not summed across pools.`:`No matching market data returned. Fields are Unknown, not zero. Checked at ${formatDate(data.observedAt)}.`;
 $('market-source').replaceChildren(source('Original DexScreener API response ↗',data.source));
 if(data.pairUrl)$('market-source').append(source('Selected pool ↗',data.pairUrl));
}
let controller=null;
$('token-query').addEventListener('submit',async event=>{
 event.preventDefault();if(controller)return;if($('analyze').disabled){status('Wait for the current GitHub analysis or cancel it first.',true);return;}
 let mint;try{mint=parseToken($('token-ca').value);if(!mint)throw Error('Enter a Solana token CA.');}catch(e){status(e.message,true);return;}
 controller=new AbortController();const signal=controller.signal;
 lockAnalysis(true);$('analyze-token').disabled=true;$('live-demo').disabled=true;$('cancel-token').hidden=false;$('token-ca').disabled=true;
 clearReport();$('token-result').hidden=false;$('observed-ca').textContent=`Solana CA: ${mint}`;$('token-result-title').textContent='Token observation';
 $('market-metrics').replaceChildren();$('market-source').replaceChildren();$('market-status').textContent='Loading exact-CA market information…';$('association').replaceChildren(el('p','Checking the official Forks association index…'));status('Looking up token information and a verified GitHub association…');
 let githubOK=false,association=null,lookupError=false;
 const marketTask=fetchMarket(mint,{signal}).then(data=>{if(!signal.aborted)renderMarket(data);}).catch(e=>{
   if(signal.aborted)return;
   $('market-status').textContent=`Market information Unavailable. ${e.message}`;
   $('market-metrics').replaceChildren(...['Price','FDV','Market cap','Pool liquidity','24h pool volume'].map(label=>{const n=el('article','');n.append(el('h3',label),el('strong','Unavailable'));return n;}));
   $('market-source').replaceChildren(source('DexScreener API source ↗',`https://api.dexscreener.com/tokens/v1/solana/${mint}`));
 });
 try{
   const index=await readJSON('./data/forks-index.json',{signal,timeout:10000});
   if(signal.aborted)return;
   const resolved=verifiedAssociation(mint,index);association=resolved.match;
   if(association){
     $('association').replaceChildren(el('h3','GitHub association — recorded by Forks Wiki'),source(association.repo,`https://github.com/${association.repo}`),el('p',`Exact CA and coin.kind=forks verified at ${formatDate(association.checkedAt)}. This is a dated API association, not repository-owner endorsement or an on-chain ownership claim.`),source('Association evidence ↗',association.source));
     status(`Verified indexed association: ${association.repo}. Analyzing GitHub automatically…`);
     $('repo').value=association.repo;$('token').value=mint;
     githubOK=await analyzeRepository(association.repo,mint);
     if(!githubOK&&!signal.aborted){$('association').append(el('p',`Association found, but GitHub activity is unavailable. ${$('status').textContent}`));}
   }else{
     $('association').replaceChildren(el('h3','No verified GitHub repository found.'),el('p',`The index is limited, not a complete registry. ${resolved.reason==='stale'?'This association is older than 48 hours and was not used.':'No fresh, unambiguous exact-CA association was available.'} Missing coverage does not prove no relationship exists.`),source('Check this CA on Forks Wiki ↗',`https://forks.wiki/coin/${mint}`));
   }
 }catch(e){lookupError=true;if(!signal.aborted)$('association').replaceChildren(el('h3','No verified GitHub repository found.'),el('p',`Association lookup Unavailable. ${e.message} This does not prove that no association exists.`));}
 finally{
   await marketTask;
   if(signal.aborted)status('Token analysis canceled. Completed observations, if any, are shown.',true);
   else status(githubOK?'Token lookup and GitHub analysis complete. Development Receipt exports are ready.':association?'Token lookup complete. The repository association is known, but GitHub analysis failed.':lookupError?'Token lookup finished with unavailable association data. See the source messages.':'Token lookup complete. No verified GitHub repository found; development exports are unavailable.');
   controller=null;lockAnalysis(false);$('analyze-token').disabled=false;$('live-demo').disabled=false;$('cancel-token').hidden=true;$('token-ca').disabled=false;
 }
});
$('cancel-token').addEventListener('click',()=>{controller?.abort();cancelAnalysis();});
$('live-demo').addEventListener('click',()=>{if(controller||$('analyze').disabled)return;$('token-ca').value=OFFICIAL_CA;$('token-query').requestSubmit();$('token-status').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
