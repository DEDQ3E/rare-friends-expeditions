/** Forest creatures and obstacles for Rare Friends: Expeditions (pixel art in code). */

import { INK, drawPixmap, type Pixmap } from "./art.js";

type Ctx = CanvasRenderingContext2D;
const W_ = "#ffffff";

export type MobKind = "root" | "rock" | "log" | "shroom" | "slime" | "hedgehog" | "frog" | "bee" | "wasp" | "bat";

/** Hitbox size (w × h, in art pixels) for each kind. */
export const MOB_SIZE: Readonly<Record<MobKind, { w: number; h: number }>> = {
  root: { w: 12, h: 7 }, rock: { w: 10, h: 7 }, log: { w: 20, h: 8 }, shroom: { w: 9, h: 9 },
  slime: { w: 12, h: 8 }, hedgehog: { w: 13, h: 7 }, frog: { w: 9, h: 7 },
  bee: { w: 12, h: 5 }, wasp: { w: 12, h: 5 }, bat: { w: 11, h: 6 },
};

/** Slime colour variants: 0 green (hops), 1 purple (crawls), 2 blue (fast). */
export const SLIME_COLORS = [
  { a: "#5ccb5f", b: "#b6f59a" }, { a: "#c13bd4", b: "#e28af0" }, { a: "#4aa3ff", b: "#a8d8ff" },
] as const;
const SLIME_A = ["....kkkk....", "..kkaaaakk..", ".kaabbaaaak.", ".kabbaaaaak.", "kaaawwaawwak", "kaaawkaawkak", "kaaaaaaaaaak", ".kkkkkkkkkk."];
const SLIME_B = ["............", "...kkkkkk...", ".kkaabbaaakk", "kaabbaaaaaak", "kaaawwaawwak", "kaaawkaawkak", "kaaaaaaaaaak", "kkkkkkkkkkkk"];

const HEDGEHOG: Pixmap = { palette: { k: INK, s: "#6b4a2b", t: "#8b6a45", f: "#e0b07a", e: INK, n: "#1c1c1c" }, rows: [
  "....k.k.k.k..", "...ktktktktk.", ".kkstststssk.", "kffessssssssk", "nfffssssssssk", ".kfffffffffk.", "..kk.kk.kk..."] };
const HEDGEHOG_B: Pixmap = { palette: HEDGEHOG.palette, rows: [...HEDGEHOG.rows.slice(0, 6), "...kk.kk.kk.."] };
const FROG_SIT: Pixmap = { palette: { k: INK, a: "#5ccb5f", b: "#a8f07a", w: W_ }, rows: [
  "..kk.kk..", ".kwkkwk..", "kaaaaaaak", "kabaaaaak", "kaaaaaaak", ".kaakaak.", "kk.....kk"] };
const FROG_JUMP: Pixmap = { palette: FROG_SIT.palette, rows: [
  "..kk.kk..", ".kwkkwk..", "kaaaaaaak", "kabaaaaak", ".kaaaaak.", "kk.kak.kk", "k.......k"] };
const BAT_UP: Pixmap = { palette: { k: INK, m: "#5a3f7a", w: "#ffd23f" }, rows: [
  "k.........k", "kk.......kk", "kmk.kkk.kmk", ".kmkmmmkmk.", "..kmwmwmk..", "...kkkkk..."] };
const BAT_DOWN: Pixmap = { palette: BAT_UP.palette, rows: [
  "...........", "....kkk....", ".kkkmmmkkk.", "kmmkmwmkmmk", "k.kkmmmkk.k", "....kkk...."] };
const ROCK: Pixmap = { palette: { k: INK, g: "#8a8fa3", h: "#b6bccc", c: "#666b80", m: "#6cc04a" }, rows: [
  "...kkkk...", "..kmmmmk..", ".kghhggmk.", "kghhggggck", "kgggggggck", "kggggggcck", "kkkkkkkkkk"] };
const SHROOM: Pixmap = { palette: { k: INK, r: "#e04848", w: W_, c: "#f2e2c0" }, rows: [
  "..kkkkk..", ".krrwrrk.", "krwrrrwrk", "krrrrrrrk", "kkkkkkkkk", "...kck...", "...kck...", "..kccck..", "..kkkkk.."] };

// Bees and wasps: 12×10 art; the hitbox is the 5-row body (rows 4–8), wings are drawn above it.
const BEE_BODY = ["..kkkkkkkk..", ".khhkllkllk.", "khwhkyykyyyk", ".khhkyykyyk.", "..kkkkkkkk..", "...k.k.k...."];
const BEE_UP = ["....kkk.kkk.", "...kwbwkwbwk", "k..kwwwkwwk.", ".k..kwkkwk..", ...BEE_BODY];
const BEE_DOWN = ["............", "............", "k..kkkkkkk..", ".k.kwbwwbwk.", ...BEE_BODY];
const BEE_PAL = { k: INK, h: "#3a2a1a", w: "rgba(235,245,255,.92)", b: "#b8dcff", y: "#ffc93c", l: "#fff09a" };
const WASP_PAL = { k: INK, h: "#1c1c1c", w: "rgba(235,245,255,.92)", b: "#b8dcff", y: "#ff7a2f", l: "#ffb27a" };

/** Draw a mob with its top-left at (x, top). `clock` drives animation; `variant` picks colours. */
export function drawMob(ctx: Ctx, kind: MobKind, x: number, top: number, clock: number, phase: number, variant: number, still: boolean) {
  const f = still ? 0 : Math.floor(clock * 6 + phase) % 2;
  switch (kind) {
    case "root":
      ctx.fillStyle = INK; ctx.fillRect(x, top + 2, 12, 5); ctx.fillRect(x + 2, top, 8, 3);
      ctx.fillStyle = "#8b5a2b"; ctx.fillRect(x + 1, top + 3, 10, 3); ctx.fillRect(x + 3, top + 1, 6, 2); ctx.fillStyle = "#a8743c"; ctx.fillRect(x + 3, top + 1, 2, 1);
      ctx.fillStyle = "#7fcf4f"; ctx.fillRect(x + 8, top - 1, 2, 2);
      return;
    case "rock": drawPixmap(ctx, ROCK, x, top); return;
    case "shroom": drawPixmap(ctx, SHROOM, x, top); return;
    case "log": {
      ctx.fillStyle = INK; ctx.fillRect(x + 2, top, 18, 8); ctx.fillRect(x, top + 1, 4, 6);
      ctx.fillStyle = "#7a4a26"; ctx.fillRect(x + 3, top + 1, 16, 6); ctx.fillStyle = "#5a3218"; for (let i = 5; i < 18; i += 4) ctx.fillRect(x + i, top + 2 + (i % 3), 3, 1);
      ctx.fillStyle = "#c89a62"; ctx.fillRect(x + 1, top + 2, 2, 4); ctx.fillStyle = "#e0b07a"; ctx.fillRect(x + 1, top + 3, 1, 2);
      ctx.fillStyle = "#6cc04a"; ctx.fillRect(x + 9, top - 1, 4, 1); ctx.fillRect(x + 10, top - 2, 1, 1);
      return;
    }
    case "slime": {
      const c = SLIME_COLORS[variant % 3];
      drawPixmap(ctx, { palette: { k: INK, a: c.a, b: c.b, w: W_ }, rows: f ? SLIME_B : SLIME_A }, x, top);
      return;
    }
    case "hedgehog": drawPixmap(ctx, f ? HEDGEHOG_B : HEDGEHOG, x, top); return;
    case "frog": drawPixmap(ctx, variant ? FROG_JUMP : FROG_SIT, x, top); return;
    case "bat": drawPixmap(ctx, f ? BAT_DOWN : BAT_UP, x, top); return;
    case "bee": case "wasp": {
      const wing = still ? 0 : Math.floor(clock * 18 + phase) % 2;
      drawPixmap(ctx, { palette: kind === "wasp" ? WASP_PAL : BEE_PAL, rows: wing ? BEE_DOWN : BEE_UP }, x, top - 4);
      return;
    }
  }
}
