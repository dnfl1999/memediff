import { DAY, inWindow, safeLink } from './core.js';
import { formatNumber } from './format.js';

// Reuses the observed report. This is a shareable summary, not a new data source.
export function receiptData(report, days, comparison) {
  if (![7, 30].includes(days)) throw new Error('Unsupported receipt window');
  const now = Date.parse(report.fetchedAt);
  const recent = [...report.commits, ...report.releases]
    .filter(item => inWindow(item.date, now, days) && safeLink(item.url))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const m = report.metrics[days];
  return {
    repo: report.repo, observedAt: report.fetchedAt,
    windowStart: new Date(now - days * DAY).toISOString(), windowEnd: report.fetchedAt, days,
    branch: report.branch || '(none)', fork: report.fork, archived: report.archived,
    counts: [formatNumber(m.commits) + (report.coverage.commits ? '' : '+'),
      formatNumber(m.releases) + (report.coverage.releases ? '' : '+'),
      formatNumber(m.contributors) + (report.coverage.commits ? '' : '+')],
    complete: report.coverage.commits && report.coverage.releases,
    coverage: `Commits: ${report.coverage.commits ? 'complete' : 'INCOMPLETE'} | Releases: ${report.coverage.releases ? 'complete' : 'INCOMPLETE'} | Unlinked-author commits: ${m.unattributed}`,
    baseline: comparison ? `30-day baseline: ${comparison.previousAt}${comparison.baselineOrigin === 'imported-json' ? ' | IMPORTED / UNVERIFIED' : ''}` : '30-day baseline: not saved',
    changes: comparison ? `Newly observed SHA: ${comparison.observed.length} | No longer observed in overlap: ${comparison.missing.length}${comparison.partial ? ' | PARTIAL comparison' : ''}` : 'Save a baseline, then query again to compare observed SHA sets.',
    token: report.token || '(not recorded)',
    repoUrl: `https://github.com/${report.repo}`,
    evidenceUrl: recent ? safeLink(recent.url) : null
  };
}

export function drawReceipt(ctx, report, days, comparison) {
  const r = receiptData(report, days, comparison);
  const ink = '#eaf4df', green = '#a8ff32', muted = '#b5c4c7', amber = '#f1cc8c';
  ctx.fillStyle = '#080a0b'; ctx.fillRect(0, 0, 1400, 1020);
  function text(value, x, y, size = 22, color = ink, width = 1280) {
    ctx.fillStyle = color; ctx.font = `${size}px "Segoe UI", sans-serif`;
    let display = String(value);
    while (ctx.measureText(display).width > width && display.length > 1) display = display.slice(0, -2) + '…';
    ctx.fillText(display, x, y);
  }
  function urlLines(value, y) {
    // Split long URLs without ellipsis: the entire source must remain readable.
    ctx.fillStyle = green; ctx.font = '18px ui-monospace, monospace';
    let line = '', row = 0;
    for (const char of value) {
      if (ctx.measureText(line + char).width > 1280) { ctx.fillText(line, 60, y + row++ * 24); line = ''; }
      line += char;
    }
    ctx.fillText(line, 60, y + row * 24);
  }
  text('± MemeDiff / PUBLIC GITHUB OBSERVATION', 60, 48, 22, green);
  text('Development Receipt', 60, 98, 38);
  let repoSize = 40;
  ctx.font = `${repoSize}px "Segoe UI", sans-serif`;
  while (ctx.measureText(r.repo).width > 1280 && repoSize > 15) { repoSize--; ctx.font = `${repoSize}px "Segoe UI", sans-serif`; }
  text(r.repo, 60, 158, repoSize);
  text(`Observed at: ${r.observedAt}`, 60, 208, 24);
  const utc = value => value.replace('T', ' ').replace('.000Z', 'Z');
  text(`UTC window: ${utc(r.windowStart)} → ${utc(r.windowEnd)} | ${r.days} rolling days`, 60, 246, 21);
  text(`Default branch: ${r.branch} | ${r.fork ? 'Fork' : 'Non-fork'} | ${r.archived ? 'Archived' : 'Not archived'}`, 60, 282, 21, muted);
  ['COMMITS', 'PUBLIC RELEASES', 'LINKED CONTRIBUTORS'].forEach((label, i) => {
    const x = 60 + i * 440;
    ctx.fillStyle = '#151d19'; ctx.fillRect(x, 308, 400, 142);
    text(label, x + 20, 344, 20, muted, 360);
    text(r.counts[i], x + 20, 416, 58, green, 360);
  });
  text(r.complete ? 'Collection complete within the documented scope' : 'PARTIAL OBSERVATION — counts marked + are lower bounds', 60, 490, 24, r.complete ? green : amber);
  text(r.coverage, 60, 526, 21);
  text(r.baseline, 60, 568, 21, muted);
  text(r.changes, 60, 602, 21, muted);
  text('SHA changes are observations, not proof of new work or deletion.', 60, 634, 19, muted);
  text(`User-supplied token: ${r.token}`, 60, 674, 19);
  text('Token association and mint existence are not verified by this report.', 60, 704, 19, amber);
  text('SOURCE EVIDENCE', 60, 736, 20, green);
  urlLines(r.repoUrl, 766);
  // Commit URLs are bounded by validated owner/repository names and SHA. Release
  // URLs may be arbitrarily long; use the repository releases page in that case.
  const evidence = r.evidenceUrl && r.evidenceUrl.length > 220 ? `${r.repoUrl}/releases` : r.evidenceUrl;
  if (evidence) urlLines(evidence, 811);
  else text('No source item observed in this window. Check collection coverage.', 60, 811, 19, muted);
  text('Export JSON alongside this image for all API evidence links, limits and errors.', 60, 872, 20, muted);
  text('Default branch / committer date / published releases / linked accounts incl. bots', 60, 910, 20, muted);
  text('Activity is not a quality, safety or return score. This is not a signed certificate.', 60, 944, 20, amber);
  text('MemeDiff · MIT · https://dnfl1999.github.io/memediff/', 60, 987, 20, green);
}
