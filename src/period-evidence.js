import { DAY, safeLink } from './core.js';
import { formatNumber } from './format.js';

export const periodKeys = ['a', 'b'];
export const periodExportFormat = 'memediff-period-comparison';
export const githubLogin = value => typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,99})(?:\[bot\])?$/i.test(value) ? value : null;
export const iso = millis => new Date(millis).toISOString();
export const periodRange = (from, until) => `${iso(from)} → ${iso(until - 1)}`;
export const observedCount = (value, complete = true) => value === null ? 'Unknown' : `${formatNumber(value)}${complete ? '' : ' observed'}`;

export function observedDuration(millis) {
  const days = Math.floor(millis / DAY), remainder = millis % DAY;
  const dayLabel = days ? `${days} ${days === 1 ? 'day' : 'days'}` : '';
  const clock = remainder ? iso(remainder).slice(11, remainder % 1000 ? 23 : 19) : '';
  return [dayLabel, clock].filter(Boolean).join(' ') || '0 seconds';
}

export function releaseSource(repo, value) {
  const safe = safeLink(value);
  if (!safe || safe.length > 2048) return null;
  const url = new URL(safe);
  const prefix = `/${repo}/releases/`;
  return url.hostname === 'github.com' && url.pathname.toLowerCase().startsWith(prefix) &&
    url.pathname.length > prefix.length && !url.search && !url.hash ? safe : null;
}

export function authorSource(login) {
  return githubLogin(login) ? `https://github.com/${encodeURIComponent(login)}` : null;
}
