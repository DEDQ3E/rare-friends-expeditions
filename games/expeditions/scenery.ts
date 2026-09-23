/** Forest scenery for Rare Friends: Expeditions: tree species, bushes and ground decoration.
 * Everything is drawn in code at 1 canvas pixel = 1 art pixel. */

import { INK } from "./art.js";
import type { ForestPalette } from "./weather.js";

type Ctx = CanvasRenderingContext2D;

/** Deterministic 0..1 hash for scenery placement (stable while scrolling). */
export function hash(n: number) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function disc(ctx: Ctx, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y + r * 0.4)); ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1); }
}

/** Round, layered oak crown on a thick trunk. `base` is the ground line. */
export function drawOak(ctx: Ctx, x: number, base: number, size: number, P: ForestPalette, seed: number) {
  const r = 7 + size * 2, cy = base - 18 - size * 5, trunkTop = cy + r - 2;
  ctx.fillStyle = INK; ctx.fillRect(x - 3, trunkTop, 7, base - trunkTop); ctx.fillRect(x - 5, base - 2, 11, 2);
  ctx.fillStyle = P.trunk; ctx.fillRect(x - 2, trunkTop, 5, base - trunkTop); ctx.fillRect(x - 4, base - 2, 9, 1);
  ctx.fillStyle = INK; ctx.fillRect(x + 1, trunkTop + 4, 1, 3); ctx.fillRect(x - 1, trunkTop + 10, 1, 2);
  const blobs: [number, number, number][] = [[-r * 0.55, 2, r * 0.7], [r * 0.55, 3, r * 0.68], [0, -r * 0.35, r * 0.8], [0, 3, r * 0.75]];
  ctx.fillStyle = INK; for (const [dx, dy, rr] of blobs) disc(ctx, x + dx, cy + dy, rr + 1);
  ctx.fillStyle = P.canopyLo; for (const [dx, dy, rr] of blobs) disc(ctx, x + dx, cy + dy, rr);
  ctx.fillStyle = P.canopy; for (const [dx, dy, rr] of blobs) disc(ctx, x + dx - 1, cy + dy - 1, rr - 1.5);
  ctx.fillStyle = P.canopyHi; disc(ctx, x - r * 0.35, cy - r * 0.45, r * 0.3); disc(ctx, x + r * 0.4, cy - r * 0.05, r * 0.18);
  for (let i = 0; i < 6; i++) { const a = hash(seed + i) * 6.28, d = hash(seed + i + 9) * r * 0.8; ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 1, 1); }
  if (hash(seed + 3) > 0.7) { ctx.fillStyle = "#e04848"; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - r * 0.6 + hash(seed + i * 5) * r * 1.2), Math.round(cy - r * 0.2 + hash(seed + i * 7) * r * 0.9), 1, 1); }
}

/** Layered pine: pointed top, overlapping tiers with a lit left side and shaded skirts. */
export function drawPine(ctx: Ctx, x: number, base: number, size: number, P: ForestPalette) {
  const tiers = 3 + (size > 1 ? 1 : 0), h = 32 + size * 9, top = base - h, trunkH = 7;
  ctx.fillStyle = INK; ctx.fillRect(x - 2, base - trunkH, 5, trunkH); ctx.fillStyle = P.trunk; ctx.fillRect(x - 1, base - trunkH, 3, trunkH);
  const body = h - trunkH + 2;
  for (let t = 0; t < tiers; t++) {
    const ty = top + (t * body) / (tiers + 0.6), th = body / (tiers + 0.6) + 6 + t, w0 = t === 0 ? 0 : 2 + t, w1 = 7 + t * 3 + size * 1.5;
    for (let y = 0; y < th; y++) {
      const half = Math.round(w0 + (w1 - w0) * (y / th)), yy = Math.round(ty + y);
      ctx.fillStyle = INK; ctx.fillRect(x - half - 1, yy, half * 2 + 3, 1);
      ctx.fillStyle = y >= th - 2 ? P.canopyLo : P.canopy; ctx.fillRect(x - half, yy, half * 2 + 1, 1);
      if (y < th - 2) { ctx.fillStyle = P.canopyHi; ctx.fillRect(x - half, yy, Math.max(1, Math.round(half * 0.4)), 1); }
    }
    ctx.fillStyle = INK; ctx.fillRect(x - Math.round(w1) - 1, Math.round(ty + th), Math.round(w1) * 2 + 3, 1);
  }
  ctx.fillStyle = INK; ctx.fillRect(x, top - 1, 1, 1);
}

/** White-barked birch with a light, airy crown. */
export function drawBirch(ctx: Ctx, x: number, base: number, size: number, P: ForestPalette, seed: number) {
  const top = base - 34 - size * 6;
  ctx.fillStyle = INK; ctx.fillRect(x - 2, top + 8, 4, base - top - 8);
  ctx.fillStyle = P.birch; ctx.fillRect(x - 1, top + 8, 2, base - top - 8);
  ctx.fillStyle = INK; for (let y = top + 12; y < base - 2; y += 5 + Math.floor(hash(seed + y) * 4)) ctx.fillRect(x - 1 + (y % 2), y, 1, 1);
  const blobs: [number, number, number][] = [[-4, 6, 5], [4, 4, 5], [0, 0, 6], [-2, 11, 4], [3, 12, 4]];
  ctx.fillStyle = INK; for (const [dx, dy, r] of blobs) disc(ctx, x + dx, top + dy, r + 1);
  ctx.fillStyle = P.canopy; for (const [dx, dy, r] of blobs) disc(ctx, x + dx, top + dy, r);
  ctx.fillStyle = P.canopyHi; for (const [dx, dy, r] of blobs) disc(ctx, x + dx - 1, top + dy - 1, r - 2.5);
}

/** A leafy bush, sometimes with berries or flowers. */
export function drawBush(ctx: Ctx, x: number, base: number, w: number, P: ForestPalette, seed: number) {
  const r = Math.max(3, Math.round(w / 3));
  const blobs: [number, number][] = [[-r, 0], [r, 0], [0, -r * 0.6]];
  ctx.fillStyle = INK; for (const [dx, dy] of blobs) disc(ctx, x + dx, base - r + dy, r + 1);
  ctx.fillStyle = P.canopyLo; for (const [dx, dy] of blobs) disc(ctx, x + dx, base - r + dy, r);
  ctx.fillStyle = P.canopy; for (const [dx, dy] of blobs) disc(ctx, x + dx - 1, base - r + dy - 1, r - 1);
  ctx.fillStyle = P.canopyHi; ctx.fillRect(x - r, base - r * 2, 2, 1); ctx.fillRect(x - 1, base - r * 2 - 1, 2, 1);
  const kind = hash(seed);
  if (kind > 0.55) { ctx.fillStyle = kind > 0.8 ? "#e04848" : P.flowers[Math.floor(hash(seed + 1) * P.flowers.length)]; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - r + hash(seed + i * 3) * r * 2), Math.round(base - r * 1.6 + hash(seed + i * 5) * r), 1, 1); }
}

/** Distant tree line (flat silhouettes). */
export function drawFarTrees(ctx: Ctx, scroll: number, P: ForestPalette, width: number, baseY: number) {
  ctx.fillStyle = P.far;
  for (let x = 0; x < width; x++) {
    const wx = x + scroll, cell = Math.floor(wx / 7), local = wx - cell * 7, peak = 10 + Math.floor(hash(cell) * 10);
    const h = Math.max(4, peak - Math.abs(local - 3) * (hash(cell + 50) > 0.5 ? 3 : 2));
    ctx.fillRect(x, baseY - h, 1, h + 6);
  }
}

/** Small ground decorations along the grass line: tufts, flowers, mushrooms, pebbles. */
export function drawGroundDecor(ctx: Ctx, dist: number, P: ForestPalette, width: number, groundY: number) {
  const step = 11, first = Math.floor(dist / step) - 1;
  for (let c = first; c < first + width / step + 3; c++) {
    const x = Math.round(c * step - dist + hash(c) * 6), k = hash(c + 17);
    if (k < 0.35) { ctx.fillStyle = P.grassDark; ctx.fillRect(x, groundY - 2, 1, 2); ctx.fillRect(x + 2, groundY - 3, 1, 3); ctx.fillRect(x + 4, groundY - 2, 1, 2); }
    else if (k < 0.55) { ctx.fillStyle = P.grassDark; ctx.fillRect(x + 1, groundY - 3, 1, 3); ctx.fillStyle = P.flowers[c % P.flowers.length]; ctx.fillRect(x, groundY - 4, 3, 1); ctx.fillRect(x + 1, groundY - 5, 1, 3); ctx.fillStyle = "#ffd23f"; ctx.fillRect(x + 1, groundY - 4, 1, 1); }
    else if (k < 0.63) { ctx.fillStyle = INK; ctx.fillRect(x, groundY - 4, 5, 2); ctx.fillStyle = "#c07a48"; ctx.fillRect(x + 1, groundY - 4, 3, 1); ctx.fillStyle = "#f2e2c0"; ctx.fillRect(x + 2, groundY - 2, 1, 2); }
    else if (k < 0.72) { ctx.fillStyle = INK; ctx.fillRect(x, groundY - 2, 4, 2); ctx.fillStyle = P.pebble; ctx.fillRect(x + 1, groundY - 2, 2, 1); }
  }
}

/** Low fern clump for the undergrowth. */
export function drawFern(ctx: Ctx, x: number, base: number, P: ForestPalette, seed: number) {
  const n = 3 + Math.floor(hash(seed) * 3);
  for (let i = 0; i < n; i++) {
    const dx = i * 2 - n, len = 3 + Math.floor(hash(seed + i) * 4), dir = i < n / 2 ? -1 : 1;
    ctx.fillStyle = i % 2 ? P.grassDark : P.canopyLo;
    for (let s = 0; s < len; s++) ctx.fillRect(x + dx + Math.round(dir * s * 0.6), base - 1 - s, 1, 1);
  }
}

/** Atmospheric haze over distant layers (makes depth read more naturally). */
export function haze(ctx: Ctx, color: string, alpha: number, top: number, bottom: number, width: number) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, top, width, bottom - top); ctx.globalAlpha = 1;
}
