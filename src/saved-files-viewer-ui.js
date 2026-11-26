import { el, link } from './report-dom.js';
import { renderSavedFile, renderSavedFileComparison } from './saved-file-comparison-view.js';
import { readSavedFilesReport } from './saved-files-viewer.js';

const namespace = 'saved-files-viewer';
const control = key => document.getElementById(`${namespace}-${key}`);
const open = control('open'), panel = document.getElementById(namespace);

if (open && panel) {
  const input = control('file'), title = control('title'), choose = control('choose'), close = control('close');
  const cancel = control('cancel'), status = control('status'), content = control('content');
  let generation = 0;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
  }

  function finishReading() {
    generation++;
    input.value = '';
    cancel.hidden = true;
    content.removeAttribute('aria-busy');
  }

  function clearContent() {
    content.replaceChildren();
    content.hidden = true;
  }

  function render({ files, comparison, createdAtUtc }) {
    const { repository } = files[0];
    const warning = el('p', null, 'warning');
    warning.append(el('strong', 'Local file · Unverified'), el('br'),
      'The checks cover the report’s internal consistency. The original files are required to verify their recorded SHA-256 values. File authenticity and GitHub observations remain unverified.');
    const meta = el('dl', null, 'saved-comparison-meta');
    const repo = el('dd');
    repo.append(link(repository.name, repository.url));
    meta.append(el('dt', 'Repository'), repo, el('dt', 'Branch'), el('dd', repository.branch),
      el('dt', 'Export created at (UTC)'), el('dd', createdAtUtc));
    const sources = el('div', null, 'saved-file-slots');
    const options = { namespace, recorded: true };
    files.forEach((file, index) => {
      const number = index + 1;
      const group = el('fieldset', null, 'period-activity');
      const details = el('div');
      renderSavedFile(details, file, number, options);
      group.append(el('legend', `Recorded File ${number}`), details);
      sources.append(group);
    });
    const result = el('div');
    content.replaceChildren(warning, meta, sources, result);
    content.hidden = false;
    renderSavedFileComparison(result, files, comparison, options);
  }

  open.addEventListener('click', () => {
    panel.hidden = false;
    title.focus();
  });
  choose.addEventListener('click', () => input.click());
  input.addEventListener('cancel', () => {
    if (cancel.hidden) message('File selection canceled.');
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const attempt = ++generation;
    input.value = '';
    clearContent();
    cancel.hidden = false;
    content.setAttribute('aria-busy', 'true');
    message('Checking the comparison and recalculating the evidence locally…');
    try {
      const preview = await readSavedFilesReport(file);
      if (attempt !== generation) return;
      render(preview);
      message('Saved files comparison opened.');
    } catch (error) {
      if (attempt === generation) message(error.message, true);
    } finally {
      if (attempt === generation) finishReading();
    }
  });
  cancel.addEventListener('click', () => {
    finishReading();
    clearContent();
    message('File reading canceled.');
    choose.focus();
  });
  close.addEventListener('click', () => {
    finishReading();
    clearContent();
    message('');
    panel.hidden = true;
    open.focus();
  });
}
