import { appendFile, readFile } from 'node:fs/promises';
import { refreshForksIndex } from './forks-refresh.mjs';

const path = process.argv[2] ?? 'data/forks-index.json';
const local = JSON.parse(await readFile('data/forks-index.json', 'utf8'));
const summary = process.env.GITHUB_STEP_SUMMARY;
try {
  const { status, index } = await refreshForksIndex({ path, local,
    allowDeployedFallback: process.env.ALLOW_DEPLOYED_FALLBACK === 'true' });
  const retained = status === 'retained-published-index';
  const message = retained ? 'Forks refresh failed. Reusing the verified structure and original timestamps of the published index.'
    : `Forks refresh completed. ${index.coverage.verified} newly verified, ${index.coverage.retained} retained with their original timestamps.`;
  if (retained) console.log(`::warning::${message}`);
  if (summary) await appendFile(summary, `### Forks index\n\n${message}\n\nIndex checked at ${index.checkedAt}. Deployment and public QA are reported by their own jobs.\n`);
} catch {
  const message = 'Forks index refresh failed. The existing Pages deployment was preserved.';
  console.error(`::error::${message}`);
  if (summary) await appendFile(summary, `### Forks index\n\n${message}\n`);
  process.exitCode = 1;
}
