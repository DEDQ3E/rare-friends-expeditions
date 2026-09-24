/** Camp props for Rare Friends: Expeditions: tent, shop, quest board, treasure chest, campfire and more.
 * Drawn in code at 1 canvas pixel = 1 art pixel; night lighting with warm light sources. */

import { INK } from "./art.js";

type Ctx = CanvasRenderingContext2D;
export type CampFrame = Readonly<{ ctx: Ctx; clock: number; still: boolean; rain: number }>;
/** A particle. `pal` fades through colours over its life; `grow` makes it swell (steam, smoke); `g` is gravity. */
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; max?: number; pal?: readonly string[]; grow?: boolean; g?: number };

/** Layout (logical pixels). The engine uses these for depth sorting, collisions and hotspots. */
export const CAMP_LAYOUT = {
  board: { x: 22, base: 122, drop: 22 }, tent: { x: 70, base: 122 }, lantern: { x: 100, base: 122 },
  chest: { x: 118, base: 124 }, fire: { x: 152, base: 128 }, bench: { x: 176, base: 131 },
  crates: { x: 176, base: 120 }, shop: { x: 212, base: 122 },
} as const;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string) {
  ctx.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}
function glow(ctx: Ctx, x: number, y: number, rx: number, ry: number, rgb: string, a: number) {
  for (let k = 3; k >= 1; k--) { ctx.fillStyle = `rgba(${rgb},${(a / 3).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x, y, (rx * k) / 3, (ry * k) / 3, 0, 0, Math.PI * 2); ctx.fill(); }
}
function shadow(ctx: Ctx, x: number, y: number, rx: number) { ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x, y, rx, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
const GLYPHS: Record<string, string> = { S: "111100111001111", H: "101101111101101", O: "111101101101111", P: "111101111100100" };
function text(ctx: Ctx, s: string, x: number, y: number, c: string) {
  ctx.fillStyle = c;
  [...s].forEach((ch, n) => { const g = GLYPHS[ch]; if (g) for (let k = 0; k < 15; k++) if (g[k] === "1") ctx.fillRect(x + n * 4 + (k % 3), y + Math.floor(k / 3), 1, 1); });
}

/* ---------- quest board ---------- */
export function drawBoard({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.board.x, base = CAMP_LAYOUT.board.base, drop = CAMP_LAYOUT.board.drop, top = 66 + drop;
  shadow(ctx, cx, base, 18);
  // posts: short enough that the notices hang at the Friend's eye level
  for (const px of [cx - 13, cx + 10]) { rect(ctx, px, top, 4, base - top, INK); rect(ctx, px + 1, top, 2, base - top, "#7a4a26"); rect(ctx, px + 1, top, 1, base - top, "#9a6a3a"); }
  ctx.save(); ctx.translate(0, drop);
  // shingled roof
  for (let y = 0; y < 10; y++) {
    const half = 7 + y * 1.6, row = 56 + y;
    rect(ctx, cx - half - 1, row, Math.round(half * 2) + 2, 1, INK);
    rect(ctx, cx - half, row, Math.round(half * 2), 1, y % 3 === 2 ? "#6e3222" : "#9a4a34");
    if (y % 3 === 1) for (let s = Math.round(cx - half) + (y % 2) * 2; s < cx + half; s += 4) rect(ctx, s, row, 1, 1, "#b85e44");
  }
  rect(ctx, cx - 3, 54, 6, 2, INK); rect(ctx, cx - 2, 54, 4, 1, "#b85e44");
  // cork board in a wooden frame
  rect(ctx, cx - 18, 67, 36, 25, INK); rect(ctx, cx - 17, 68, 34, 23, "#6b4222"); rect(ctx, cx - 16, 69, 32, 21, "#b88a56");
  for (let i = 0; i < 26; i++) rect(ctx, cx - 16 + ((i * 7) % 31), 69 + ((i * 5) % 20), 1, 1, "#a0764a");
  // map with a dotted path and an X
  rect(ctx, cx - 15, 70, 12, 11, INK); rect(ctx, cx - 14, 71, 10, 9, "#f1e3b0");
  rect(ctx, cx - 13, 72, 4, 3, "#7fbf6a"); rect(ctx, cx - 9, 76, 4, 3, "#7fbf6a"); line(ctx, cx - 14, 78, cx - 10, 73, "#6ec6ff");
  for (const [dx, dy] of [[-12, 79], [-11, 78], [-9, 77], [-8, 75], [-7, 74]]) rect(ctx, cx + dx, dy, 1, 1, "#c0392b");
  rect(ctx, cx - 7, 72, 1, 1, "#e04848"); rect(ctx, cx - 5, 72, 1, 1, "#e04848"); rect(ctx, cx - 6, 73, 1, 1, "#e04848"); rect(ctx, cx - 7, 74, 1, 1, "#e04848"); rect(ctx, cx - 5, 74, 1, 1, "#e04848");
  // notice with text lines
  rect(ctx, cx - 1, 71, 9, 11, INK); rect(ctx, cx, 72, 7, 9, "#f7f2e6");
  for (let l = 0; l < 4; l++) rect(ctx, cx + 1, 74 + l * 2, l === 3 ? 3 : 5, 1, "#9a9a9a");
  // wanted poster: a slime
  rect(ctx, cx + 9, 70, 8, 13, INK); rect(ctx, cx + 10, 71, 6, 11, "#efd9a8");
  rect(ctx, cx + 11, 74, 4, 3, "#5ccb5f"); rect(ctx, cx + 12, 73, 2, 1, "#5ccb5f"); rect(ctx, cx + 11, 75, 1, 1, "#fff"); rect(ctx, cx + 14, 75, 1, 1, "#fff");
  rect(ctx, cx + 11, 79, 4, 1, "#8a5a2a"); rect(ctx, cx + 12, 81, 2, 1, "#8a5a2a");
  // pins
  for (const [dx, dy, c] of [[-9, 70, "#ff4d6d"], [3, 71, "#4aa3ff"], [13, 70, "#ffd23f"], [-3, 85, "#b86bff"]] as const) rect(ctx, cx + dx, dy, 1, 1, c);
  rect(ctx, cx - 6, 84, 8, 5, INK); rect(ctx, cx - 5, 85, 6, 3, "#fff3c8");
  ctx.restore();
}

/* ---------- tent (outfitter) ---------- */
export function drawTent({ ctx, clock, still }: CampFrame) {
  const cx = CAMP_LAYOUT.tent.x, base = CAMP_LAYOUT.tent.base, top = 84, H = base - top, W2 = 28;
  shadow(ctx, cx, base, 32);
  // guy ropes and pegs
  line(ctx, cx - 16, 101, cx - 31, base, "#d8c8a8"); line(ctx, cx + 16, 101, cx + 31, base, "#d8c8a8");
  rect(ctx, cx - 33, base - 2, 2, 4, INK); rect(ctx, cx + 31, base - 2, 2, 4, INK);
  // canvas: lit left panel, shaded right panel, seams
  for (let y = 0; y <= H; y++) {
    const half = Math.round((y / H) * W2), row = top + y;
    rect(ctx, cx - half - 1, row, half * 2 + 3, 1, INK);
    rect(ctx, cx - half, row, half, 1, y % 9 === 8 ? "#d48a48" : "#e8a05a");
    rect(ctx, cx, row, half + 1, 1, y % 9 === 8 ? "#a55e2c" : "#b86b34");
    if (half > 3) { rect(ctx, cx - half, row, 1, 1, "#f6c287"); }
  }
  rect(ctx, cx, top + 1, 1, 12, "#8a4a22");
  // patch with stitches on the left panel
  rect(ctx, cx - 20, 108, 7, 6, INK); rect(ctx, cx - 19, 109, 5, 4, "#c9b27a");
  for (let i = 0; i < 3; i++) rect(ctx, cx - 18 + i * 2, 108, 1, 1, "#f1e3b0");
  // doorway with a warm interior, bedroll and a small lantern
  const doorTop = 97, dH = base - doorTop;
  for (let y = 0; y <= dH; y++) {
    const dh = Math.round((y / dH) * 10), row = doorTop + y;
    rect(ctx, cx - dh - 1, row, dh * 2 + 3, 1, INK);
    rect(ctx, cx - dh, row, dh * 2 + 1, 1, y > dH * 0.55 ? "#4a2a18" : "#2a1812");
  }
  const flick = still ? 0 : Math.sin(clock * 6) * 0.04;
  glow(ctx, cx, 112, 9, 8, "255,190,90", 0.35 + flick);
  rect(ctx, cx - 1, 101, 3, 1, INK); rect(ctx, cx - 1, 102, 3, 4, "#ffcf6a"); rect(ctx, cx, 103, 1, 2, "#fff3c8");
  rect(ctx, cx - 7, base - 4, 13, 3, INK); rect(ctx, cx - 6, base - 3, 11, 2, "#3b6fd4"); rect(ctx, cx - 6, base - 3, 11, 1, "#6e9bff");
  rect(ctx, cx + 2, base - 5, 4, 2, "#f1efe6");
  // folded-back door flaps (light lining)
  for (let y = 2; y <= dH; y++) {
    const dh = Math.round((y / dH) * 10), row = doorTop + y, fw = Math.min(3, 1 + Math.floor(y / 6));
    rect(ctx, cx - dh - 1 - fw, row, fw, 1, "#f3d2a0"); rect(ctx, cx + dh + 2, row, fw, 1, "#d9b07a");
  }
  // pennant on a pole
  rect(ctx, cx, top - 9, 1, 9, INK);
  const wave = still ? 0 : Math.round(Math.sin(clock * 4));
  for (let i = 0; i < 6; i++) rect(ctx, cx + 1 + i, top - 9 + Math.floor(i / 2) + (i > 2 ? wave : 0), 1, 4 - Math.floor(i / 2), i % 2 ? "#ffd23f" : "#ff4d6d");
}

/* ---------- lantern post ---------- */
export function drawLanternPost({ ctx, clock, still }: CampFrame) {
  const x = CAMP_LAYOUT.lantern.x, base = CAMP_LAYOUT.lantern.base;
  shadow(ctx, x, base, 4);
  rect(ctx, x - 3, base - 2, 7, 2, INK); rect(ctx, x - 2, base - 2, 5, 1, "#6f7488");
  rect(ctx, x - 1, 92, 3, base - 92, INK); rect(ctx, x, 93, 1, base - 94, "#5a3a22");
  rect(ctx, x - 1, 92, 9, 2, INK); rect(ctx, x + 6, 94, 1, 2, INK);
  const g = still ? 0.28 : 0.26 + Math.sin(clock * 2.2 + 1) * 0.04;
  glow(ctx, x + 6, 100, 20, 16, "255,210,120", g);
  rect(ctx, x + 3, 96, 7, 9, INK); rect(ctx, x + 4, 97, 5, 7, "#ffe08a"); rect(ctx, x + 5, 98, 2, 4, "#fff6d8"); rect(ctx, x + 3, 104, 7, 1, INK); rect(ctx, x + 5, 95, 3, 1, INK);
}

/* ---------- treasure chest on a rug (collection) ---------- */
export function drawRug({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.chest.x;
  rect(ctx, cx - 15, 120, 30, 10, INK); rect(ctx, cx - 14, 121, 28, 8, "#8c2f39");
  rect(ctx, cx - 13, 122, 26, 6, "#a83a46"); rect(ctx, cx - 12, 122, 24, 1, "#d9a441"); rect(ctx, cx - 12, 127, 24, 1, "#d9a441");
  for (let i = -3; i <= 3; i++) rect(ctx, cx + i, 125 - (3 - Math.abs(i)) / 2, 1, 1 + (3 - Math.abs(i)), "#d9a441");
  for (let i = cx - 14; i < cx + 14; i += 2) { rect(ctx, i, 130, 1, 1, "#f1e3b0"); rect(ctx, i, 119, 1, 1, "#f1e3b0"); }
}
export function drawChest({ ctx, clock, still }: CampFrame) {
  const cx = CAMP_LAYOUT.chest.x, x = cx - 9, top = 108;
  shadow(ctx, cx, 124, 10);
  // lid (rounded) and body
  rect(ctx, x + 1, top, 17, 1, INK); rect(ctx, x, top + 1, 19, 6, INK);
  rect(ctx, x + 1, top + 1, 17, 5, "#9a5a2a"); rect(ctx, x + 2, top + 1, 15, 1, "#c07a3a");
  rect(ctx, x, top + 7, 19, 10, INK); rect(ctx, x + 1, top + 7, 17, 9, "#b86b2b"); rect(ctx, x + 1, top + 7, 17, 1, "#7a4418");
  for (let p = x + 4; p < x + 17; p += 4) rect(ctx, p, top + 9, 1, 6, "#9a5a24");
  // iron bands and gold lock
  for (const bx of [x + 3, x + 15]) { rect(ctx, bx, top + 1, 2, 15, "#6f7488"); rect(ctx, bx, top + 1, 1, 15, "#a8adbd"); }
  rect(ctx, cx - 2, top + 5, 5, 5, INK); rect(ctx, cx - 1, top + 6, 3, 3, "#ffd23f"); rect(ctx, cx, top + 7, 1, 1, INK);
  // glint and spilled coins
  if (still || Math.sin(clock * 2.5) > 0.6) { rect(ctx, x + 2, top + 2, 1, 1, "#ffffff"); rect(ctx, x + 1, top + 3, 3, 1, "rgba(255,255,255,.6)"); }
  for (const [dx, dy] of [[11, 124], [13, 125], [-12, 125]]) { rect(ctx, cx + dx - 1, dy - 1, 3, 2, INK); rect(ctx, cx + dx, dy - 1, 1, 1, "#ffd23f"); }
}

/* ---------- campfire with a stone ring and a kettle ---------- */
export function drawFireBack({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.fire.x, base = CAMP_LAYOUT.fire.base;
  for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI, sx = cx + Math.cos(a) * 13, sy = base - 3 + Math.sin(a) * 3; rect(ctx, sx - 2, sy - 1, 5, 3, INK); rect(ctx, sx - 1, sy - 1, 3, 2, "#5a5f72"); rect(ctx, sx - 1, sy - 1, 2, 1, "#8a8fa3"); }
}
export function drawFire(f: CampFrame) {
  const { ctx, clock, still, rain } = f;
  const cx = CAMP_LAYOUT.fire.x, base = CAMP_LAYOUT.fire.base;
  // tripod and kettle
  line(ctx, cx - 12, base + 1, cx, 99, INK); line(ctx, cx + 12, base + 1, cx, 99, INK); line(ctx, cx - 11, base + 1, cx + 1, 99, "#5a3a22");
  rect(ctx, cx, 100, 1, 6, "#8a8fa3");
  rect(ctx, cx - 5, 106, 11, 1, INK); rect(ctx, cx - 6, 107, 13, 7, INK); rect(ctx, cx - 5, 108, 11, 5, "#34343e"); rect(ctx, cx - 5, 107, 11, 1, "#6a6a78"); rect(ctx, cx - 4, 109, 2, 2, "#56566a");
  // logs and embers
  line(ctx, cx - 9, base, cx + 8, base - 4, INK); line(ctx, cx - 9, base - 1, cx + 8, base - 5, "#6b4222");
  line(ctx, cx - 8, base - 4, cx + 9, base, INK); line(ctx, cx - 8, base - 5, cx + 9, base - 1, "#7a4a26");
  rect(ctx, cx - 5, base - 3, 11, 2, "#ff5a2d"); rect(ctx, cx - 3, base - 3, 6, 1, "#ffb347");
  // flames: height shrinks in rain
  const h = Math.round(15 * (1 - rain * 0.55));
  for (let y = 0; y < h; y++) {
    const t = y / h, w = Math.max(1, Math.round(10 * Math.pow(1 - t, 0.75))), sway = still ? 0 : Math.round(Math.sin(clock * 9 + y * 0.8) * 1.3 * t);
    const row = base - 4 - y;
    rect(ctx, cx - Math.floor(w / 2) + sway, row, w, 1, t < 0.3 ? "#ff6a2d" : "#ff8c3a");
    const iw = Math.max(0, Math.round(w * 0.62)); if (iw) rect(ctx, cx - Math.floor(iw / 2) + sway, row, iw, 1, "#ffd23f");
    const cw = t < 0.55 ? Math.max(0, Math.round(w * 0.3)) : 0; if (cw) rect(ctx, cx - Math.floor(cw / 2) + sway, row, cw, 1, "#fff3a8");
  }
}
export function drawFireFront({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.fire.x, base = CAMP_LAYOUT.fire.base;
  for (let i = 1; i < 5; i++) { const a = (i / 5) * Math.PI, sx = cx + Math.cos(a) * 13, sy = base - 2 + Math.sin(a) * 3; rect(ctx, sx - 2, sy - 1, 5, 3, INK); rect(ctx, sx - 1, sy - 1, 3, 2, "#6f7488"); rect(ctx, sx - 1, sy - 1, 2, 1, "#a8adbd"); }
}
export function fireGlow({ ctx, clock, still }: CampFrame) {
  const a = 0.22 + (still ? 0 : Math.sin(clock * 7) * 0.03);
  glow(ctx, CAMP_LAYOUT.fire.x, CAMP_LAYOUT.fire.base - 4, 60, 30, "255,160,60", a);
}

/* ---------- bench, barrel and crates ---------- */
export function drawBench({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.bench.x, base = CAMP_LAYOUT.bench.base;
  shadow(ctx, cx, base, 10);
  rect(ctx, cx - 9, base - 7, 19, 6, INK); rect(ctx, cx - 8, base - 6, 17, 4, "#7a4a26"); rect(ctx, cx - 8, base - 6, 17, 1, "#9a6a3a");
  rect(ctx, cx - 6, base - 4, 5, 1, "#5a3218"); rect(ctx, cx + 2, base - 3, 5, 1, "#5a3218");
  rect(ctx, cx - 10, base - 6, 3, 4, INK); rect(ctx, cx - 9, base - 5, 1, 2, "#e0b07a");
  rect(ctx, cx - 7, base - 1, 2, 2, INK); rect(ctx, cx + 6, base - 1, 2, 2, INK);
}
export function drawCrates({ ctx }: CampFrame) {
  const cx = CAMP_LAYOUT.crates.x, base = CAMP_LAYOUT.crates.base;
  shadow(ctx, cx, base, 11);
  // barrel
  const bx = cx - 10;
  rect(ctx, bx + 1, base - 13, 7, 1, INK); rect(ctx, bx, base - 12, 9, 12, INK); rect(ctx, bx + 1, base - 12, 7, 11, "#8b5a2b");
  rect(ctx, bx + 2, base - 12, 1, 11, "#a8743c"); rect(ctx, bx + 5, base - 12, 1, 11, "#6b4222");
  rect(ctx, bx + 1, base - 10, 7, 1, "#6f7488"); rect(ctx, bx + 1, base - 4, 7, 1, "#6f7488"); rect(ctx, bx + 2, base - 13, 5, 1, "#b88a56");
  // crate with a cross brace, and a small one on top
  const kx = cx - 1;
  rect(ctx, kx, base - 10, 11, 10, INK); rect(ctx, kx + 1, base - 9, 9, 8, "#b07a44");
  line(ctx, kx + 1, base - 9, kx + 9, base - 2, "#7a4a26"); rect(ctx, kx + 1, base - 9, 9, 1, "#c89a62");
  rect(ctx, kx + 2, base - 16, 7, 6, INK); rect(ctx, kx + 3, base - 15, 5, 4, "#c89a62"); rect(ctx, kx + 3, base - 13, 5, 1, "#8b5a2b");
  rect(ctx, kx + 4, base - 16, 1, 1, "#e04848"); rect(ctx, kx + 6, base - 16, 1, 1, "#e04848");
}

/* ---------- shop (merchant) ---------- */
export function drawShop({ ctx, clock, still }: CampFrame) {
  const cx = CAMP_LAYOUT.shop.x, base = CAMP_LAYOUT.shop.base, x0 = cx - 26, x1 = cx + 26;
  shadow(ctx, cx, base, 28);
  // back wall with shelves
  rect(ctx, x0 + 3, 78, 47, 27, INK); rect(ctx, x0 + 4, 79, 45, 25, "#4a2e1c");
  for (let p = x0 + 9; p < x1 - 2; p += 6) rect(ctx, p, 79, 1, 25, "#3e2616");
  for (const sy of [88, 96]) { rect(ctx, x0 + 4, sy, 45, 2, "#7a4a26"); rect(ctx, x0 + 4, sy + 2, 45, 1, INK); }
  const jars: [number, number, string][] = [[6, 83, "#ff5ad1"], [10, 84, "#4aa3ff"], [14, 83, "#3ddc84"], [36, 83, "#ffd23f"], [40, 84, "#b86bff"], [44, 83, "#ff8a2f"], [6, 91, "#c07a48"], [11, 91, "#e8e0d0"], [38, 91, "#7fcf4f"], [43, 91, "#6ec6ff"]];
  for (const [dx, y, c] of jars) { rect(ctx, x0 + dx, y, 4, 5, INK); rect(ctx, x0 + dx + 1, y + 1, 2, 3, c); rect(ctx, x0 + dx + 1, y, 2, 1, "#d8c8a8"); }
  // merchant: hooded cloak with glowing eyes
  rect(ctx, cx - 6, 85, 13, 20, INK);
  for (let y = 0; y < 18; y++) { const half = y < 7 ? 4 + Math.round(y * 0.3) : 5 + Math.round((y - 7) * 0.2); rect(ctx, cx - half, 86 + y, half * 2 + 1, 1, "#4b3f7a"); rect(ctx, cx - half, 86 + y, 2, 1, "#6a5aa0"); rect(ctx, cx + half - 1, 86 + y, 2, 1, "#352b5c"); }
  rect(ctx, cx - 3, 89, 7, 5, "#140f24");
  const blink = !still && Math.sin(clock * 1.3) < -0.93;
  if (!blink) { rect(ctx, cx - 2, 91, 1, 1, "#ffd23f"); rect(ctx, cx + 2, 91, 1, 1, "#ffd23f"); }
  rect(ctx, cx - 7, 101, 3, 2, "#d9a066"); rect(ctx, cx + 5, 101, 3, 2, "#d9a066");
  // posts
  for (const px of [x0 + 1, x1 - 3]) { rect(ctx, px, 74, 3, base - 74, INK); rect(ctx, px + 1, 74, 1, base - 74, "#8b5a2b"); }
  // counter
  rect(ctx, x0, 103, x1 - x0 + 1, base - 103, INK); rect(ctx, x0 + 1, 104, x1 - x0 - 1, base - 105, "#8b5a2b");
  for (let p = x0 + 7; p < x1; p += 7) rect(ctx, p, 106, 1, base - 107, "#6b4222");
  rect(ctx, x0 - 1, 102, x1 - x0 + 3, 3, INK); rect(ctx, x0, 102, x1 - x0 + 1, 2, "#b07a44"); rect(ctx, x0, 102, x1 - x0 + 1, 1, "#c89a62");
  rect(ctx, cx - 3, 109, 7, 7, INK); rect(ctx, cx - 2, 110, 5, 5, "#ffd23f"); rect(ctx, cx, 111, 1, 3, "#b87a10");
  // goods: apple crate, coin pile, potions
  rect(ctx, x0 + 3, 96, 10, 6, INK); rect(ctx, x0 + 4, 98, 8, 3, "#b07a44");
  for (const ax of [5, 7, 9, 11]) { rect(ctx, x0 + ax, 96, 2, 2, "#e04848"); rect(ctx, x0 + ax, 96, 1, 1, "#ff8a8a"); }
  rect(ctx, cx + 8, 99, 7, 3, INK); rect(ctx, cx + 9, 99, 5, 2, "#ffd23f"); rect(ctx, cx + 10, 98, 3, 1, "#ffd23f"); rect(ctx, cx + 11, 98, 1, 1, "#fff3a8");
  for (const [dx, c] of [[18, "#ff5ad1"], [22, "#4aa3ff"]] as const) { rect(ctx, cx + dx, 95, 3, 1, INK); rect(ctx, cx + dx - 1, 96, 5, 6, INK); rect(ctx, cx + dx, 97, 3, 4, c); rect(ctx, cx + dx, 97, 1, 1, "#ffffff"); }
  // striped awning with a scalloped edge
  for (let y = 0; y < 9; y++) {
    rect(ctx, x0 - 3, 68 + y, x1 - x0 + 7, 1, INK);
    for (let s = x0 - 2; s < x1 + 3; s++) { const stripe = Math.floor((s - x0 + 2) / 6) % 2; rect(ctx, s, 68 + y, 1, 1, stripe ? (y < 2 ? "#d8d4c8" : "#f1efe6") : (y < 2 ? "#b03535" : "#d64545")); }
  }
  for (let s = x0 - 2; s < x1 + 3; s += 6) { const stripe = Math.floor((s - x0 + 2) / 6) % 2, c = stripe ? "#f1efe6" : "#d64545"; rect(ctx, s, 77, 6, 1, INK); rect(ctx, s + 1, 77, 4, 1, c); rect(ctx, s + 1, 78, 4, 1, INK); rect(ctx, s + 2, 78, 2, 1, c); rect(ctx, s + 2, 79, 2, 1, INK); }
  rect(ctx, x0 + 4, 80, 45, 2, "rgba(0,0,0,.35)");
  // hanging sign
  line(ctx, cx - 9, 60, cx - 9, 68, "#6f7488"); line(ctx, cx + 9, 60, cx + 9, 68, "#6f7488");
  rect(ctx, cx - 13, 58, 27, 9, INK); rect(ctx, cx - 12, 59, 25, 7, "#b07a44"); rect(ctx, cx - 12, 59, 25, 1, "#c89a62");
  rect(ctx, cx - 11, 60, 5, 5, "#ffd23f"); rect(ctx, cx - 10, 61, 3, 3, "#ffe98a"); rect(ctx, cx - 9, 61, 1, 3, "#b87a10");
  text(ctx, "SHOP", cx - 4, 60, "#2a1810");
  // hanging lantern on the left
  rect(ctx, x0 - 2, 79, 1, 4, "#6f7488");
  const g = still ? 0.3 : 0.28 + Math.sin(clock * 3) * 0.04;
  glow(ctx, x0 - 2, 87, 16, 13, "255,200,100", g);
  rect(ctx, x0 - 5, 83, 7, 9, INK); rect(ctx, x0 - 4, 84, 5, 7, "#ffcf6a"); rect(ctx, x0 - 3, 85, 2, 4, "#fff3c8");
}

/* ---------- string of fairy lights from the tent to the shop ---------- */
export function drawFairyLights({ ctx, clock, still }: CampFrame) {
  const colors = ["#ffd23f", "#ff7eb6", "#7fe0ff", "#b6f59a"], xA = CAMP_LAYOUT.tent.x + 1, yA = 76, xB = CAMP_LAYOUT.shop.x - 25, yB = 74;
  let prev = 0;
  for (let x = xA; x <= xB; x++) {
    const t = (x - xA) / (xB - xA), y = Math.round(yA + (yB - yA) * t + Math.sin(t * Math.PI) * 12);
    ctx.fillStyle = "#1a1a24"; ctx.fillRect(x, y, 1, 1); if (prev && Math.abs(prev - y) > 1) ctx.fillRect(x, Math.min(prev, y), 1, Math.abs(prev - y)); prev = y;
    if ((x - xA) % 9 === 5) {
      const i = Math.floor((x - xA) / 9), on = still || Math.sin(clock * 2 + i * 1.7) > -0.5;
      if (on) { ctx.fillStyle = "rgba(255,240,200,.16)"; ctx.fillRect(x - 3, y - 1, 7, 7); }
      rect(ctx, x - 1, y + 1, 3, 3, INK); rect(ctx, x, y + 2, 1, 1, on ? colors[i % 4] : "#3a3a4a"); if (on) rect(ctx, x - 1, y + 1, 2, 2, colors[i % 4]);
    }
  }
}

const EMBER = ["#fff3a8", "#ffd23f", "#ff9a3c", "#e0582d", "#8a3020"] as const;
const STEAM = ["rgba(235,235,245,.42)", "rgba(235,235,245,.3)", "rgba(235,235,245,.18)", "rgba(235,235,245,.08)"] as const;
const SMOKE = ["rgba(150,150,170,.5)", "rgba(150,150,170,.35)", "rgba(150,150,170,.2)", "rgba(150,150,170,.08)"] as const;
/** Time-based emitter for the campfire: a few short-lived embers, soft steam from the kettle, smoke in the rain. */
export function emitFire(particles: Particle[], dt: number, rain: number) {
  const cx = CAMP_LAYOUT.fire.x, base = CAMP_LAYOUT.fire.base, top = base - 6 - Math.round(15 * (1 - rain * 0.55));
  if (Math.random() < dt * 6 * (1 - rain * 0.8)) { const life = 0.45 + Math.random() * 0.45; particles.push({ x: cx - 3 + Math.random() * 7, y: top + 4, vx: (Math.random() - 0.5) * 16, vy: -22 - Math.random() * 14, life, max: life, color: EMBER[0], pal: EMBER, g: 18 }); }
  if (rain < 0.5 && Math.random() < dt * 1.6) { const life = 1.4 + Math.random() * 0.6; particles.push({ x: cx + 5, y: 106, vx: 3 + Math.random() * 3, vy: -7 - Math.random() * 3, life, max: life, color: STEAM[0], pal: STEAM, grow: true }); }
  if (rain > 0.4 && Math.random() < dt * 4 * rain) { const life = 1.6 + Math.random() * 0.6; particles.push({ x: cx - 2 + Math.random() * 5, y: top + 2, vx: -3 - Math.random() * 4, vy: -9 - Math.random() * 4, life, max: life, color: SMOKE[0], pal: SMOKE, grow: true }); }
}
/** Draw one particle (colour fades through its palette; `grow` swells it). */
export function drawParticle(ctx: Ctx, p: Particle) {
  const age = p.max ? 1 - p.life / p.max : 0;
  const color = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(age * p.pal.length))] : p.color;
  const s = p.grow ? 1 + Math.floor(age * 3) : 1;
  ctx.fillStyle = color; ctx.fillRect(Math.round(p.x) - (s >> 1), Math.round(p.y) - (s >> 1), s, s);
}
