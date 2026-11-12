import {sharedToken, analysisLink} from './share.js';
import {OFFICIAL_CA} from './token-data.js';

const $ = id => document.getElementById(id);
const input = $('token-ca'), button = $('copy-analysis-link');
let revision = 0;
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
button.addEventListener('click', async () => {
  const attempt = ++revision;
  let url;
  try { url = analysisLink(input.value); }
  catch (e) { $('share-fallback').hidden = true; $('analysis-link').value = ''; message(e.message, true); return; }
  context();
  $('analysis-link').value = url; $('share-fallback').hidden = false;
  button.disabled = true;
  try {
    await navigator.clipboard.writeText(url);
    if (attempt === revision) message('Analysis link copied. Only the CA is included; no report or saved baseline is shared.');
  } catch {
    if (attempt === revision) {
      const field = $('analysis-link'); field.focus(); field.select(); field.setSelectionRange(0, url.length);
      message('Clipboard unavailable. Copy the selected link manually (Ctrl/Cmd+C, or long-press and Copy on mobile).', true);
    }
  } finally { button.disabled = false; }
});
try {
  const mint = sharedToken(window.location.search);
  if (mint) {
    input.value = mint; context();
    message('Shared CA loaded. No analysis has run. Review the address, then select Analyze Token for current source data.');
  }
} catch {
  message('Invalid shared CA. Enter a valid Solana address to continue; no analysis was started.', true);
}
