// Daily RF flows for 1,000 active players: an expected-value model built from game.json (exact odds and prices)
// and stated player assumptions. No sampling: every figure is an expectation, so it is reproducible.
// Reproduces the "1,000 players a day" and "30 days, day by day" tables in submission/README.md:
// node scripts/economy-model.mjs
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

/* ---------- 30 days, day by day ---------- */
// The same scenarios run for 30 days against the game bank (the SDK ChanceGame's stake), with the contract's rules:
//   buy     needs free stake of at least the top prize, adds the pass price to the stake and reserves the top prize;
//   settle  releases that reserve and books the find's fixed RF as a liability (kept finds stay backed);
//   redeem  pays the find's RF out of the stake and clears its liability.
// free stake = stake − reserved passes − liability for kept finds. It must never go below zero; the contract refuses
// a pass it cannot back, so demand above the bank's capacity is turned away, not sold unbacked.
// Assumptions (player behaviour, stated, not measured):
//   - the scenario's passes per player are all played the same day, one at a time: at the day's busiest moment every
//     playing player holds one unplayed pass (the "lowest free stake" is taken at that moment);
//   - finds are kept in the scenario's share per rarity; a kept find is sold exactly `holdDays` days later (a cohort),
//     all other finds are sold the day they are found;
//   - Outfitter and Trail Ration spending as in the daily model, only by players who could play that day;
//   - half of the Outfitter and half of the game edge are burned (proposal), the edge half leaving the free stake;
//   - the bank starts with FUNDING RF from the builder: 10 RF (one top prize) per player of the 1,000-player base.
export const DAYS = 30, FUNDING = PLAYERS * 10, RUSH_DAY = 30;
export const STRESS = {
  "Stress: everyone sells every kept find on day 30": { base: "Base", rushDay: RUSH_DAY },
  "Stress: nobody ever sells a find": { base: "Base", keepAll: true },
  "Stress: 10× the players, same 10,000 RF funding": { base: "Base", players: PLAYERS * 10 },
};

/** Day-by-day run of one scenario. RF amounts are numbers (expectations, no sampling). */
export function simulate(definition, s, { players = PLAYERS, days = DAYS, funding = FUNDING, rushDay = 0, keepAll = false } = {}) {
  const top = Math.max(...definition.outcomes.map(o => o.reward));
  const ev = definition.outcomes.reduce((t, o) => t + (o.chanceBps / 10000) * o.reward, 0);
  const keep = keepAll ? definition.outcomes.map(() => 100) : s.keep;
  const keptEv = definition.outcomes.reduce((t, o, i) => t + (o.chanceBps / 10000) * o.reward * (keep[i] / 100), 0);
  const hold = keepAll ? Infinity : s.holdDays;
  let stake = funding, liability = 0, minFree = Infinity, burned = 0, played = 0, refused = 0, redeemed = 0;
  const due = new Map(), log = [];
  for (let day = 1; day <= days; day++) {
    // kept finds whose holding time is over are sold at the Merchant (paid from the stake)
    const out = due.get(day) ?? 0; stake -= out; liability -= out; redeemed += out; due.delete(day);
    // players buy one pass at a time; the contract sells a pass only while the free stake covers the top prize
    const free0 = stake - liability;
    const capacity = free0 >= top ? Math.floor((free0 - top) / (top - definition.price)) + 1 : 0;
    const served = Math.min(players, capacity), passes = served * s.passes;
    refused += (players - served) * s.passes; played += passes;
    minFree = Math.min(minFree, free0 - served * (top - definition.price)); // every playing player holds one unplayed pass
    // the day's passes are played and settled: the reserve is released, finds are booked, the sold ones paid out
    stake += passes * definition.price;
    const found = passes * ev, kept = passes * keptEv;
    stake -= found - kept; liability += kept;
    if (Number.isFinite(hold)) due.set(day + hold, (due.get(day + hold) ?? 0) + kept);
    // proposals: burn half of the Outfitter and Trail Rations, and half of the game edge (out of the free stake)
    const sink = served * s.outfitter + (passes * s.rations * RATION_RF) / 100, edge = passes * (definition.price - ev);
    stake -= edge * EDGE_BURN; burned += sink * 0.5 + edge * EDGE_BURN;
    if (day === rushDay) { stake -= liability; redeemed += liability; liability = 0; due.clear(); }
    minFree = Math.min(minFree, stake - liability);
    log.push({ day, served, passes, stake, liability, free: stake - liability, burned });
  }
  return { played, refused, refusedPct: (100 * refused) / (played + refused), burned, held: liability, redeemed, stake, minFree, solvent: minFree >= -1e-9, log };
}

/** All 30-day runs: the three scenarios, then the stress tests (built on the Base scenario). */
export function runs30(definition) {
  const rows = Object.entries(SCENARIOS).map(([name, s]) => [name, simulate(definition, s)]);
  for (const [name, st] of Object.entries(STRESS)) rows.push([name, simulate(definition, SCENARIOS[st.base], st)]);
  return rows;
}

export function table30(definition) {
  return [
    `| 30 days (${fmt(FUNDING)} RF funding) | Passes played | Passes refused | **Burned** | RF held in kept finds (day 30) | Lowest free stake | Free stake, day 30 | Bank never below zero |`,
    "|---|---:|---:|---:|---:|---:|---:|:---:|",
    ...runs30(definition).map(([name, r]) => `| ${name} | ${fmt(r.played)} | ${r.refused ? `${fmt(r.refused)} (${Math.round(r.refusedPct)}%)` : "0"} | **${fmt(r.burned)} RF** | ${fmt(r.held)} RF | ${fmt(r.minFree)} RF | ${fmt(r.stake - r.held)} RF | ${r.solvent ? "yes" : "**no**"} |`),
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`${table(loadDefinition())}\n\n${table30(loadDefinition())}`);
