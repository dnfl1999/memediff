import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { buildDiagnostic, diagnosticFile } from './index-diagnostic.mjs';

try {
  const env = process.env;
  const record = buildDiagnostic({ runId: env.GITHUB_RUN_ID, runAttempt: Number(env.GITHUB_RUN_ATTEMPT), workflow: env.GITHUB_WORKFLOW,
    event: env.GITHUB_EVENT_NAME, refreshOutcome: env.FORKS_STEP_OUTCOME, refreshData: env.FORKS_DIAGNOSTIC,
    stages: { verify: env.VERIFY_RESULT, deploy: env.DEPLOY_RESULT, publicQA: env.PUBLIC_QA_RESULT } });
  const body = `${JSON.stringify(record, null, 2)}\n`;
  await mkdir('diagnostics', { recursive: true });
  await writeFile(`diagnostics/${diagnosticFile}`, body, { flag: 'wx' });
  const summary = `### Pages operation diagnostic\n\nForks ${record.forks.state} · Verify ${record.stages.verify} · Deploy ${record.stages.deploy} · Public QA ${record.stages.publicQA}\n\nRun [${record.runId}](${record.actionsURL}), attempt ${record.runAttempt}. Validated JSON size ${Buffer.byteLength(body)} bytes.\n`;
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, summary);
} catch {
  console.error('::error::Pages diagnostic could not be prepared. Check the recording step status.');
  process.exitCode = 1;
}
