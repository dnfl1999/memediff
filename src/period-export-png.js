import { canvasLines, canvasText } from './canvas-text.js';
import { observedCount, observedDuration, periodKeys } from './period-evidence.js';
import { periodHomepage } from './period-export.js';

export const periodImage = { width: 1400, height: 1080 };

const ink = '#eaf4df', green = '#a8ff32', cyan = '#63d8df', muted = '#b5c4c7', amber = '#f1cc8c';
const colors = [green, cyan];
const positions = [60, 710];
const compact = (value, complete) => observedCount(value) + (!complete && value !== null ? '+' : '');

export function drawPeriodComparison(context, data, logo) {
  const text = canvasText(context, ink);
  function rectangle(color, x, y, width, height) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }
  function monospace(value, x, y, color = ink, size = 18, width = 1280) {
    context.fillStyle = color;
    context.font = `${size}px ui-monospace, monospace`;
    const lines = canvasLines(context, value, width);
    lines.forEach((line, row) => context.fillText(line, x, y + row * (size + 6)));
    return lines.length;
  }
  function chart(kind, title, index) {
    const x = positions[index];
    rectangle('#151d19', x, 536, 630, 154);
    text(title, x + 20, 568, 22);
    const counts = periodKeys.map(key => data.periods[key].counts[kind]);
    const max = Math.max(1, ...counts.map(value => value ?? 0));
    periodKeys.forEach((key, i) => {
      const y = 590 + i * 36;
      text(key.toUpperCase(), x + 19, y + 15, 17, colors[i]);
      rectangle('#2a3530', x + 43, y, 438, 17);
      if (counts[i] > 0) rectangle(colors[i], x + 43, y, 438 * counts[i] / max, 17);
      text(compact(counts[i], data.periods[key].coverage[`${kind}Complete`]), x + 502, y + 15, 18, ink, 108);
    });
    const delta = data.difference[kind];
    text(`Observed difference (B − A) ${delta > 0 ? '+' : ''}${observedCount(delta)}`, x + 20, 671, 17, muted);
  }
  rectangle('#080a0b', 0, 0, periodImage.width, periodImage.height);
  if (logo?.complete && logo.naturalWidth && logo.naturalHeight) {
    const ratio = 68 / Math.max(logo.naturalWidth, logo.naturalHeight);
    context.drawImage(logo, 60, 43, logo.naturalWidth * ratio, logo.naturalHeight * ratio);
  } else {
    text('±', 60, 102, 60, green, 68);
  }
  text('MEMEDIFF / PUBLIC GITHUB OBSERVATION', 147, 64, 18, green);
  text('Period Comparison', 147, 108, 43);
  monospace(data.repository.name, 60, 166, ink, 26);
  text(`Observed at ${data.observedAtUtc}`, 60, 244, 22);

  periodKeys.forEach((key, index) => {
    const period = data.periods[key], x = positions[index];
    const { counts, coverage, effective } = period;
    rectangle('#151d19', x, 270, 630, 242);
    text(`PERIOD ${key.toUpperCase()}  ·  UTC`, x + 20, 303, 21, colors[index]);
    monospace(effective.startUtc, x + 20, 336, ink, 19, 535);
    monospace(`through ${effective.lastIncludedUtc}`, x + 20, 362, ink, 19, 535);
    text(`${observedDuration(period.durationMs)}${period.clipped ? ' · Partial UTC date' : ''}`, x + 20, 390, 18, muted);
    [
      ['Commits', counts.commits, coverage.commitsComplete],
      ['Public releases', counts.releases, coverage.releasesComplete],
      ['Linked authors', counts.authors, coverage.commitsComplete]
    ].forEach(([label, value, complete], i) => {
      text(label, x + 20 + i * 198, 419, 17, muted, 186);
      text(compact(value, complete), x + 20 + i * 198, 455, 29, colors[index], 182);
    });
    text(`Commits ${coverage.commitsComplete ? 'complete' : 'incomplete'} · Releases ${coverage.releasesComplete ? 'complete' : 'incomplete'}`,
      x + 20, 486, 18, coverage.commitsComplete && coverage.releasesComplete ? muted : amber);
    text(`Unlinked author commits ${compact(counts.unlinkedCommits, coverage.commitsComplete)}`, x + 20, 505, 16, muted);
  });
  chart('commits', 'Observed commits · Unique SHAs', 0);
  chart('releases', 'Observed public releases', 1);

  const shared = data.overlap;
  text(shared.exists ? `Periods overlap · Shared commit SHAs ${observedCount(shared.observedSharedCommits)} · Shared release IDs ${observedCount(shared.observedSharedReleases)}`
    : 'The selected UTC periods do not overlap.', 60, 731, 20, shared.exists ? amber : muted);
  text(data.unequalDurations ? 'Different durations · Compare the observed totals in context.' : 'Equal observed durations.', 60, 763, 20, muted);
  text('A + marks a lower bound. Unknown means collection could not confirm the count.', 60, 794, 20, muted);
  text('Default-branch committer dates and public release publication times define this scope.', 60, 826, 19, muted);
  text('Observed activity does not measure productivity or token safety.', 60, 858, 19, amber);
  text('GITHUB SOURCE', 60, 899, 18, green);
  monospace(data.repository.url, 60, 929, green, 18);
  text('PNG URLs are plain text. Download Comparison JSON for the full evidence links.', 60, 995, 19);
  monospace(`MemeDiff · ${periodHomepage}`, 60, 1040, green, 18);
}
