import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { buildDiagnostic, diagnosticFile, maxDiagnosticBytes } from './index-diagnostic.mjs';
import { emptyQa, qaChecks, qaSummary, validQaCheck } from './qa-diagnostic.mjs';

try {
  const env = process.env;
  const identity = { runId: env.GITHUB_RUN_ID, runAttempt: Number(env.GITHUB_RUN_ATTEMPT), recordedAt: new Date().toISOString() };
  const stages = { verify: env.VERIFY_RESULT, deploy: env.DEPLOY_RESULT, publicQA: env.PUBLIC_QA_RESULT };
  const qa = Object.fromEntries(Object.entries(qaChecks).map(([key, { stage, label }]) => {
    const raw = env[`QA_${key.toUpperCase()}`];
    if (raw) {
      if (Buffer.byteLength(raw) > maxDiagnosticBytes) throw new Error('QA diagnostic exceeds its size limit.');
      try {
        const check = JSON.parse(raw);
        if (JSON.stringify(check) === raw && validQaCheck(check, identity, key)) return [key, check];
      } catch { /* No untrusted report data is logged. */ }
      console.warn(`::warning::${label} diagnostic input is invalid or belongs to another execution attempt.`);
    }
    return [key, emptyQa(stages[stage] === 'skipped' ? 'skipped' : 'unavailable', identity)];
  }));
  const record = buildDiagnostic({ ...identity, now: identity.recordedAt, workflow: env.GITHUB_WORKFLOW,
    event: env.GITHUB_EVENT_NAME, refreshOutcome: env.FORKS_STEP_OUTCOME, refreshData: env.FORKS_DIAGNOSTIC,
    stages, qa });
  const body = `${JSON.stringify(record)}\n`;
  await mkdir('diagnostics', { recursive: true });
  await writeFile(`diagnostics/${diagnosticFile}`, body, { flag: 'wx' });
  const summary = `### Pages operation diagnostic\n\nForks ${record.forks.state} · Verify ${record.stages.verify} · Deploy ${record.stages.deploy} · Public QA ${record.stages.publicQA}\n\nRun [${record.runId}](${record.actionsURL}), attempt ${record.runAttempt}. Validated JSON size ${Buffer.byteLength(body)} bytes.\n`;
  const detail = `${summary}\n${qaSummary(record.qa).join('\n')}\n`;
  console.log(detail);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, detail);
} catch {
  console.error('::error::Pages diagnostic could not be prepared. Check the recording step status.');
  process.exitCode = 1;
}
