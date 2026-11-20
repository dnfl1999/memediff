import { readSavedComparison } from './saved-comparison.js';
import { renderPeriodResults } from './period-comparison-view.js';
import { renderSavedMetadata, renderSavedSources } from './saved-comparison-view.js';

const byId = id => document.getElementById(id);
const open = byId('saved-comparison-open');
const file = byId('saved-comparison-file');
const panel = byId('saved-comparison');
const title = byId('saved-comparison-title');
const cancel = byId('saved-comparison-cancel');
const close = byId('saved-comparison-close');
const status = byId('saved-comparison-status');
const details = byId('saved-comparison-content');
const meta = byId('saved-comparison-meta');
const results = byId('saved-comparison-results');
const sources = byId('saved-comparison-sources');
let generation = 0;

function message(value, error = false) {
  status.textContent = value;
  status.classList.toggle('error', error);
}

function finishRead() {
  generation++;
  file.value = '';
  cancel.hidden = true;
  panel.removeAttribute('aria-busy');
}

function closePreview() {
  finishRead();
  meta.replaceChildren();
  results.replaceChildren();
  sources.replaceChildren();
  details.hidden = true;
  status.textContent = '';
  panel.hidden = true;
  open.focus();
}

function render(preview) {
  renderSavedMetadata(meta, preview);
  renderPeriodResults(results, preview.comparison, preview.repository.name, 'saved-period');
  renderSavedSources(sources, preview);
  details.querySelector('details').open = false;
  details.hidden = false;
}

// Remain harmless when a browser still has the older GitHub Pages HTML cached.
if (open && file && panel) {
  open.addEventListener('click', () => file.click());
  file.addEventListener('cancel', () => {
    if (!panel.hidden && cancel.hidden) message('File selection canceled.');
  });
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    const attempt = ++generation;
    file.value = '';
    panel.hidden = false;
    cancel.hidden = false;
    panel.setAttribute('aria-busy', 'true');
    message('Reading and checking the local comparison…');
    title.focus();
    try {
      const preview = await readSavedComparison(selected);
      if (attempt !== generation) return;
      render(preview);
      message('Saved comparison opened.');
    } catch (error) {
      if (attempt === generation) message(error.message, true);
    } finally {
      if (attempt === generation) finishRead();
    }
  });
  cancel.addEventListener('click', () => {
    if (details.hidden) closePreview();
    else {
      finishRead();
      message('File reading canceled.');
      title.focus();
    }
  });
  close.addEventListener('click', closePreview);
}
