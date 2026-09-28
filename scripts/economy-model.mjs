// Daily RF flows for 1,000 active players: an expected-value model built from game.json (exact odds and prices)
// and stated player assumptions. No sampling: every figure is an expectation, so it is reproducible.
// Reproduces the "1,000 players a day" table in submission/README.md: node scripts/economy-model.mjs
//
// Assumptions per scenario (per active player per day unless noted):
//   passes    Expedition Passes bought and played
//   keep      % of each rarity kept instead of sold (Junk has no RF value); rarer finds give more XP per RF held
//   holdDays  how long a kept find is held on average before it is sold (steady state: locked = kept per day × days)
//   outfitter RF spent on gear, clothes and trails (one-off catalog spread over a player's first weeks)
//   rations   % of expeditions that take a Trail Ration (0.2 RF, repeatable)
// Proposals, not in the SDK: the Outfitter burns 50% and sends 50% to Friend rewards; half of the game edge is burned.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PLAYERS = 1000;
export const RATION_RF = 0.2;
export const EDGE_BURN = 0.5;
/** Roadmap, not in the MVP: share of held finds traded per day and the part of a 5% trade fee that is burned. */
export const TRADED_PER_DAY = 0.05, TRADE_FEE_BURN = 0.025;
export const SCENARIOS = {
  Conservative: { passes: 5, keep: [0, 5, 10, 20, 30, 40, 50], holdDays: 7, outfitter: 0.2, rations: 10 },
  Base: { passes: 10, keep: [0, 10, 20, 40, 50, 60, 70], holdDays: 14, outfitter: 0.5, rations: 25 },
  Optimistic: { passes: 20, keep: [0, 20, 30, 50, 60, 70, 80], holdDays: 30, outfitter: 1, rations: 40 },
};

/** Expected daily RF flows for one scenario; `definition` is game.json with RF values as numbers (4 decimals).
 * Sums run on integers (bps × 1/10,000 RF × %), so the only rounding is in the printed table. */
export function model(definition, s, players = PLAYERS) {
  const passes = players * s.passes, r4 = v => Math.round(v * 10000);
  const evNum = definition.outcomes.reduce((t, o) => t + o.chanceBps * r4(o.reward), 0);             // / 1e8 RF
  const keptNum = definition.outcomes.reduce((t, o, i) => t + o.chanceBps * r4(o.reward) * s.keep[i], 0); // / 1e10 RF
  const top = Math.max(...definition.outcomes.map(o => o.reward));
  const spentIn = passes * definition.price;
  const kept = (passes * keptNum) / 1e10;
  const edge = spentIn - (passes * evNum) / 1e8;
  const sink = players * s.outfitter + (passes * s.rations * RATION_RF) / 100;
  const burned = sink * 0.5 + edge * EDGE_BURN;
  const locked = (passes * keptNum * s.holdDays) / 1e10;
  // SDK rule: every unplayed pass reserves the top prize; kept finds stay backed until redeemed. Unplayed passes:
  // about one per active player (passes are bought in threes and played one by one).
  const stake = players * top + locked;
  const tradeBurn = locked * TRADED_PER_DAY * TRADE_FEE_BURN;
  return { tradeBurn, passes, spentIn, paidOut: (passes * evNum) / 1e8, kept, edge, sink, burned, locked, stake };
}

const fmt = n => Math.round(n + 1e-9).toLocaleString("en-US");
export function table(definition) {
  const rows = Object.entries(SCENARIOS).map(([name, s]) => [name, model(definition, s)]);
  const line = (label, f) => `| ${label} | ${rows.map(([, r]) => f(r)).join(" | ")} |`;
  return [
    `| RF per day, ${fmt(PLAYERS)} players | ${rows.map(([n]) => n).join(" | ")} |`,
    `|---|${rows.map(() => "---:").join("|")}|`,
    line("Passes bought and played", r => `${fmt(r.passes)} RF`),
    line("Finds paid out at the Merchant (steady state)", r => `${fmt(r.paidOut)} RF`),
    line("New RF held in kept finds", r => `${fmt(r.kept)} RF`),
    line("Game edge (10%)", r => `${fmt(r.edge)} RF`),
    line("Outfitter and Trail Rations", r => `${fmt(r.sink)} RF`),
    line("**Burned** (50% of the Outfitter + 50% of the edge)", r => `**${fmt(r.burned)} RF**`),
    line("Backing held for kept finds (steady state)", r => `${fmt(r.locked)} RF`),
    line("Stake reserved (10 RF per unplayed pass + kept finds)", r => `${fmt(r.stake)} RF`),
    line("Roadmap: trade-fee burn (5% of held finds traded a day, 2.5% fee burned)", r => `${fmt(r.tradeBurn)} RF`),
  ].join("\n");
}

/** game.json with RF amounts converted from 18-decimal base units to numbers. */
export function loadDefinition() {
  const raw = JSON.parse(readFileSync(new URL("../games/expeditions/game.json", import.meta.url), "utf8"));
  const rf = v => Number(BigInt(v) * 10000n / 10n ** 18n) / 10000;
  return { price: rf(raw.price), outcomes: raw.outcomes.map(o => ({ chanceBps: o.chanceBps, reward: rf(o.reward) })) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(table(loadDefinition()));
