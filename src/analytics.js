const origin = 'https://dnfl1999.github.io';
const path = '/memediff/';
const endpoint = 'https://gateway.umami.is/api/send';
const website = 'dc06622a-5681-441b-a960-9d6050a36dbc';
const disabledKey = 'umami.disabled';
const sampleAnchors = ['#samples', '#sample-vite', '#sample-hello-world', '#sample-memediff'];
const referralSites = new Set([
  'alternativeto.net', 'bing.com', 'dev.to', 'github.com', 'google.co.kr', 'google.com',
  'indiehackers.com', 'news.ycombinator.com', 'producthunt.com', 'reddit.com', 'old.reddit.com',
  't.co', 't.me', 'telegram.org', 'twitter.com', 'x.com'
]);

function onHomepage() {
  return typeof window !== 'undefined' && location.origin === origin && location.pathname === path;
}

function canMeasure() {
  if (!onHomepage() || navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return false;
  try {
    return !new URLSearchParams(location.search).has('analytics', 'off') && !localStorage.getItem(disabledKey);
  } catch {
    return false;
  }
}

function referringOrigin() {
  if (!document.referrer) return '';
  try {
    const referrer = new URL(document.referrer);
    const host = referrer.hostname.replace(/^www\./, '');
    return referrer.protocol === 'https:' && referralSites.has(host) ? `https://${host}` : '';
  } catch {
    return '';
  }
}

function send(name, data) {
  if (!canMeasure()) return;
  const payload = { website, hostname: 'dnfl1999.github.io', url: path, title: 'MemeDiff', tag: 'production', referrer: referringOrigin() };
  if (name) payload.name = name;
  if (data) payload.data = data;
  void Promise.resolve().then(() => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'event', payload }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    keepalive: true
  })).catch(() => {});
}

export function recordAnalysis(name, flow) {
  if (!['analysis_start', 'analysis_success', 'analysis_failure'].includes(name) || !['github', 'solana'].includes(flow)) return;
  send(name, { flow });
}

export function recordReportDownload(format) {
  if (format === 'png' || format === 'json') send('report_download_requested', { format });
}

function updateOptOut() {
  const link = document.getElementById('analytics-opt-out');
  try {
    if (new URLSearchParams(location.search).has('analytics', 'off')) localStorage.setItem(disabledKey, '1');
    if (link && localStorage.getItem(disabledKey)) link.textContent = 'Analytics is off in this browser';
  } catch {
    if (link) link.textContent = 'Analytics is off while browser storage is unavailable';
  }
}

if (onHomepage()) updateOptOut();

if (canMeasure()) {
  send();
  if (sampleAnchors.includes(location.hash)) send('sample_open');
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element) || !event.isTrusted) return;
    if (sampleAnchors.includes(target.closest('a[href^="#"]')?.getAttribute('href'))) send('sample_open');
    if (target.closest('#samples a[download]')) recordReportDownload('json');
  });
}
