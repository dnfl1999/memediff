import { parseRepo, parseToken, compareSnapshots, inWindow, safeLink, DAY } from './core.js';
import { fetchReport } from './github.js';
const $ = id => document.getElementById(id);
let report = null, comparison = null, days = 30, controller = null;
function el(tag, text, className) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; }
function link(text, url) { const a = el('a', text); const safe = safeLink(url); if (safe) { a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; }
function key() { return `memediff:v1:${report.repo}:${report.branch}:${report.token}`; }
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function loadBaseline() {
  try { const raw = localStorage.getItem(key()); comparison = compareSnapshots(raw ? JSON.parse(raw) : null, report); }
  catch { comparison = null; status('비교 기준을 읽을 수 없습니다. 저장소 접근이 차단되었거나 기록이 손상되었습니다.', true); }
}
function renderComparison() {
  const box = $('comparison'); box.replaceChildren();
  if (!comparison) { box.append(el('p', '아직 저장된 비교 기준이 없습니다. 현재 보고서를 저장한 뒤 다시 조회하면 변경된 SHA를 비교할 수 있습니다.')); return; }
  box.append(el('p', `비교 기준: ${new Date(comparison.previousAt).toLocaleString()}`));
  box.append(el('strong', `${comparison.observed.length}개 새로 관측`));
  box.append(el('p', `30일 커밋 관측치 변화 ${comparison.commitDelta >= 0 ? '+' : ''}${comparison.commitDelta} · 겹치는 기간에서 미관측 ${comparison.missing.length}개`));
  if (comparison.partial) box.append(el('p', '불완전 수집 간 비교입니다. 수치의 차이를 개발량 변화로 해석하지 마세요.', 'warning'));
  box.append(el('p', comparison.note, 'small'));
  if (comparison.observed.length) {
    const list = el('ul', null, 'source-list');
    comparison.observed.slice(0, 5).forEach(sha => { const li = el('li'); li.append(link(sha.slice(0, 12), `https://github.com/${report.repo}/commit/${sha}`)); list.append(li); });
    box.append(list, el('p', '새로 관측된 SHA 최대 5개 표시 · 전체 비교는 JSON에 포함', 'small'));
  }
}
function render() {
  $('report').hidden = false; $('empty').hidden = true;
  $('report-title').replaceChildren(link(report.repo, `https://github.com/${report.repo}`));
  $('report-meta').textContent = `${new Date(report.fetchedAt).toLocaleString()} 조회 · ${report.branch || '브랜치 없음'}${report.fork ? ' · Fork' : ''}${report.archived ? ' · 보관된 저장소' : ''}`;
  $('description').textContent = report.description;
  $('token-note').textContent = report.token ? `사용자 입력 토큰: ${report.token} · 저장소와의 연관성 및 mint 존재 미검증` : '토큰 주소 미기록 · 저장소 개발 활동만 분석합니다.';
  $('warnings').replaceChildren(...report.warnings.map(w => el('p', w, 'warning')));
  const m = report.metrics[days];
  $('metrics').replaceChildren(...[['커밋', m.commits, report.coverage.commits, '기본 브랜치 · committer 날짜'], ['릴리스', m.releases, report.coverage.releases, '공개 · published_at 날짜'], ['기여자', m.contributors, report.coverage.commits, `연결된 계정 · 작성자 미연결 ${m.unattributed}건`]].map(([name, count, complete, note]) => { const n = el('article', null, 'metric'); n.append(el('h3', name), el('strong', `${count}${complete ? '' : '+'}`), el('p', `${complete ? '' : '불완전 관측 · '}${note}`)); return n; }));
  const now = Date.parse(report.fetchedAt);
  const commits = report.commits.filter(c => inWindow(c.date, now, days)).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const releases = report.releases.filter(c => inWindow(c.date, now, days));
  // A rolling window can span days+1 UTC calendar dates; include both edges.
  const firstDay = new Date(now - days * DAY).toISOString().slice(0,10);
  const buckets = Array.from({length: days + 1}, (_, i) => { const date = new Date(Date.parse(firstDay) + i * DAY).toISOString().slice(0,10); return { date, count: commits.filter(c => c.date.slice(0,10) === date).length }; });
  const max = Math.max(1,...buckets.map(x => x.count));
  $('chart').replaceChildren(...buckets.map(b => { const bar = el('div', null, 'bar'); bar.style.setProperty('--bar-height', `${Math.max(1, b.count / max * 100)}%`); bar.title = `${b.date}: ${b.count}건`; return bar; }));
  $('chart').setAttribute('aria-label', buckets.map(b => `${b.date}: ${b.count}건`).join(', '));
  $('chart-start').textContent = firstDay; $('chart-end').textContent = new Date(now).toISOString().slice(0,10);
  $('commits').replaceChildren(...commits.slice(0,20).map(c => { const li = el('li'); li.append(link(c.message || c.sha.slice(0,7), c.url), el('small', `${c.sha.slice(0,7)} · ${c.author || 'GitHub 계정 미연결'} · ${new Date(c.date).toLocaleString()}`)); return li; }));
  if (!commits.length) $('commits').append(el('li', report.coverage.commits ? '선택 기간에 관측된 커밋이 없습니다.' : '수집 실패 또는 한도로 커밋을 확인할 수 없습니다.'));
  $('releases').replaceChildren(...releases.slice(0,20).map(r => { const li = el('li'); li.append(link(r.name, r.url), el('small', `${r.date.slice(0,10)}${r.prerelease ? ' · 사전 릴리스' : ''}`)); return li; }));
  if (!releases.length) $('releases').append(el('li', report.coverage.releases ? '선택 기간에 관측된 공개 릴리스가 없습니다.' : '수집 실패 또는 한도로 릴리스를 확인할 수 없습니다.'));
  if (releases.length > 20) $('releases').append(el('li', '최근 20개 표시 · 전체 데이터는 JSON에 포함'));
  const authors = [...new Set(commits.map(c => c.author).filter(Boolean))];
  $('contributors').replaceChildren(...authors.slice(0,50).map(a => link(a, `https://github.com/${encodeURIComponent(a)}`)));
  if (!authors.length) $('contributors').append(el('span', '관측된 연결 계정 없음', 'small'));
  if (authors.length > 50) $('contributors').append(el('span', '최대 50계정 표시', 'small'));
  $('coverage').textContent = `${report.methodology} 커밋 수집 ${report.coverage.commits ? '완료' : '불완전'}, 릴리스 수집 ${report.coverage.releases ? '완료' : '불완전'}. API 잔여 요청 ${report.remaining ?? '확인 불가'}.`;
  $('sources').replaceChildren(...report.evidence.map(url => { const li = el('li'); li.append(link(url, url)); return li; }));
  renderComparison();
}
$('query').addEventListener('submit', async event => {
  event.preventDefault();
  let repo, token;
  try { repo = parseRepo($('repo').value); token = parseToken($('token').value); } catch(e) { status(e.message, true); return; }
  if (controller) return;
  controller = new AbortController(); const timer = setTimeout(() => controller?.abort(), 45000);
  $('analyze').disabled = true; $('cancel').hidden = false; $('repo').disabled = true; $('token').disabled = true;
  $('report').hidden = true; status('GitHub 공개 증거를 수집하고 있습니다…');
  try { report = await fetchReport(repo, token, { signal: controller.signal }); status(`실제 GitHub 조회 완료 · API 잔여 요청 ${report.remaining ?? '확인 불가'}`); loadBaseline(); render(); }
  catch(e) { report = null; $('empty').hidden = false; status(e.message, true); }
  finally { clearTimeout(timer); controller = null; $('analyze').disabled = false; $('cancel').hidden = true; $('repo').disabled = false; $('token').disabled = false; }
});
$('cancel').addEventListener('click', () => controller?.abort());
document.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => { days = Number(b.dataset.days); document.querySelectorAll('[data-days]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (report) render(); }));
$('save').addEventListener('click', () => { if (!report) return; try { localStorage.setItem(key(), JSON.stringify(report)); loadBaseline(); renderComparison(); status('현재 보고서를 이 브라우저의 비교 기준으로 저장했습니다. 다음 조회에 사용됩니다.'); } catch { status('기준을 저장할 수 없습니다. 브라우저 저장 공간 또는 개인정보 설정을 확인하세요.', true); } });
$('clear').addEventListener('click', () => { if (!report) return; try { localStorage.removeItem(key()); comparison = null; renderComparison(); status('이 프로젝트의 로컬 비교 기준을 지웠습니다.'); } catch { status('브라우저 저장소에 접근할 수 없습니다.', true); } });
function download(blob, extension, snapshot = report) { const url = URL.createObjectURL(blob); const a = el('a'); a.href = url; a.download = `memediff-${snapshot.repo.replace('/', '-')}-${snapshot.fetchedAt.slice(0,10)}.${extension}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
$('json').addEventListener('click', () => { if (report) { download(new Blob([JSON.stringify({ ...report, comparison, selectedDays: days }, null, 2)], { type:'application/json' }), 'json'); status('JSON 내보내기를 요청했습니다. 브라우저 다운로드를 확인하세요.'); } });
$('png').addEventListener('click', () => {
  if (!report) return;
  const snapshot = report;
  try {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1020;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101412'; ctx.fillRect(0,0,1400,1020);
    function text(t, x, y, size = 24, color = '#eaf4df') { ctx.fillStyle = color; ctx.font = `${size}px "Segoe UI", sans-serif`; ctx.fillText(String(t),x,y,1280); }
    text('± MemeDiff / PUBLIC GITHUB EVIDENCE',60,75,28,'#c5f277');
    text(report.repo,60,150,46); text(`조회: ${report.fetchedAt} · 최근 ${days}일`,60,205,22);
    text(`기본 브랜치: ${report.branch} · ${report.fork ? 'Fork' : 'Non-fork'} · ${report.archived ? 'Archived' : 'Active repository'}`,60,250,22);
    const m = report.metrics[days];
    [['커밋',m.commits,report.coverage.commits],['릴리스',m.releases,report.coverage.releases],['연결된 기여자',m.contributors,report.coverage.commits]].forEach(([label,n,complete],i) => { text(label,60+i*440,330,26,'#b9caaa'); text(`${n}${complete?'':'+'}`,60+i*440,420,70,'#c5f277'); });
    text(`수집: 커밋 ${report.coverage.commits?'완료':'불완전'} / 릴리스 ${report.coverage.releases?'완료':'불완전'} · 미연결 작성자 커밋 ${m.unattributed}건`,60,490,24);
    text(comparison ? `비교 기준 ${comparison.previousAt}` : '비교 기준 없음',60,560,23);
    if(comparison) text(`새로 관측된 SHA ${comparison.observed.length} · 겹치는 기간에서 미관측 ${comparison.missing.length}${comparison.partial ? ' · 불완전 비교' : ''}`,60,605,23);
    text('SHA 차이는 신규 개발·삭제의 증거가 아닙니다. 기간 이동과 수집 범위를 확인하세요.',60,655,21,'#bdc9b4');
    text(`사용자 입력 토큰: ${report.token || '없음'}`,60,715,21);
    text('토큰 연관성·mint 존재 미검증. 개발 활동은 안전성·품질·수익을 보장하지 않습니다.',60,755,21,'#e3c79b');
    text(`원본: https://github.com/${report.repo}`,60,820,23,'#c5f277');
    text('기본 브랜치 committer 날짜 / 공개 릴리스 published_at / GitHub 연결 계정·봇 포함',60,865,20);
    text('최대 1,000 커밋·500 릴리스 조회. 전체 증거 링크와 수집 오류는 JSON에 포함됩니다.',60,905,20);
    text('MemeDiff · MIT · https://dnfl1999.github.io/memediff/',60,970,20,'#a2b197');
    canvas.toBlob(blob => { if (blob) { download(blob,'png',snapshot); status('PNG 내보내기를 요청했습니다. 브라우저 다운로드를 확인하세요.'); } else status('PNG 생성에 실패했습니다.',true); },'image/png');
  } catch { status('이 브라우저에서 PNG를 만들 수 없습니다. JSON 내보내기를 사용하세요.', true); }
});
