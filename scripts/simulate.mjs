// Seeded Monte Carlo of Expedition Pass sessions from game.json: every find is sold at the Merchant.
// Reproduces the "Simulated sessions" table in submission/README.md: node scripts/simulate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RF = 10n ** 18n;
const toRf = value => Number(BigInt(value) * 10000n / RF) / 10000;

/** Runs `sessions` sessions for each pass count in `passCounts`, in order, from one seeded generator. */
export function simulate(definition, passCounts = [10, 30], sessions = 200000, seed = 42) {
  const chances = definition.outcomes.map(o => o.chanceBps / 10000), rewards = definition.outcomes.map(o => toRf(o.reward));
  const price = toRf(definition.price);
  let state = seed;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const draw = () => { const r = random(); let c = 0; for (let i = 0; i < chances.length; i++) { c += chances[i]; if (r < c) return rewards[i]; } return rewards.at(-1); };
  return passCounts.map(passes => {
    const totals = new Float64Array(sessions);
    for (let k = 0; k < sessions; k++) { let t = 0; for (let j = 0; j < passes; j++) t += draw(); totals[k] = t; }
    totals.sort();
    const q = x => totals[Math.floor(x * (sessions - 1))];
    const mean = totals.reduce((a, b) => a + b, 0) / sessions;
    const ahead = totals.filter(v => v > passes * price).length / sessions;
    const fix = v => v.toFixed(2);
    return { passes, mean: fix(mean), p10: fix(q(0.1)), median: fix(q(0.5)), p90: fix(q(0.9)), p99: fix(q(0.99)), aheadPct: Math.round(ahead * 100) };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const definition = JSON.parse(readFileSync(new URL("../games/expeditions/game.json", import.meta.url), "utf8"));
  console.log("| Passes | Mean back | 10th pct | Median | 90th pct | 99th pct | Sessions ending ahead |");
  for (const r of simulate(definition))
    console.log(`| ${r.passes} (${r.passes} RF) | ${r.mean} RF | ${r.p10} RF | ${r.median} RF | ${r.p90} RF | ${r.p99} RF | ${r.aheadPct}% |`);
}
