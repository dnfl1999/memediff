import { appendFile } from 'node:fs/promises';
import { MonitorReadError, monitorClient, observeMonitor, repository } from './index-monitor-data.mjs';
import { renderSummary, syncIssue } from './index-monitor-issues.mjs';

const request = monitorClient({ token: process.env.GH_TOKEN });
const mode = process.argv[2] ?? 'observe';
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const writeSummary = async text => {
  console.log(text);
  if (summaryPath) await appendFile(summaryPath, `${text}\n`);
};

try {
  if (mode === 'observe') {
    const observation = await observeMonitor(request);
    const preview = await syncIssue(request, observation);
    const transition = preview.actions.length ? `Would ${preview.actions.join(', ')}${preview.url ? ` ${preview.url}` : ''}` : `No issue change${preview.url ? ` · ${preview.url}` : ''}`;
    await writeSummary(renderSummary(observation, 'Read-only', transition));
    if (observation.index.state === 'unavailable' || observation.schedule.status === 'unavailable') {
      console.log('::warning::At least one monitor source was unavailable. Read the observation summary for the scope.');
    }
    if (observation.index.state === 'unavailable' && observation.schedule.status === 'unavailable' && !observation.activeFailure) {
      throw new MonitorReadError('Index Health Monitor', 'both observation sources unavailable');
    }
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `observation=${JSON.stringify(observation)}\n`);
  } else if (mode === 'publish') {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF !== 'refs/heads/main' ||
        !['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME) || process.env.MONITOR_WRITE !== 'true') {
      throw new MonitorReadError('Index Health Monitor', 'publishing is restricted to the authorized main workflow');
    }
    const observation = JSON.parse(process.env.MONITOR_OBSERVATION ?? 'null');
    const elapsed = Date.now() - Date.parse(observation?.at);
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 10 * 60000) {
      throw new MonitorReadError('Index Health Monitor', 'observation expired or invalid');
    }
    const result = await syncIssue(request, observation, { write: true });
    const transition = result.actions.length ? `Completed ${result.actions.join(', ')}` : 'No issue change';
    await writeSummary(`${renderSummary(observation, 'Publish', transition)}${result.url ? ` · ${result.url}` : ''}\n\nGitHub delivery follows the recipient’s notification settings.`);
  } else {
    throw new MonitorReadError('Index Health Monitor', 'unknown execution mode');
  }
} catch (error) {
  const message = error instanceof MonitorReadError ? error.message : 'Index Health Monitor: could not complete this operation';
  console.error(`::error::${message}`);
  await writeSummary(`### Index Health Monitor\n\n${message}. Issue changes can be verified against the next run.`);
  process.exitCode = 1;
}
