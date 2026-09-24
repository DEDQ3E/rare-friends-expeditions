// Economy tests: exact odds over all 10,000 rolls, expected return, reserve, keepsake bonus curve,
// exact session statistics, and that every published table (READMEs) matches game.json and scripts/sessions.mjs.
// Needs Node.js 22.18+ (imports keepsakes.ts directly).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessions } from "../scripts/sessions.mjs";
import { KEEP_CAP_BPS, KEEP_XP_BPS, keepsakeBps } from "../games/expeditions/keepsakes.ts";

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

console.log(`economy: ${passed} tests passed`);
