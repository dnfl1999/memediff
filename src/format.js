// Fixed display locale and timezone; stored timestamps and JSON numbers are unchanged.
const dates = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit',
  minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC', timeZoneName: 'short'
});
const numbers = new Intl.NumberFormat('en-US');
export function formatDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dates.format(date) : 'Unknown date';
}
export function formatNumber(value) { return numbers.format(value); }
