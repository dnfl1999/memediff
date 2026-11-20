import { compareSavedFiles, readComparisonSlot } from './saved-file-comparison.js';
import { renderSavedFile, renderSavedFileComparison } from './saved-file-comparison-view.js';

const byId = id => document.getElementById(id);
const open = byId('compare-saved-open');
const panel = byId('compare-saved-files');

if (open && panel) {
  const title = byId('compare-saved-title'), close = byId('compare-saved-close');
  const submit = byId('compare-saved-submit'), notice = byId('compare-saved-status'), result = byId('compare-saved-result');
  const slots = [1, 2].map(number => ({
    number, input: byId(`saved-file-${number}-input`), choose: byId(`saved-file-${number}-choose`),
    remove: byId(`saved-file-${number}-remove`), status: byId(`saved-file-${number}-status`),
    content: byId(`saved-file-${number}-content`), preview: null, generation: 0
  }));

  function resetResult() {
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
    notice.textContent = comparison.blocked ? 'Shared activity comparison unavailable.' : 'Saved file comparison ready.';
  });
}
