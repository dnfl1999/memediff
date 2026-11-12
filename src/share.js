import {parseToken} from './core.js';

export const ANALYSIS_HOME = 'https://dnfl1999.github.io/memediff/';
export function sharedToken(search) {
  if (search === '') return null;
  if (typeof search !== 'string' || !search.startsWith('?') || search.length > 8192) throw new Error('Invalid shared link query.');
  const values = new URLSearchParams(search).getAll('ca');
  if (!values.length) return null;
  if (values.length !== 1) throw new Error('Use exactly one ca parameter.');
  const mint = parseToken(values[0]);
  if (!mint || mint !== values[0]) throw new Error('The shared CA must be an exact Solana address without whitespace.');
  return mint;
}
export function analysisLink(value) {
  if (typeof value !== 'string') throw new Error('Enter a Solana token CA before sharing.');
  const mint = parseToken(value);
  if (!mint) throw new Error('Enter a Solana token CA before sharing.');
  // Never inherit the current host, path, query, hash, or any report data.
  const url = new URL(ANALYSIS_HOME);
  url.searchParams.set('ca', mint);
  return url.href;
}
