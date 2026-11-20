import { safeLink } from './core.js';

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function link(text, url) {
  const anchor = el('a', text);
  const safe = safeLink(url);
  if (safe) {
    anchor.href = safe;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
}
