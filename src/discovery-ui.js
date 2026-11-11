import { searchRepositories, lookupMint } from './discovery.js';
import { formatDate } from './format.js';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let busy=false;
function message(text,error=false){$('discovery-status').textContent=text;$('discovery-status').classList.toggle('error',error);}
function select(repo,token){
  if($('analyze').disabled){message('Wait for the current analysis or cancel it before selecting another repository.',true);return;}
  $('repo').value=repo; $('token').value=token || '';
  $('repo').focus(); message(`Selected ${repo}. Review the fields, then select Analyze.`);
}
$('live-demo').addEventListener('click',()=>{
  if($('analyze').disabled)return;
  $('repo').value='dnfl1999/memediff'; $('token').value='';
  $('query').requestSubmit(); $('status').scrollIntoView({block:'center',behavior:'smooth'});
});
async function run(action){
  if(busy)return;
  busy=true; $('search-submit').disabled=true; $('mint-submit').disabled=true;
  $('discovery-results').replaceChildren();
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  try{await action(controller.signal);}catch(e){message(e.message,true);}
  finally{clearTimeout(timer);busy=false;$('search-submit').disabled=false;$('mint-submit').disabled=false;}
}
$('repo-search').addEventListener('submit',event=>{
  event.preventDefault(); run(async signal=>{
    message('Searching public GitHub repository names…');
    const result=await searchRepositories($('search-name').value,{signal});
    message(`${result.items.length ? 'Choose a repository below. Names are not proof of token association.' : 'No public repository matches found. Try another name or enter a URL directly.'}${result.incomplete ? ' GitHub returned incomplete search results.' : ''}`);
    for(const item of result.items){
      const li=node('li',''), button=node('button',`Select ${item.repo}`);button.type='button';
      button.addEventListener('click',()=>select(item.repo,''));
      const a=node('a','View on GitHub ↗');a.href=`https://github.com/${item.repo}`;a.target='_blank';a.rel='noopener noreferrer';
      li.append(button,a,node('p',item.description),node('small',`${item.fork?'Fork · ':''}${item.archived?'Archived · ':''}Public repository`));$('discovery-results').append(li);
    }
  });
});
$('mint-search').addEventListener('submit',event=>{
  event.preventDefault();run(async signal=>{
    // Validate before requesting even the static index.
    const mint=$('search-mint').value;
    lookupMint(mint,{schema:1,checkedAt:new Date().toISOString(),entries:[]});
    message('Checking the dated official Forks API index…');
    let response;
    try{response=await fetch('./data/forks-index.json',{signal,credentials:'omit',cache:'no-cache'});}catch{throw new Error('Could not load the Forks association index. Check your connection or try a repository URL.');}
    if(!response.ok)throw new Error('The Forks association index is unavailable. No repository was selected.');
    let index;try{index=await response.json();}catch{throw new Error('The Forks association index is unreadable. No repository was selected.');}
    const match=lookupMint(mint,index);
    if(!match){message('No confirmed association in this limited, dated index. This does not prove that no association exists. Check Forks Wiki or enter a verified repository URL.');return;}
    message(`Forks API recorded this exact CA association at ${formatDate(match.checkedAt)}. This is a dated lookup, not a live verification or repository-owner endorsement.`);
    const li=node('li',''),button=node('button',`Use ${match.repo}`);button.type='button';button.addEventListener('click',()=>select(match.repo,match.mint));
    const a=node('a','Check on Forks Wiki ↗');a.href=`https://forks.wiki/coin/${match.mint}`;a.target='_blank';a.rel='noopener noreferrer';
    li.append(button,node('p',match.mint),a);$('discovery-results').append(li);
  });
});
