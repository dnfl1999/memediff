import { compareSavedFiles, readComparisonSlot } from './saved-file-comparison.js';
import { renderSavedFile, renderSavedFileComparison } from './saved-file-comparison-view.js';
import { downloadBlob, pngCanvas } from './download.js';
import { MAX_SAVED_FILES_PNG_BYTES, savedFilesExportData, savedFilesFilename, savedFilesJSON } from './saved-files-export.js';
import { layoutSavedFilesPng, savedFilesImageWidth } from './saved-files-export-png.js';

const byId = id => document.getElementById(id);
const open = byId('compare-saved-open');
const panel = byId('compare-saved-files');

if (open && panel) {
  const title = byId('compare-saved-title'), close = byId('compare-saved-close');
  const submit = byId('compare-saved-submit'), notice = byId('compare-saved-status'), result = byId('compare-saved-result');
  const exports = byId('saved-files-exports'), json = byId('saved-files-export-json'), png = byId('saved-files-export-png');
  const exportStatus = byId('saved-files-export-status');
  let applied = null, generation = 0;
  const slots = [1, 2].map(number => ({
    number, input: byId(`saved-file-${number}-input`), choose: byId(`saved-file-${number}-choose`),
    remove: byId(`saved-file-${number}-remove`), status: byId(`saved-file-${number}-status`),
    content: byId(`saved-file-${number}-content`), preview: null, generation: 0
  }));

  function exportMessage(message, error = false) {
    exportStatus.textContent = message;
    exportStatus.classList.toggle('error', error);
  }

  function setApplied(next) {
    applied = next;
    generation++;
    exports.hidden = !applied;
    json.disabled = !applied;
    png.disabled = !applied;
    exportMessage('');
  }

  function resetResult() {
    setApplied(null);
    result.replaceChildren();
    result.hidden = true;
    submit.disabled = !slots.every(slot => slot.preview);
    notice.textContent = submit.disabled ? 'Choose two valid Period Comparison JSON files.' : 'Both files are ready to compare.';
  }

  function status(slot, message, error = false) {
    slot.status.textContent = message;
    slot.status.classList.toggle('error', error);
  }

  function clear(slot) {
    slot.generation++;
    slot.preview = null;
    slot.input.value = '';
    slot.content.replaceChildren();
    slot.content.hidden = true;
    slot.remove.disabled = true;
    status(slot, '');
    resetResult();
  }

  json.addEventListener('click', () => {
    if (!applied) return;
    try {
      const data = savedFilesExportData(applied.files, applied.comparison);
      downloadBlob(savedFilesJSON(data), savedFilesFilename(data, 'json'));
      exportMessage('Saved files comparison JSON requested. Check your browser downloads.');
    } catch (error) {
      exportMessage(error.message, true);
    }
  });

  png.addEventListener('click', () => {
    if (!applied || png.disabled) return;
    const current = generation;
    png.disabled = true;
    exportMessage('Creating saved files comparison PNG…');
    try {
      const data = savedFilesExportData(applied.files, applied.comparison);
      const filename = savedFilesFilename(data, 'png');
      const { canvas, context } = pngCanvas(savedFilesImageWidth, 1);
      const layout = layoutSavedFilesPng(context, data, document.querySelector('header .brand-icon'));
      canvas.height = layout.height;
      layout.draw();
      canvas.toBlob(blob => {
        if (current !== generation) return;
        png.disabled = false;
        if (!blob?.size || blob.size > MAX_SAVED_FILES_PNG_BYTES) {
          exportMessage(blob?.size ? 'The saved files comparison PNG exceeds the 8 MiB export limit.' : 'Could not create the PNG. The comparison JSON is available.', true);
          return;
        }
        try {
          downloadBlob(blob, filename);
          exportMessage('Saved files comparison PNG requested. Check your browser downloads.');
        } catch {
          exportMessage('Could not download the saved files comparison PNG.', true);
        }
      }, 'image/png');
    } catch {
      png.disabled = false;
      exportMessage('Could not create the PNG. The comparison JSON is available.', true);
    }
  });

  for (const slot of slots) {
    slot.choose.addEventListener('click', () => slot.input.click());
    slot.remove.addEventListener('click', () => {
      clear(slot);
      status(slot, `File ${slot.number} cleared.`);
      slot.choose.focus();
    });
    slot.input.addEventListener('change', async () => {
      const file = slot.input.files?.[0];
      if (!file) return;
      clear(slot);
      const generation = slot.generation;
      slot.remove.disabled = false;
      status(slot, `Checking File ${slot.number} locally…`);
      try {
        const preview = await readComparisonSlot(file);
        if (generation !== slot.generation) return;
        slot.preview = preview;
        renderSavedFile(slot.content, preview, slot.number);
        status(slot, `File ${slot.number} opened.`);
        resetResult();
      } catch (error) {
        if (generation === slot.generation) status(slot, error.message, true);
      }
    });
  }
  open.addEventListener('click', () => {
    panel.hidden = false;
    title.focus();
  });
  close.addEventListener('click', () => {
    for (const slot of slots) clear(slot);
    panel.hidden = true;
    open.focus();
  });
  submit.addEventListener('click', () => {
    if (!slots.every(slot => slot.preview)) return;
    const files = slots.map(slot => slot.preview), comparison = compareSavedFiles(...files);
    renderSavedFileComparison(result, files, comparison);
    setApplied(comparison.blocked ? null : { files, comparison });
    notice.textContent = comparison.blocked ? 'Shared activity comparison unavailable.' : 'Saved file comparison ready.';
  });
}
