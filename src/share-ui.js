import {sharedToken, analysisLink, nativeShare} from './share.js';
import {OFFICIAL_CA} from './token-data.js';

const $ = id => document.getElementById(id);
const input = $('token-ca'), button = $('copy-analysis-link'), shareButton = $('native-share');
let revision = 0, busy = false;
function message(text, error = false) {
  $('share-status').textContent = text;
  $('share-status').classList.toggle('error', error);
}
function context() {
  $('share-context').textContent = input.value.trim() === OFFICIAL_CA
    ? 'This address matches the official MEMEDIFF CA. A shared link is not a recommendation or safety certification.'
    : 'This input is not the official MEMEDIFF CA. Address format alone does not verify a token, its safety or a GitHub association.';
}
function reset() {
  revision++;
  $('share-fallback').hidden = true; $('analysis-link').value = '';
  message('Share only the CA currently in the input. Recipients choose when to run a fresh query.');
  context();
}
input.addEventListener('input', reset);
$('token-query').addEventListener('submit', reset);
$('live-demo').addEventListener('click', reset);
function showLink(url) {
  $('analysis-link').value = url; $('share-fallback').hidden = false;
}
async function copyLink(url, attempt, prefix = '') {
  showLink(url);
  try {
    await navigator.clipboard.writeText(url);
    if (attempt === revision) message(prefix + 'Analysis link copied. Only the CA is included; no report or saved baseline is shared.');
  } catch {
    if (attempt === revision) {
      const field = $('analysis-link'); field.focus(); field.select(); field.setSelectionRange(0, url.length);
      message(prefix + 'Clipboard unavailable. Copy the selected link manually (Ctrl/Cmd+C, or long-press and Copy on mobile).', true);
    }
  }
}
async function run(mode) {
  if (busy) return;
  const attempt = ++revision, value = input.value;
  let url;
  try { url = analysisLink(value); }
  catch (e) { $('share-fallback').hidden = true; $('analysis-link').value = ''; message(e.message, true); return; }
  context(); busy = true; button.disabled = true; shareButton.disabled = true;
  try {
    if (mode === 'copy') { await copyLink(url, attempt); return; }
    message('Opening your device share menu…');
    const result = await nativeShare(value, navigator);
    if (attempt !== revision) return;
    if (result.status === 'unsupported') await copyLink(url, attempt, 'Native sharing unavailable. ');
    else if (result.status === 'completed') message('Share request handed to your device. Delivery to a recipient is not confirmed.');
    else if (result.status === 'canceled') message('Share canceled or no share target was available. Nothing was copied.');
    else { showLink(url); message('Native sharing could not complete. Use Copy Analysis Link or select the link to copy manually.', true); }
  } finally { busy = false; button.disabled = false; shareButton.disabled = false; }
}
button.addEventListener('click', () => run('copy'));
shareButton.addEventListener('click', () => run('native'));
try {
  const mint = sharedToken(window.location.search);
  if (mint) {
    input.value = mint; context();
    message('Shared CA loaded. No analysis has run. Review the address, then select Analyze Token for current source data.');
  }
} catch {
  message('Invalid shared CA. Enter a valid Solana address to continue; no analysis was started.', true);
}
