export function quantile(values, q) {
  if (!values.length) throw new Error("Cannot summarize an empty sample");
  const xs = [...values].sort((a, b) => a - b);
  const i = (xs.length - 1) * q;
  return xs[Math.floor(i)] + (xs[Math.ceil(i)] - xs[Math.floor(i)]) * (i % 1);
}
export function summarize(values) {
  return { median: quantile(values, 0.5), q25: quantile(values, 0.25), q75: quantile(values, 0.75), min: Math.min(...values), max: Math.max(...values) };
}
// Resample matched A/B runs, not individual keyboard events (which aren't independent).
export function pairedDifferenceCI(a, b, iterations = 5000) {
  if (!a.length || a.length !== b.length) throw new Error("Expected matched, nonempty runs");
  let seed = 42;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const aa = [], bb = [];
    for (let j = 0; j < a.length; j++) {
      const k = Math.floor(random() * a.length);
      aa.push(a[k]); bb.push(b[k]);
    }
    samples.push(quantile(bb, 0.5) - quantile(aa, 0.5));
  }
  return [quantile(samples, 0.025), quantile(samples, 0.975)];
}
