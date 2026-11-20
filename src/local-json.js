export function parseUntrustedJSON(raw) {
  return JSON.parse(raw, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe JSON key.');
    return value;
  });
}

export async function readLocalJSONText(file, maxBytes) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > maxBytes) {
    throw new Error('Choose a non-empty JSON file up to 2 MiB.');
  }
  if (!/\.json$/i.test(file.name)) throw new Error('Choose a .json report file.');
  try { return await file.text(); }
  catch { throw new Error('Could not read the selected file.'); }
}
