import { isCommitProcessingTimeout } from '../src/github.js';

const commitList = response => /^https:\/\/api.github.com\/repos\/[^/]+\/[^/]+\/commits\?/.test(response.url);
const empty = response => response.status === 409 && commitList(response) && /^Git Repository is empty\.?$/i.test(response.message || '');
export const limited = response => response.status === 429 || response.status === 403 &&
  (response.remaining === '0' || Boolean(response.retryAfter) || /rate limit/i.test(response.message || ''));

export function classifyLiveResponses(responses) {
  const laterSuccesses = new Map();
  const results = [];
  for (let index = responses.length - 1; index >= 0; index--) {
    const response = responses[index];
    const later = laterSuccesses.get(response.url) ?? 0;
    const recovered = response.status === 422 && commitList(response) && isCommitProcessingTimeout(response.message) && later > 0;
    if (recovered || response.status === 200) laterSuccesses.set(response.url, later + (recovered ? -1 : 1));
    results[index] = { expected: empty(response) || limited(response) || recovered, recovered };
  }
  return results;
}

export function expectedBrowserError(diagnostics, { url, status }) {
  return diagnostics.expectedResponses.some(response => response.url === url && response.status === status) ||
    diagnostics.expectedStatuses.includes(status) &&
    (url.startsWith('https://api.github.com/') || diagnostics.expectedURLs.some(prefix => url.startsWith(prefix)));
}
