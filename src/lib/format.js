// Compact number formatting for incremental games: 1234 -> "1.23K".
const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  // Show one decimal for small fractional amounts (e.g. 0.1/sec) so tiny
  // production rates don't read as "0".
  if (n > 0 && n < 1) return n.toFixed(1);
  if (n < 1000) return String(Math.floor(n));
  let v = n;
  let u = 0;
  while (v >= 1000 && u < UNITS.length - 1) {
    v /= 1000;
    u += 1;
  }
  const decimals = v < 10 ? 2 : v < 100 ? 1 : 0;
  return `${v.toFixed(decimals)}${UNITS[u]}`;
}
