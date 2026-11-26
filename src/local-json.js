export function parseUntrustedJSON(raw) {
  return JSON.parse(raw, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe JSON key.');
    return value;
  });
}

export const hasExactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function checkJsonDepth(raw, limit) {
  let depth = 0, quoted = false, escaped = false;
  for (const char of raw) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') {
      if (++depth > limit) throw new Error('The comparison JSON is nested too deeply.');
    } else if (char === '}' || char === ']') depth--;
  }
}

export async function readLocalJSONText(file, maxBytes) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Choose a non-empty JSON file up to ${maxBytes / (1024 * 1024)} MiB.`);
  }
  if (!/\.json$/i.test(file.name)) throw new Error('Choose a .json report file.');
  try { return await file.text(); }
  catch { throw new Error('Could not read the selected file.'); }
}
