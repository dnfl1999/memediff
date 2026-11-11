import { searchRepositories } from './discovery.js';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let busy=false;
function message(text,error=false){$('discovery-status').textContent=text;$('discovery-status').classList.toggle('error',error);}
function select(repo,token){
  if($('analyze').disabled){message('Wait for the current analysis or cancel it before selecting another repository.',true);return;}
  $('repo').value=repo; $('token').value=token || '';
  $('repo').focus(); message(`Selected ${repo}. Review the fields, then select Analyze.`);
}
async function run(action){
  if(busy)return;
  busy=true; $('search-submit').disabled=true;
  $('discovery-results').replaceChildren();
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  try{await action(controller.signal);}catch(e){message(e.message,true);}
  finally{clearTimeout(timer);busy=false;$('search-submit').disabled=false;}
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
