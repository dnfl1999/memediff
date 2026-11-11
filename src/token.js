// Static, audited project identity. No wallet or trading integration.
const address = document.getElementById('official-ca');
const copy = document.getElementById('copy-ca');
const status = document.getElementById('copy-ca-status');
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(address.value);
    status.textContent = 'Contract address copied.';
  } catch {
    address.focus();
    address.select();
    status.textContent = 'Clipboard unavailable. Address selected — copy it manually.';
  }
});
