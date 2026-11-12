// Shared presentation for the DOM and PNG; no network or storage access.
export const utcRange = window => `${window.start} → ${window.end}`;
export function windowSummary(windows) {
  if (windows.relation === 'disjoint') return 'No overlap: these 30-day observation windows do not overlap. Missing SHA comparison is not applicable.';
  if (windows.relation === 'touching') return `Boundary only: ${windows.overlap.start}. No shared duration; only records at this exact instant can match the overlap.`;
  return `Shared interval (UTC): ${utcRange(windows.overlap)}. Both endpoints are included.`;
}
export function timelineRows(windows) {
  const origin = Date.parse(windows.previous.start), span = Date.parse(windows.current.end) - origin;
  const position = w => ({ left: (Date.parse(w.start) - origin) / span, width: (Date.parse(w.end) - Date.parse(w.start)) / span });
  return ['previous', 'current'].map(key => ({ key, ...position(windows[key]), overlap: windows.overlap ? position(windows.overlap) : null }));
}
