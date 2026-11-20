import { appendFile, readFile } from 'node:fs/promises';
import { refreshForksIndex } from './forks-refresh.mjs';

const path = process.argv[2] ?? 'data/forks-index.json';
const local = JSON.parse(await readFile('data/forks-index.json', 'utf8'));
const summary = process.env.GITHUB_STEP_SUMMARY;
const runId = process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY === 'dnfl1999/memediff'
  ? process.env.GITHUB_RUN_ID : undefined;

function healthSummary(health) {
  if (!health) return 'Last successful verification and expiry are unavailable because the published index could not be validated.';
  const { counts, official } = health;
  return [
    `Published snapshot checked at ${health.indexCheckedAt} (UTC). Last successful record verification: ${health.lastVerifiedAt ?? 'unavailable'}.`,
    `${health.entryCount} associations: ${counts.fresh} fresh, ${counts.expiring} expiring within six hours, ${counts.expired} expired, ${counts.invalid} invalid.`,
    `Next active expiry: ${health.nextExpiry ?? 'none'}.`,
    `MEMEDIFF: ${official?.state ?? 'unavailable'}. Last verified ${official?.verifiedAt ?? 'unavailable'}. 48-hour expiry ${official?.expiresAt ?? 'unavailable'}.`
  ].join('\n\n');
}

function failureSummary(failure) {
  if (!failure) return '';
  const status = failure.status ? `, HTTP ${failure.status}` : '';
  const codes = failure.codes?.length ? `, ${failure.codes.join(', ')}` : '';
  return `Failure at ${failure.stage}: ${failure.category}${status}${codes}.`;
}

async function publishSummary(message, health, failure) {
  const details = [message, failureSummary(failure), healthSummary(health),
    'Automatic repository analysis requires a Fresh association. Market lookup and direct repository analysis remain separate.'].filter(Boolean).join('\n\n');
  console.log(details);
  if (summary) await appendFile(summary, `### Forks index health\n\n${details}\n`);
  if (health?.counts.expiring || health?.counts.expired) {
    console.log(`::warning title=Forks verification expiry::${health.counts.expiring} associations expiring within six hours and ${health.counts.expired} expired. MEMEDIFF expiry: ${health.official?.expiresAt ?? 'unavailable'}.`);
  }
}

try {
  const result = await refreshForksIndex({ path, local, runId,
    allowDeployedFallback: process.env.ALLOW_DEPLOYED_FALLBACK === 'true' });
  const { status, health, failure, freshlyVerified, retainedCount } = result;
  const retained = status === 'retained-published-index';
  const message = retained ? 'Forks refresh failed. The deployment artifact reuses the published records and their original timestamps.'
    : 'Forks refresh completed and the validated index was written.';
  if (retained) console.log(`::warning::${message}`);
  await publishSummary(`${message}\n\nNewly verified: ${freshlyVerified}. Retained: ${retainedCount}. Pages deployment and public QA are reported in their own jobs.`, health, failure);
} catch (error) {
  const message = 'Forks index refresh failed. The existing Pages deployment was preserved.';
  console.error(`::error::${message}`);
  const health = error.refresh?.health;
  await publishSummary(`${message}\n\nApplied to deployment artifact: 0 newly verified. ${health ? `${health.entryCount} previously published associations remain in place.` : 'Published association count unavailable.'}`,
    health, error.refresh?.failure);
  process.exitCode = 1;
}
