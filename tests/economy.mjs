// Economy tests: exact odds over all 10,000 rolls, expected return, reserve, keepsake bonus curve and glow,
// exact session statistics, the 1,000-player model, the Outfitter catalog, placeholder prices that scale together,
// and that every published table (READMEs) matches game.json, scripts/sessions.mjs and scripts/economy-model.mjs.
// Needs Node.js 22.18+ (imports keepsakes.ts directly).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessions } from "../scripts/sessions.mjs";
import { PLAYERS, RATION_RF, SCENARIOS, loadDefinition, model, table } from "../scripts/economy-model.mjs";
import { GLOW_MIN_TIER, KEEP_CAP_BPS, KEEP_XP_BPS, glowAfterSelling, glowTier, keepsakeBps } from "../games/expeditions/keepsakes.ts";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const game = JSON.parse(read("games/expeditions/game.json"));
const RF = 10n ** 18n, price = BigInt(game.price), rewards = game.outcomes.map(o => BigInt(o.reward));
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok - ${name}`); };

test("seven rarity tiers whose chances total 10,000 bps", () => {
  assert.equal(game.outcomes.length, 7);
  assert.equal(game.outcomes.reduce((t, o) => t + o.chanceBps, 0), 10000);
});

test("exact odds: all 10,000 rolls map to each tier exactly chanceBps times", () => {
  const counts = new Array(7).fill(0);
  for (let roll = 0; roll < 10000; roll++) {
    let cumulative = 0;
    const tier = game.outcomes.findIndex(o => roll < (cumulative += o.chanceBps));
    counts[tier]++;
  }
  assert.deepEqual(counts, game.outcomes.map(o => o.chanceBps));
});

test("expected return is exactly 0.90 RF per 1 RF pass (10% edge)", () => {
  assert.equal(price, RF);
  const ev = game.outcomes.reduce((t, o) => t + BigInt(o.chanceBps) * BigInt(o.reward), 0n) / 10000n;
  assert.equal(ev, 9n * RF / 10n);
});

test("top prize 10 RF; 23% chance of 1 RF or more; junk pays nothing", () => {
  assert.equal(rewards.reduce((m, r) => (r > m ? r : m), 0n), 10n * RF);
  assert.equal(game.outcomes.reduce((t, o) => t + (BigInt(o.reward) >= price ? o.chanceBps : 0), 0), 2300);
  assert.equal(rewards[0], 0n);
});

test("prices rise with rarity", () => {
  for (let i = 1; i < rewards.length; i++) assert.ok(rewards[i] > rewards[i - 1], `tier ${i}`);
});

test("keepsake bonus: junk gives none, more bonus per RF for rarer finds, capped at +50%", () => {
  assert.equal(KEEP_XP_BPS.length, 7);
  assert.equal(KEEP_XP_BPS[0], 0);
  const perRf = KEEP_XP_BPS.map((bps, i) => (rewards[i] === 0n ? 0 : bps / (Number(rewards[i]) / 1e18)));
  for (let i = 2; i < perRf.length; i++) assert.ok(perRf[i] > perRf[i - 1], `bonus per RF must grow at tier ${i}`);
  assert.equal(KEEP_CAP_BPS, 5000);
  assert.ok(KEEP_XP_BPS.every(b => b <= KEEP_CAP_BPS), "no single find exceeds the cap");
  assert.equal(keepsakeBps([0n, 1n, 1n, 1n, 0n, 0n, 0n]), 750);
  assert.equal(keepsakeBps([5n, 0n, 0n, 0n, 0n, 0n, 2n]), 5000);
});

test("keepsake glow: the rarest kept find from Rare up; selling the last one dims or ends it", () => {
  assert.equal(GLOW_MIN_TIER, 3);
  assert.equal(glowTier([9n, 9n, 9n, 0n, 0n, 0n, 0n]), 0);
  assert.equal(glowTier([0n, 0n, 0n, 1n, 0n, 0n, 0n]), 3);
  assert.equal(glowTier([0n, 0n, 0n, 2n, 1n, 0n, 1n]), 6);
  const inv = [0n, 0n, 0n, 1n, 0n, 2n, 0n];
  assert.equal(glowAfterSelling(inv, 5, 1n), 5, "one Legendary left keeps the gold glow");
  assert.equal(glowAfterSelling(inv, 5, 2n), 3, "selling both Legendaries dims it to blue");
  assert.equal(glowAfterSelling([0n, 0n, 0n, 0n, 1n, 0n, 0n], 4, 1n), 0, "selling the only Epic puts it out");
});

// "| Acorn | Common | 35% | 0.4 RF |" rows in the published tables
const tableRows = text => [...text.matchAll(/^\| ([A-Z][\w ]+?) \| (Junk|Common|Uncommon|Rare|Epic|Legendary|Mythic) \| (\d+)%[^|]*\| (—|[\d.]+ RF) \|/gm)]
  .map(m => ({ rarity: m[2], chance: Number(m[3]), pays: m[4] === "—" || m[4] === "0 RF" ? 0 : Number(m[4].replace(" RF", "")) }));
const rfNumber = r => Number(r * 10000n / RF) / 10000;

for (const file of ["README.md", "games/expeditions/README.md", "submission/README.md"]) {
  const rows = tableRows(read(file));
  if (!rows.length) continue;
  test(`${file}: odds and Merchant prices match game.json`, () => {
    assert.equal(rows.length, 7);
    rows.forEach((row, i) => { assert.equal(row.chance * 100, game.outcomes[i].chanceBps); assert.equal(row.pays, rfNumber(rewards[i])); });
  });
}

test("submission/README.md: keepsake bonuses match keepsakes.ts", () => {
  const text = read("submission/README.md");
  const labels = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
  labels.forEach((label, i) => assert.ok(text.includes(`${label} +${KEEP_XP_BPS[i + 1] / 100}%`), `${label} +${KEEP_XP_BPS[i + 1] / 100}%`));
});

test("sessions: the exact mean is N × 0.90 RF", () => {
  for (const r of sessions({ ...game, price })) assert.equal(r.mean, (r.passes * 0.9).toFixed(2));
});

test("submission/README.md: session table matches scripts/sessions.mjs", () => {
  const text = read("submission/README.md");
  for (const r of sessions({ ...game, price })) {
    const row = `| ${r.passes} (${r.passes} RF) | ${r.mean} RF | ${r.p10} RF | ${r.median} RF | ${r.p90} RF | ${r.p99} RF | ${Math.round(r.aheadPct)}% |`;
    assert.ok(text.includes(row), `missing row: ${row}`);
  }
});

test("1,000-player model: flows add up, stake covers the reserve, burn is 7–10% of RF spent", () => {
  const def = loadDefinition();
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    const r = model(def, sc);
    assert.ok(Math.abs(r.paidOut + r.edge - r.spentIn) < 1e-6, name);
    assert.ok(Math.abs(r.edge - r.spentIn / 10) < 1e-6, `${name}: edge is 10%`);
    assert.ok(Math.abs(r.stake - (PLAYERS * 10 + r.locked)) < 1e-6, `${name}: stake`);
    const share = r.burned / (r.spentIn + r.sink);
    assert.ok(share >= 0.07 && share < 0.105, `${name}: burn share ${share}`);
  }
});

test("submission/README.md: 1,000-player table matches scripts/economy-model.mjs", () => {
  assert.ok(read("submission/README.md").includes(table(loadDefinition())));
});

test("Trail Rations cost 0.2 RF in the game and in the model", () => {
  assert.ok(read("games/expeditions/index.tsx").includes("const RATION_PRICE = RF_UNIT / 5n;"));
  assert.equal(RATION_RF, 0.2);
});

test("Outfitter catalog: 80 RF in total, 2–8 RF per item, as published", () => {
  const store = read("games/expeditions/index.tsx").match(/const STORE[\s\S]*?\n\];/)[0];
  const wear = read("games/expeditions/wardrobe.ts").match(/export const WARDROBE[\s\S]*?\n\];/)[0];
  const prices = [...(store + wear).matchAll(/price: (\d+)/g)].map(m => Number(m[1]));
  assert.equal(prices.reduce((a, b) => a + b, 0), 80);
  assert.equal(Math.min(...prices), 2); assert.equal(Math.max(...prices), 8);
  assert.ok(read("submission/README.md").includes("2–8 RF per item, 80 RF for the full catalog"));
});

test("placeholder prices: scaling every RF amount by 5 keeps odds, the 90% return and sessions ahead", () => {
  const k = 5n, scaled = { ...game, price: price * k, outcomes: game.outcomes.map(o => ({ ...o, reward: (BigInt(o.reward) * k).toString() })) };
  const ev = scaled.outcomes.reduce((t, o) => t + BigInt(o.chanceBps) * BigInt(o.reward), 0n) / 10000n;
  assert.equal(ev * 10n, scaled.price * 9n, "expected return stays 90% of the pass price");
  assert.equal(scaled.outcomes.reduce((t, o) => t + (BigInt(o.reward) >= scaled.price ? o.chanceBps : 0), 0), 2300);
  const base = sessions({ ...game, price }), big = sessions(scaled);
  big.forEach((r, i) => {
    assert.equal(r.aheadPct, base[i].aheadPct, "same share of sessions ahead");
    for (const q of ["mean", "p10", "median", "p90", "p99"]) assert.equal(Number(r[q]).toFixed(2), (Number(base[i][q]) * 5).toFixed(2), q);
  });
});

console.log(`economy: ${passed} tests passed`);
