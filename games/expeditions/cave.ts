/** Crystal Cave for Rare Friends: Expeditions: a lantern-lit DESCENT (a different mini-game from the forest).
 *
 * The Friend is lowered down a winding shaft on a rope. A / D steer between the walls, holding W / Space
 * (or a tap) grips the rope to slow down, and S lets the rope run to dive faster. Rock ledges, hanging
 * spiders, cave bats and crystal beetles cost a heart; crystals give XP. It is dark: the Friend's lantern
 * lights the way down, and glowing crystals, mushrooms and creatures' eyes show what lies ahead.
 * The run ends in a grotto with the chest. Like the forest, the find is decided before the Friend sets out;
 * the descent only produces XP. All art is drawn in code. */

import { CRYSTAL, HEART, INK, drawPixmap, type Pixmap } from "./art.js";
import { hash } from "./scenery.js";

type Ctx = CanvasRenderingContext2D;

export const CAVE_FLOOR = 1700;       // world y of the grotto floor
export const CAVE_HERO_Y = 46;        // the Friend's feet on screen while descending
export const CAVE_CAM_MAX = CAVE_FLOOR - 118; // the camera stops so the floor sits low on screen

export type CaveKind = "ledge" | "slab" | "spider" | "cbat" | "beetle" | "rock" | "gust" | "crystal" | "heart";
export type CaveEntity = {
  kind: CaveKind; x: number; y: number; w: number; h: number; alive: boolean; phase: number;
  side: -1 | 1; x0: number; x1: number; dir: number; base: number;
  /** slab swing amplitude; rock: 0 waiting, 1 warning, 2 falling */
  amp: number; state: number; t: number;
};

/** The descent gets harder the deeper it goes: each zone adds new mechanics. */
export const CAVE_ZONES = [
  { from: 0, name: "Upper Shaft", note: "ledges and spiders" },
  { from: 460, name: "Windy Hollow", note: "gusts, bats and falling rocks" },
  { from: 900, name: "Crystal Depths", note: "narrow gates and swinging slabs" },
  { from: 1300, name: "The Deep Dark", note: "everything at once" },
] as const;
export const zoneAt = (y: number) => { let z = 0; for (let i = 0; i < CAVE_ZONES.length; i++) if (y >= CAVE_ZONES[i].from) z = i; return z; };
export type Light = { x: number; y: number; r: number; a: number; sy?: number };

/* ---------- shaft shape ---------- */
function grotto(d: number) { return Math.max(0, Math.min(1, (d - (CAVE_FLOOR - 150)) / 110)); }
export function wallL(d: number) {
  const base = 20 + 8 * Math.sin(d / 57) + 5 * Math.sin(d / 19 + 1) + 2 * Math.sin(d / 6.3);
  const t = grotto(d); return base * (1 - t) + 3 * t;
}
export function wallR(d: number) {
  const base = 220 - (8 * Math.sin(d / 63 + 2) + 5 * Math.sin(d / 21) + 2 * Math.sin(d / 7.1 + 3));
  const t = grotto(d); return base * (1 - t) + 237 * t;
}

/* ---------- creatures (pixel art in code) ---------- */
const SPIDER_A: Pixmap = { palette: { k: INK, p: "#6a4a8a", q: "#9a7ac0", e: "#ff4d6d" }, rows: [
  "k..k.k..k", ".k.kkk.k.", "..kqppk..", "kkpepepkk", "..kpppk..", ".k.kkk.k.", "k.......k"] };
const SPIDER_B: Pixmap = { palette: SPIDER_A.palette, rows: [
  ".k.k.k.k.", "k..kkk..k", "..kqppk..", "kkpepepkk", "..kpppk..", "k..kkk..k", ".k.....k."] };
const CBAT_UP: Pixmap = { palette: { k: INK, m: "#8a96b8", n: "#b8c4e0", y: "#ffe45a" }, rows: [
  "k..k...k..k", "kk.kk.kk.kk", "knk.kkk.knk", ".kmkmmmkmk.", "..kmymymk..", "...kkkkk..."] };
const CBAT_DOWN: Pixmap = { palette: CBAT_UP.palette, rows: [
  "...k...k...", "...kk.kk...", ".kkkmmmkkk.", "kmmkmymkmmk", "k.kkmmmkk.k", "....kkk...."] };
const BEETLE: Pixmap = { palette: { k: INK, c: "#3fb8c8", b: "#aef4ff", e: "#ffd23f" }, rows: [
  "...kkkk...", "..kbccbk..", ".kbccccbk.", "kkcccccckk", ".kkkkkkkke", ".k.k..k.k."] };
const BEETLE_B: Pixmap = { palette: BEETLE.palette, rows: [...BEETLE.rows.slice(0, 5), "k.k..k.k.."] };

function drawFlipped(ctx: Ctx, art: Pixmap, x: number, y: number, flip: boolean) {
  const w = art.rows[0].length;
  for (let j = 0; j < art.rows.length; j++) for (let i = 0; i < w; i++) {
    const ch = art.rows[j][flip ? w - 1 - i : i], c = art.palette[ch]; if (!c) continue;
    ctx.fillStyle = c; ctx.fillRect(x + i, y + j, 1, 1);
  }
}

/* ---------- level ---------- */
export function buildCave(rnd: () => number): CaveEntity[] {
  const list: CaveEntity[] = [];
  const ent = (kind: CaveKind, x: number, y: number, w: number, h: number, extra: Partial<CaveEntity> = {}): CaveEntity =>
    ({ kind, x, y, w, h, alive: true, phase: rnd() * 6, side: 1, x0: x, x1: x, dir: 1, base: y, amp: 0, state: 0, t: 0, ...extra });
  const crystal = (x: number, y: number) => list.push(ent("crystal", x, y, 5, 6));
  const ledge = (x: number, y: number, len: number, side: -1 | 1) => list.push(ent("ledge", x, y, len, 10, { side, base: y }));
  // One challenge per beat, always with a clear way past it. Beats get closer and the pool of
  // challenges grows zone by zone (see CAVE_ZONES).
  let y = 190;
  while (y < CAVE_FLOOR - 200) {
    const zone = zoneAt(y), l = wallL(y), rr = wallR(y), width = rr - l, mid = (l + rr) / 2;
    const pool: string[] = ["ledge", "ledge", "spider", "trail"];
    if (zone >= 1) pool.push("bat", "rock", "gust", "gust");
    if (zone >= 2) pool.push("gate", "gate", "slab", "slab", "rock");
    if (zone >= 3) pool.push("combo", "combo", "bats");
    const pick = pool[Math.floor(rnd() * pool.length)];
    let gap = Math.round((84 + rnd() * 34) * (1 - zone * 0.08));
    if (pick === "ledge") {
      // a rock ledge from one wall; the opening on the other side is at least 62 px wide
      const side: -1 | 1 = rnd() < 0.5 ? -1 : 1, open = 62 + Math.floor(rnd() * 22), len = Math.max(40, Math.round(width - open));
      const x = side === -1 ? Math.round(l) - 6 : Math.round(rr - len) + 6;
      ledge(x, y, len, side);
      const ox = side === -1 ? x + len + open / 2 : x - open / 2;
      for (let s = -1; s <= 1; s++) crystal(Math.round(ox - 2), y - 14 + s * 11);
      if (y > 480 && rnd() < 0.45) list.push(ent("beetle", x + 6, y - 6, 10, 6, { x0: x + 3, x1: x + len - 13, dir: rnd() < 0.5 ? -1 : 1 }));
    } else if (pick === "spider") {
      const x = Math.round(l + 30 + rnd() * (width - 70));
      list.push(ent("spider", x, y, 9, 7, { base: y }));
      const cx = x < mid ? x + 34 : x - 30;
      for (let s = 0; s < 3; s++) crystal(Math.round(cx), y - 12 + s * 12);
    } else if (pick === "bat" || pick === "bats") {
      const n = pick === "bats" ? 2 : 1;
      for (let k = 0; k < n; k++) list.push(ent("cbat", Math.round(l + 16 + rnd() * (width - 40)), y + k * 34, 11, 6, { dir: k % 2 ? -1 : 1, base: y + k * 34 }));
      gap += 10 + (n - 1) * 34;
    } else if (pick === "rock") {
      // a loose rock: the ceiling rumbles, a warning shows where it will fall, then it drops past the Friend
      list.push(ent("rock", 0, y, 8, 8, { base: y })); gap -= 20;
    } else if (pick === "gust") {
      // a draft blowing across the shaft for 70 px of depth: steer against it
      const dir = rnd() < 0.5 ? -1 : 1;
      list.push(ent("gust", l, y - 20, width, 70, { dir }));
      for (let s = 0; s < 4; s++) crystal(Math.round(dir > 0 ? rr - 26 - s * 4 : l + 20 + s * 4), y - 10 + s * 14);
      gap += 20;
    } else if (pick === "gate") {
      // two ledges with a narrow gap between them (38–46 px), a bonus crystal right in the gap
      const g = 38 + Math.floor(rnd() * 9), gx = Math.round(l + 34 + rnd() * (width - 68 - g));
      ledge(Math.round(l) - 6, y, gx - Math.round(l) + 6, -1);
      ledge(gx + g, y, Math.round(rr) + 6 - (gx + g), 1);
      crystal(gx + Math.round(g / 2) - 2, y - 16); crystal(gx + Math.round(g / 2) - 2, y + 1);
      gap += 12;
    } else if (pick === "slab") {
      // a stone slab hanging on chains, swinging across the shaft
      const w = 54 + Math.floor(rnd() * 16), amp = Math.max(18, Math.min(52, (width - w) / 2 - 36));
      list.push(ent("slab", mid - w / 2, y, w, 9, { x0: mid - w / 2, amp, base: y }));
      crystal(Math.round(mid - 2), y - 22); gap += 14;
    } else if (pick === "combo") {
      // a ledge with a spider guarding its opening
      const side: -1 | 1 = rnd() < 0.5 ? -1 : 1, open = 70 + Math.floor(rnd() * 14), len = Math.max(40, Math.round(width - open));
      const x = side === -1 ? Math.round(l) - 6 : Math.round(rr - len) + 6;
      ledge(x, y, len, side);
      const ox = side === -1 ? x + len + open / 2 : x - open / 2;
      list.push(ent("spider", Math.round(ox - 4), y - 30, 9, 7, { base: y - 30 }));
      crystal(Math.round(ox - 2 + (side === -1 ? 16 : -16)), y - 12);
      gap += 16;
    } else {
      // a winding trail of crystals
      const n = 4 + Math.floor(rnd() * 3), x0 = l + 24 + rnd() * (width - 60), dx = (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 5);
      for (let s = 0; s < n; s++) crystal(Math.round(Math.max(l + 10, Math.min(rr - 16, x0 + s * dx))), y + s * 11);
      gap = 70 + Math.floor(rnd() * 20);
    }
    y += Math.max(64, gap);
  }
  for (const at of [CAVE_FLOOR * 0.42, CAVE_FLOOR * 0.72]) if (rnd() < 0.85) {
    const l = wallL(at), rr = wallR(at); list.push(ent("heart", Math.round((l + rr) / 2 + (rnd() - 0.5) * 60), Math.round(at), 7, 6));
  }
  // keep hearts and crystals clear of ledges and slabs
  return list.filter(e => (e.kind !== "crystal" && e.kind !== "heart") || !list.some(o => (o.kind === "ledge" || o.kind === "slab") && e.x + e.w > o.x - 2 - o.amp && e.x < o.x + o.w + 2 + o.amp && e.y + e.h > o.y - 3 && e.y < o.y + o.h + 3));
}

/* ---------- drawing ---------- */
/** Back wall with parallax rock, strata and glowworms (glowworms add small lights). */
export function drawCaveBack(ctx: Ctx, depth: number, clock: number, still: boolean, lights: Light[]) {
  ctx.fillStyle = "#261f36"; ctx.fillRect(0, 0, 242, 160);
  const p = depth * 0.5, cell = 18, first = Math.floor(p / cell) - 1;
  for (let cy = first; cy < first + 160 / cell + 3; cy++) for (let cx = 0; cx < 15; cx++) {
    const h = hash(cx * 13.1 + cy * 7.7), sy = Math.round(cy * cell - p);
    if (h < 0.35) { ctx.fillStyle = "#1c1729"; ctx.fillRect(cx * 17 + Math.round(h * 9), sy + 3, 7 + Math.round(h * 8), 4); }
    else if (h > 0.8) { ctx.fillStyle = "#33293f"; ctx.fillRect(cx * 17 + 2, sy + 8, 5, 2); ctx.fillRect(cx * 17 + 3, sy + 7, 3, 1); }
    if (h > 0.93) { ctx.fillStyle = "#4a3d70"; ctx.fillRect(cx * 17 + 9, sy + 2, 2, 3); ctx.fillStyle = "#9a88d8"; ctx.fillRect(cx * 17 + 9, sy + 2, 1, 1); }
  }
  // strata
  ctx.fillStyle = "#2e2640";
  for (let k = Math.floor(p / 40) - 1; k < Math.floor(p / 40) + 6; k++) { const sy = Math.round(k * 40 - p); for (let x = 0; x < 242; x += 2) ctx.fillRect(x, sy + Math.round(3 * Math.sin(x / 23 + k)), 2, 1); }
  // glowworms (deeper parallax)
  const q = depth * 0.35;
  for (let i = 0; i < 26; i++) {
    const wy = Math.floor(q / 160) * 160 + (i * 61) % 160, sy = Math.round(wy - q + (wy - q < -4 ? 160 : 0)), sx = (i * 97 + 13) % 236;
    const tw = still ? 1 : 0.55 + 0.45 * Math.sin(clock * (1.3 + (i % 5) * 0.3) + i);
    ctx.fillStyle = `rgba(160,255,210,${(0.35 + tw * 0.55).toFixed(2)})`; ctx.fillRect(sx, sy, 1, 1);
    if (i % 3 === 0) lights.push({ x: sx, y: sy, r: 4, a: 0.35 * tw });
  }
}

/** Shaft walls (rock with lit edges, moss and crystal clusters that glow). */
export function drawCaveWalls(ctx: Ctx, depth: number, clock: number, still: boolean, lights: Light[]) {
  for (let y = 0; y < 160; y++) {
    const d = depth + y, l = Math.round(wallL(d)), r = Math.round(wallR(d));
    const pl = Math.round(wallL(d - 1)), pr = Math.round(wallR(d - 1));
    ctx.fillStyle = "#3d3354"; ctx.fillRect(0, y, l, 1); ctx.fillRect(r, y, 242 - r, 1);
    ctx.fillStyle = "#51466e"; ctx.fillRect(l - 4, y, 3, 1); ctx.fillRect(r + 1, y, 3, 1);
    ctx.fillStyle = INK; ctx.fillRect(Math.min(l, pl) - 1, y, Math.abs(l - pl) + 1, 1); ctx.fillRect(Math.min(r, pr), y, Math.abs(r - pr) + 1, 1);
    ctx.fillStyle = "#8a7cc0"; ctx.fillRect(l - 2, y, 1, 1); ctx.fillStyle = "#6a5e96"; ctx.fillRect(r + 1, y, 1, 1);
    const dd = Math.floor(d);
    if (hash(dd * 3.3) < 0.08) { ctx.fillStyle = "#2e2742"; ctx.fillRect(l - 9, y, 4, 2); }
    if (hash(dd * 5.9 + 1) < 0.08) { ctx.fillStyle = "#2e2742"; ctx.fillRect(r + 5, y, 4, 2); }
  }
  // wall decorations every 30 px of depth: moss tufts, crystal clusters, glowing fungus
  const first = Math.floor(depth / 30) - 1;
  for (let c = first; c < first + 8; c++) {
    const d = c * 30 + 12, sy = Math.round(d - depth), h = hash(c * 17.3), side = hash(c * 4.1) < 0.5 ? -1 : 1;
    const wx = side === -1 ? Math.round(wallL(d)) : Math.round(wallR(d));
    if (h < 0.3) { // crystal cluster
      const col = hash(c * 2.2) < 0.5 ? ["#3fc8f0", "#bff3ff"] : ["#b27ae8", "#e8ccff"];
      const x = side === -1 ? wx - 1 : wx - 4;
      ctx.fillStyle = INK; ctx.fillRect(x, sy - 5, 5, 6);
      ctx.fillStyle = col[0]; ctx.fillRect(x + 1, sy - 3, 1, 3); ctx.fillRect(x + 3, sy - 4, 1, 4); ctx.fillRect(x + 2, sy - 2, 1, 2);
      ctx.fillStyle = col[1]; ctx.fillRect(x + 3, sy - 4, 1, 1); ctx.fillRect(x + 1, sy - 3, 1, 1);
      lights.push({ x: x + 2, y: sy - 2, r: 9, a: still ? 0.5 : 0.4 + 0.15 * Math.sin(clock * 2 + c) });
    } else if (h < 0.55) { // moss
      ctx.fillStyle = "#5f9a6a"; const x = side === -1 ? wx - 3 : wx; ctx.fillRect(x, sy, 3, 2); ctx.fillRect(x + 1, sy + 2, 1, 2);
    } else if (h < 0.68) { // glowing fungus shelf
      const x = side === -1 ? wx - 1 : wx - 4;
      ctx.fillStyle = INK; ctx.fillRect(x, sy, 5, 2); ctx.fillStyle = "#6af0c8"; ctx.fillRect(x + 1, sy, 3, 1);
      lights.push({ x: x + 2, y: sy, r: 7, a: 0.4 });
    }
  }
}

/** Grotto floor with an underground pool, stalagmites and glowing crystals. */
export function drawCaveFloor(ctx: Ctx, depth: number, clock: number, still: boolean, lights: Light[]) {
  const fy = Math.round(CAVE_FLOOR - depth); if (fy > 170) return;
  ctx.fillStyle = INK; ctx.fillRect(0, fy, 242, 1);
  ctx.fillStyle = "#5a4f7a"; ctx.fillRect(0, fy + 1, 242, 3);
  ctx.fillStyle = "#3d3354"; ctx.fillRect(0, fy + 4, 242, 170 - fy);
  ctx.fillStyle = "#9a8cc8"; for (let x = 0; x < 242; x += 6) ctx.fillRect(x + (x % 4), fy + 1, 3, 1);
  ctx.fillStyle = "#2e2742"; for (let x = 0; x < 242; x += 13) ctx.fillRect(x + 4, fy + 9 + (x % 3) * 4, 6, 2);
  // pool on the left
  ctx.fillStyle = "#16364f"; ctx.fillRect(8, fy + 1, 70, 5); ctx.fillRect(12, fy + 6, 60, 3);
  ctx.fillStyle = "#2c6a8f"; ctx.fillRect(10, fy + 1, 66, 1);
  const sh = still ? 0 : Math.floor(clock * 6) % 20;
  ctx.fillStyle = "#8fd0f0"; ctx.fillRect(18 + sh, fy + 2, 4, 1); ctx.fillRect(46 + ((sh * 2) % 24), fy + 3, 3, 1);
  lights.push({ x: 43, y: fy + 3, r: 26, a: 0.18 });
  // stalagmites and crystal clumps
  for (const [x, h] of [[92, 9], [104, 5], [196, 11], [210, 6], [226, 8]] as const) {
    ctx.fillStyle = INK; for (let j = 0; j < h; j++) { const hw = Math.floor((j / h) * 3) + 1; ctx.fillRect(x - hw, fy - h + j, hw * 2 + 1, 1); }
    ctx.fillStyle = "#7a6ca8"; for (let j = 1; j < h; j++) ctx.fillRect(x - Math.floor((j / h) * 3) + 1, fy - h + j, 1, 1);
  }
  for (const [x, c] of [[120, "#3fc8f0"], [182, "#b27ae8"], [232, "#3fc8f0"]] as const) {
    ctx.fillStyle = INK; ctx.fillRect(x - 3, fy - 7, 7, 7); ctx.fillStyle = c; ctx.fillRect(x - 2, fy - 5, 1, 5); ctx.fillRect(x, fy - 6, 1, 6); ctx.fillRect(x + 2, fy - 4, 1, 4);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x, fy - 6, 1, 1);
    lights.push({ x, y: fy - 3, r: 14, a: 0.5 });
  }
}

/** A ledge: jagged rock with a lit top, moss, drips and glowing mushrooms. */
function drawLedge(ctx: Ctx, e: CaveEntity, sy: number, lights: Light[]) {
  const seed = e.base * 0.37;
  for (let i = 0; i < e.w; i++) {
    const x = Math.round(e.x) + i, top = sy + Math.floor(hash(seed + i * 0.61) * 2.2), hang = hash(seed + i * 1.37) < 0.18 ? 2 + Math.floor(hash(seed + i) * 4) : 0;
    const bottom = sy + e.h + hang;
    ctx.fillStyle = INK; ctx.fillRect(x, top - 1, 1, bottom - top + 2);
    ctx.fillStyle = "#564a76"; ctx.fillRect(x, top, 1, bottom - top);
    ctx.fillStyle = "#a496d8"; ctx.fillRect(x, top, 1, 1); ctx.fillStyle = "#7a6ca8"; ctx.fillRect(x, top + 1, 1, 1);
    ctx.fillStyle = "#3d3354"; ctx.fillRect(x, sy + e.h - 3, 1, 3 + hang - (hang ? 1 : 0));
    if (hash(seed + i * 2.9) < 0.22) { ctx.fillStyle = "#6fb07a"; ctx.fillRect(x, top, 1, 1); }
  }
  // one or two glowing mushrooms on top
  for (let k = 0; k < 2; k++) {
    if (hash(seed + k * 9.1) < 0.45) continue;
    const mx = Math.round(e.x + 6 + hash(seed + k * 3.3) * (e.w - 12)), my = sy - 1;
    ctx.fillStyle = INK; ctx.fillRect(mx - 2, my - 4, 5, 3); ctx.fillRect(mx - 1, my - 1, 3, 1);
    ctx.fillStyle = "#5af0ff"; ctx.fillRect(mx - 1, my - 3, 3, 1); ctx.fillStyle = "#d8f8ff"; ctx.fillRect(mx, my - 3, 1, 1);
    ctx.fillStyle = "#d8d0e8"; ctx.fillRect(mx, my - 2, 1, 2);
    lights.push({ x: mx, y: my - 3, r: 10, a: 0.55 });
  }
}

/** Draw one cave entity at screen y = e.y - depth. Returns glowing eyes/crystals as lights. */
export function drawCaveEntity(ctx: Ctx, e: CaveEntity, depth: number, clock: number, still: boolean, lights: Light[]) {
  const sy = Math.round(e.y - depth); if (sy < -60 || sy > 170 || !e.alive) return;
  const x = Math.round(e.x), f = still ? 0 : Math.floor(clock * 8 + e.phase) % 2;
  switch (e.kind) {
    case "ledge": drawLedge(ctx, e, sy, lights); return;
    case "slab": {
      // chains up into the dark, then the slab
      for (const cx of [x + 4, x + e.w - 5]) for (let yy = Math.max(-2, sy - 60); yy < sy; yy += 3) { ctx.fillStyle = INK; ctx.fillRect(cx, yy, 2, 2); ctx.fillStyle = "#8a8fa3"; ctx.fillRect(cx, yy, 1, 1); }
      ctx.fillStyle = INK; ctx.fillRect(x - 1, sy - 1, e.w + 2, e.h + 2);
      ctx.fillStyle = "#8a8fa8"; ctx.fillRect(x, sy, e.w, e.h); ctx.fillStyle = "#c8cce0"; ctx.fillRect(x, sy, e.w, 1);
      ctx.fillStyle = "#5c6072"; ctx.fillRect(x, sy + e.h - 2, e.w, 2);
      ctx.fillStyle = "#6c7084"; for (let i = 6; i < e.w - 4; i += 9) ctx.fillRect(x + i, sy + 3, 4, 1);
      ctx.fillStyle = "#b27ae8"; ctx.fillRect(x + Math.round(e.w / 2) - 1, sy + 3, 3, 3); ctx.fillStyle = "#e8ccff"; ctx.fillRect(x + Math.round(e.w / 2), sy + 3, 1, 1);
      lights.push({ x: x + e.w / 2, y: sy + 4, r: e.w * 0.6, a: 0.55, sy: 0.4 });
      return;
    }
    case "rock": {
      if (e.state !== 2) return;
      ctx.fillStyle = "rgba(200,190,230,.35)"; ctx.fillRect(x + 2, sy - 10, 1, 8); ctx.fillRect(x + 5, sy - 14, 1, 10);
      ctx.fillStyle = INK; ctx.fillRect(x, sy + 1, 8, 6); ctx.fillRect(x + 1, sy, 6, 8);
      ctx.fillStyle = "#7a6f96"; ctx.fillRect(x + 1, sy + 1, 6, 6); ctx.fillStyle = "#a496d8"; ctx.fillRect(x + 2, sy + 1, 3, 2); ctx.fillStyle = "#564a76"; ctx.fillRect(x + 4, sy + 5, 3, 2);
      return;
    }
    case "gust": return; // drawn over the darkness (see drawCaveGlints) so it always reads
    case "spider": {
      ctx.fillStyle = "rgba(220,220,240,.55)"; ctx.fillRect(x + 4, Math.round(e.base - 46 - depth), 1, sy - Math.round(e.base - 46 - depth));
      drawPixmap(ctx, f ? SPIDER_B : SPIDER_A, x, sy);
      lights.push({ x: x + 4, y: sy + 3, r: 5, a: 0.35 }); return;
    }
    case "cbat": drawFlipped(ctx, f ? CBAT_DOWN : CBAT_UP, x, sy, e.dir < 0); lights.push({ x: x + 5, y: sy + 4, r: 5, a: 0.35 }); return;
    case "beetle": drawFlipped(ctx, f ? BEETLE_B : BEETLE, x, sy, e.dir < 0); lights.push({ x: x + 5, y: sy + 2, r: 7, a: 0.45 }); return;
    case "crystal": {
      const bob = still ? 0 : Math.round(Math.sin(clock * 4 + e.phase));
      drawPixmap(ctx, CRYSTAL, x, sy + bob); lights.push({ x: x + 2, y: sy + 3 + bob, r: 7, a: 0.5 }); return;
    }
    case "heart": drawPixmap(ctx, HEART, x, sy + (still ? 0 : Math.round(Math.sin(clock * 4) * 1.5))); lights.push({ x: x + 3, y: sy + 3, r: 8, a: 0.45 }); return;
  }
}

/** Eyes and sparkles that must read in the dark: drawn after the darkness layer. */
export function drawCaveGlints(ctx: Ctx, list: readonly CaveEntity[], depth: number, clock: number, still: boolean) {
  for (const e of list) {
    if (!e.alive) continue;
    if (e.kind === "gust") {
      const top = Math.round(e.y - depth); if (top > 165 || top + e.h < -5) continue;
      for (let i = 0; i < 9; i++) {
        const ly = top + 4 + ((i * 23) % (e.h - 8)), len = 6 + (i % 3) * 4, span = e.w + 30;
        const off = still ? (i * 37) % span : ((clock * 90 + i * 41) % span);
        const lx = e.dir > 0 ? Math.round(e.x - 15 + off) : Math.round(e.x + e.w + 15 - off - len);
        ctx.fillStyle = "rgba(210,225,255,.35)"; ctx.fillRect(lx, ly, len, 1);
      }
      // chevrons on the wall show which way it blows
      const cx = e.dir > 0 ? Math.round(wallL(e.y + e.h / 2)) + 3 : Math.round(wallR(e.y + e.h / 2)) - 9;
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) { const px = cx + k * 3 + (e.dir > 0 ? j : 2 - j); ctx.fillRect(px, top + e.h / 2 - 3 + j, 1, 1); ctx.fillRect(px, top + e.h / 2 + 3 - j, 1, 1); }
      continue;
    }
    if (e.kind === "rock" && e.state === 1) {
      // warning: a blinking "!" at the top of the screen above where the rock will fall, and dust
      ctx.fillStyle = "rgba(255,77,109,.22)"; for (let yy = 36; yy < 70; yy += 4) ctx.fillRect(e.x + 1, yy, 6, 2);
      if (still || Math.floor(clock * 8) % 2 === 0) {
        ctx.fillStyle = INK; ctx.fillRect(e.x + 2, 22, 5, 11);
        ctx.fillStyle = "#ff4d6d"; ctx.fillRect(e.x + 3, 23, 3, 6); ctx.fillRect(e.x + 3, 30, 3, 2);
      }
      ctx.fillStyle = "rgba(200,190,230,.6)"; for (let k = 0; k < 4; k++) ctx.fillRect(e.x + 1 + ((k * 3) % 7), (clock * 60 + k * 11) % 22, 1, 1);
      continue;
    }
    const sy = Math.round(e.y - depth); if (sy < -10 || sy > 165) continue;
    const x = Math.round(e.x), blink = !still && Math.floor(clock * 3 + e.phase * 2) % 9 === 0;
    if (e.kind === "spider" && !blink) { ctx.fillStyle = "#ff4d6d"; ctx.fillRect(x + 3, sy + 3, 1, 1); ctx.fillRect(x + 5, sy + 3, 1, 1); }
    else if (e.kind === "cbat" && !blink) { ctx.fillStyle = "#ffe45a"; const f = still ? 0 : Math.floor(clock * 8 + e.phase) % 2; const ey = sy + (f ? 3 : 4); ctx.fillRect(x + 4, ey, 1, 1); ctx.fillRect(x + 6, ey, 1, 1); }
    else if (e.kind === "beetle") { ctx.fillStyle = "#ffd23f"; ctx.fillRect(e.dir < 0 ? x : x + 9, sy + 4, 1, 1); }
    else if (e.kind === "crystal" && !still && Math.sin(clock * 5 + e.phase * 3) > 0.85) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 2, sy - 1, 1, 1); ctx.fillRect(x + 4, sy + 1, 1, 1); }
  }
}

/** Darkness with holes for the lantern and every glowing thing. Drawn into a small offscreen canvas
 * at art resolution (so the light edges stay pixelated) and laid over the scene. */
export function createDarkness() {
  const c = document.createElement("canvas"); c.width = 240; c.height = 160;
  const g = c.getContext("2d");
  return function drawDarkness(ctx: Ctx, lights: readonly Light[], alpha: number) {
    if (!g) return;
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, 240, 160);
    g.fillStyle = `rgba(5,3,14,${alpha.toFixed(3)})`; g.fillRect(0, 0, 240, 160);
    g.globalCompositeOperation = "destination-out";
    for (const l of lights) {
      if (l.a <= 0.01 || l.y < -l.r * 2 || l.y > 160 + l.r * 2) continue;
      g.save(); g.translate(l.x, l.y); if (l.sy) g.scale(1, l.sy);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, l.r);
      grad.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a).toFixed(3)})`); grad.addColorStop(0.55, `rgba(0,0,0,${(l.a * 0.6).toFixed(3)})`); grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad; g.fillRect(-l.r, -l.r, l.r * 2, l.r * 2); g.restore();
    }
    ctx.drawImage(c, 0, 0);
  };
}

/** The cave entrance: daylight falling in at the very top of the shaft. */
export function drawCaveEntrance(ctx: Ctx, depth: number, lights: Light[]) {
  if (depth > 90) return;
  const a = 1 - depth / 90;
  const g = ctx.createLinearGradient(0, -depth, 0, 70 - depth);
  g.addColorStop(0, `rgba(190,220,255,${(0.5 * a).toFixed(3)})`); g.addColorStop(1, "rgba(190,220,255,0)");
  ctx.fillStyle = g; ctx.fillRect(40, 0, 160, 80);
  lights.push({ x: 120, y: -depth + 10, r: 70, a: 0.9 * a, sy: 0.8 });
}
