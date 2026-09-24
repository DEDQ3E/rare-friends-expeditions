// Exact distribution of Expedition Pass sessions from game.json, every find sold at the Merchant.
// No sampling: the RF returned after N passes is convolved over all 7^N outcome combinations with
// integer weights (chance in bps), so every figure is exact. Reproduces the "Sessions" table in
// submission/README.md: node scripts/sessions.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RF = 10n ** 18n;

/** Returns exact session statistics for each pass count; RF values are in RF, percentages in %. */
export function sessions(definition, passCounts = [10, 30]) {
  const rewards = definition.outcomes.map(o => BigInt(o.reward));
  const unit = rewards.reduce((g, r) => { let a = g, b = r; while (b) [a, b] = [b, a % b]; return a; }, RF); // RF step shared by all prizes
  const steps = rewards.map(r => Number(r / unit)), weights = definition.outcomes.map(o => BigInt(o.chanceBps));
  const toRf = step => Number(BigInt(step) * unit * 10000n / RF) / 10000;
  const price = definition.price;
  return passCounts.map(passes => {
    let dist = [1n];
    for (let k = 0; k < passes; k++) {
      const next = new Array(dist.length + Math.max(...steps)).fill(0n);
      dist.forEach((w, s) => { if (w) steps.forEach((st, i) => { next[s + st] += w * weights[i]; }); });
      dist = next;
    }
    const total = 10000n ** BigInt(passes);
    const quantile = q => { let c = 0n; for (let s = 0; s < dist.length; s++) { c += dist[s]; if (c * 10000n >= total * BigInt(q * 10000)) return toRf(s); } };
    const cost = BigInt(passes) * price;
    let ahead = 0n, weighted = 0n;
    dist.forEach((w, s) => { weighted += w * BigInt(s); if (BigInt(s) * unit > cost) ahead += w; });
    const fix = v => v.toFixed(2);
    return {
      passes,
      mean: fix(Number(weighted * unit * 100n / total / RF) / 100),
      p10: fix(quantile(0.1)), median: fix(quantile(0.5)), p90: fix(quantile(0.9)), p99: fix(quantile(0.99)),
      aheadPct: Number(ahead * 1000n / total) / 10,
    };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const definition = JSON.parse(readFileSync(new URL("../games/expeditions/game.json", import.meta.url), "utf8"));
  definition.price = BigInt(definition.price);
  console.log("| Passes | Mean back | 10th pct | Median | 90th pct | 99th pct | Sessions ending ahead |");
  for (const r of sessions(definition))
    console.log(`| ${r.passes} (${r.passes} RF) | ${r.mean} RF | ${r.p10} RF | ${r.median} RF | ${r.p90} RF | ${r.p99} RF | ${Math.round(r.aheadPct)}% |`);
}
