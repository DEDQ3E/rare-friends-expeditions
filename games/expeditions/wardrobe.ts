/** Wardrobe: cosmetic clothes worn over the selected Friend's canonical sprite (FriendSDK v0.1.2 allows costumes).
 *
 * Every piece is fitted to the Friend's own silhouette, frame by frame (`fit.ts`): hats sit on the real head and
 * match its width, scarves wrap the real neck, sweaters and vests follow the Friend's own torso pixels, capes follow
 * its back and flutter while it moves, boots cover its own feet. The Friend's outline, halo and shape are never
 * changed, and everything can be taken off to show its original artwork. Clothes are cosmetic only: they never change
 * odds, prices, finds or XP. */
import { fitFrame, type Fit } from "./fit.js";

export type Facing = "right" | "left" | "down" | "up";
export type Slot = "head" | "neck" | "body" | "back" | "feet";
export type Outfit = Readonly<Partial<Record<Slot, string>>>;
export type WearItem = Readonly<{ id: string; slot: Slot; name: string; price: number; blurb: string; season?: boolean }>;

/** Outfitter catalog (RF prices; 50% burned, 50% to Friend rewards, simulated). */
export const WARDROBE: readonly WearItem[] = [
  { id: "explorer", slot: "head", name: "Explorer Hat", price: 3, blurb: "A felt hat with a red band" },
  { id: "wizard", slot: "head", name: "Wizard Hat", price: 5, blurb: "Starry, pointy and a little bent" },
  { id: "miner", slot: "head", name: "Miner Helmet", price: 4, blurb: "A lamp that lights the way" },
  { id: "flowers", slot: "head", name: "Flower Crown", price: 3, blurb: "Fresh from the meadow" },
  { id: "beanie", slot: "head", name: "Bobble Beanie", price: 3, blurb: "Ribbed, warm, with a bobble" },
  { id: "pumpkin", slot: "head", name: "Pumpkin Hat", price: 5, blurb: "Harvest Season only", season: true },
  { id: "scarf", slot: "neck", name: "Knit Scarf", price: 2, blurb: "Striped, with a tail in the wind" },
  { id: "sweater", slot: "body", name: "Cozy Sweater", price: 3, blurb: "Knitted stripes, ribbed hem" },
  { id: "vest", slot: "body", name: "Ranger Vest", price: 3, blurb: "Pocket and a gold badge" },
  { id: "cape", slot: "back", name: "Red Cape", price: 4, blurb: "Follows your back and flutters" },
  { id: "rainboots", slot: "feet", name: "Rain Boots", price: 2, blurb: "Bright boots for puddles" },
];
export const SLOT_LABEL: Readonly<Record<Slot, string>> = { head: "Hats", neck: "Scarves", body: "Tops", back: "Capes", feet: "Boots" };
export const SLOTS: readonly Slot[] = ["head", "neck", "body", "back", "feet"];

const INK = "#1c1c1c";

/** How many pixels a hat rises above the head, so speech bubbles can sit above it. */
export function hatHeight(outfit: Outfit | undefined): number {
  switch (outfit?.head) { case "wizard": return 8; case "beanie": return 5; case "explorer": return 4; case "pumpkin": return 4; case "miner": return 3; case "flowers": return 2; default: return 0; }
}

type Pixels = Map<string, string>;
const key = (i: number, j: number) => `${i},${j}`;

/** Paint pixels (sprite coordinates) with a one-pixel ink outline that never covers the Friend itself. With
 * `around`, the piece also skips every pixel of the Friend, so ears, horns and antennae poke through a hat. */
function paint(ctx: CanvasRenderingContext2D, x: number, y: number, f: Fit, pix: Pixels, outline = true, around?: readonly string[]) {
  const friend = (i: number, j: number) => (around ? around[j]?.[i] === "#" : !!f.mask[j]?.[i]);
  if (around) for (const k of [...pix.keys()]) { const [i, j] = k.split(",").map(Number); if (friend(i, j)) pix.delete(k); }
  if (outline) {
    ctx.fillStyle = INK;
    const done = new Set<string>();
    for (const k of pix.keys()) {
      const [i, j] = k.split(",").map(Number);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, kk = key(a, b);
        if (pix.has(kk) || done.has(kk) || friend(a, b)) continue;
        done.add(kk); ctx.fillRect(x + a, y + b, 1, 1);
      }
    }
  }
  for (const [k, c] of pix) { const [i, j] = k.split(",").map(Number); ctx.fillStyle = c; ctx.fillRect(x + i, y + j, 1, 1); }
}

const set = (pix: Pixels, i: number, j: number, c: string) => pix.set(key(i, j), c);
const row = (pix: Pixels, l: number, r: number, j: number, c: string | ((i: number) => string)) => { for (let i = l; i <= r; i++) set(pix, i, j, typeof c === "string" ? c : c(i)); };

function hat(id: string, f: Fit, facing: Facing, clock: number): Pixels {
  const pix: Pixels = new Map(), hy = f.headRow, l = f.headL, r = f.headR, w = r - l + 1, mid = Math.round((l + r) / 2);
  const front = facing === "right" ? r : facing === "left" ? l : mid;
  switch (id) {
    case "explorer": {
      row(pix, l - 1, r + 1, hy - 1, "#6b4a2b");
      const cl = w >= 5 ? l + 1 : l, cr = w >= 5 ? r - 1 : r;
      row(pix, cl, cr, hy - 2, "#d83a3a");
      row(pix, cl, cr, hy - 3, "#9b6a3c"); row(pix, cl + 1, cr - 1, hy - 4, "#9b6a3c");
      set(pix, cl + 1, hy - 3, "#b88452");
      break;
    }
    case "wizard": {
      row(pix, l - 1, r + 1, hy - 1, "#5a2f8f");
      const h = 7;
      for (let k = 0; k < h; k++) {
        const half = Math.max(0, Math.round(((w + 1) / 2) * (1 - k / h))), bend = k >= h - 2 ? 1 : 0;
        row(pix, mid - half + bend, mid + half - (w % 2 === 0 ? 1 : 0) + bend, hy - 2 - k, "#7a4fc0");
      }
      set(pix, mid - 1, hy - 3, "#ffd23f"); set(pix, mid + 1, hy - 5, "#ffd23f"); set(pix, mid + 1, hy - 8, "#ffd23f");
      break;
    }
    case "miner": {
      row(pix, l - 1, r + 1, hy - 1, "#e0a820");
      row(pix, l, r, hy - 2, "#ffd23f"); row(pix, l + 1, r - 1, hy - 3, "#ffd23f");
      set(pix, l + 1, hy - 2, "#fff3a8");
      if (facing !== "up") { set(pix, front, hy - 2, "#fff3a8"); set(pix, front, hy - 3, "#ffffff"); }
      break;
    }
    case "flowers": {
      const petals = ["#ff9ec4", "#fff3a8", "#ffffff"];
      row(pix, l, r, hy - 1, i => ((i - l) % 2 === 0 ? petals[((i - l) / 2) % 3] : "#5fb866"));
      for (let i = l; i <= r; i += 2) set(pix, i, hy - 2, (i - l) % 4 === 0 ? "#ff6fae" : "#ffd23f");
      break;
    }
    case "beanie": {
      row(pix, l, r, hy - 1, i => ((i - l) % 2 === 0 ? "#2a9384" : "#7fd8c8"));
      row(pix, l, r, hy - 2, "#3fb8a8"); row(pix, l + 1, r - 1, hy - 3, "#3fb8a8");
      const bob = Math.round(Math.sin(clock * 6) * 0.4);
      set(pix, mid, hy - 4 + bob, "#f1efe6"); set(pix, mid + 1, hy - 4 + bob, "#f1efe6"); set(pix, mid, hy - 5 + bob, "#ffffff");
      break;
    }
    case "pumpkin": {
      row(pix, l - 1, r + 1, hy - 1, i => ((i - l) % 3 === 1 ? "#c85a10" : "#f07a1a"));
      row(pix, l - 1, r + 1, hy - 2, i => ((i - l) % 3 === 1 ? "#c85a10" : "#ff9a3c"));
      row(pix, l, r, hy - 3, "#f07a1a");
      set(pix, mid, hy - 4, "#3e9b5a"); set(pix, mid + 1, hy - 4, "#5fb866");
      break;
    }
  }
  return pix;
}

/** Torso rows: the fitted body, or the lower middle of a Friend with no clear torso (blobs, heads). */
function torso(f: Fit): [number, number] {
  if (f.bodyBottom >= f.bodyTop) return [f.bodyTop, f.bodyBottom];
  const t = Math.min(f.bottom - 1, f.headRow + Math.ceil((f.bottom - f.headRow) / 2));
  return [t, Math.max(t, f.bottom - 1)];
}

function top(id: string, f: Fit, facing: Facing): Pixels {
  const pix: Pixels = new Map(), [t, b] = torso(f);
  for (let j = t; j <= b; j++) {
    const cells: number[] = []; for (let i = 0; i < 16; i++) if (f.mask[j]?.[i]) cells.push(i);
    cells.forEach((i, n) => {
      if (id === "sweater") set(pix, i, j, j === b && b > t ? "#2a4fa8" : (j - t) % 2 === 0 ? "#3a6fd8" : "#f1efe6");
      else if (id === "vest" && (cells.length < 5 || n < 2 || n >= cells.length - 2)) set(pix, i, j, n === 0 || n === cells.length - 1 ? "#3f6230" : "#4f7a3a");
    });
    if (id === "vest" && j === t + 1 && cells.length && facing !== "up") set(pix, facing === "left" ? cells[1] ?? cells[0] : cells[Math.max(0, cells.length - 2)], j, "#ffd23f");
  }
  return pix;
}

function scarf(f: Fit, facing: Facing, clock: number, moving: boolean): Pixels {
  const pix: Pixels = new Map(), j = f.neckRow;
  const cells: number[] = []; for (let i = 0; i < 16; i++) if (f.mask[j]?.[i]) cells.push(i);
  if (!cells.length) return pix;
  cells.forEach((i, n) => set(pix, i, j, n % 3 === 1 ? "#f1efe6" : "#d83a3a"));
  // the tail hangs from the back of the neck and swings while moving
  const back = facing === "left" ? cells[cells.length - 1] + 1 : facing === "right" ? cells[0] - 1 : cells[cells.length - 1] + 1;
  const dir = facing === "left" ? 1 : -1, swing = moving && Math.sin(clock * 10) > 0 ? dir : 0;
  if (facing !== "up") { set(pix, back, j, "#d83a3a"); set(pix, back + swing, j + 1, "#f1efe6"); set(pix, back + swing + (moving ? dir : 0), j + 2, "#d83a3a"); }
  return pix;
}

function cape(f: Fit, facing: Facing, clock: number, moving: boolean): Pixels {
  const pix: Pixels = new Map(), [, b] = torso(f), from = f.neckRow, to = Math.min(f.bottom, b + 1);
  for (let j = from; j <= to; j++) {
    const s = f.spans[j]; if (!s) continue;
    const k = j - from, flutter = moving ? (Math.sin(clock * 12 - k) > 0 ? 1 : 0) : 0, reach = 1 + (k >= 2 ? 1 : 0) + flutter;
    if (facing === "up") { for (let i = s.l; i <= s.r; i++) if (f.mask[j][i]) set(pix, i, j, k === 0 ? "#8a1f2a" : "#d83a3a"); continue; }
    const sides = facing === "right" ? [-1] : facing === "left" ? [1] : [-1, 1];
    for (const d of sides) {
      const edge = d < 0 ? s.l : s.r;
      for (let n = 1; n <= (facing === "down" ? 1 : reach); n++) set(pix, edge + d * n, j, n === reach || j === to ? "#8a1f2a" : "#d83a3a");
    }
  }
  if (facing === "down" || facing === "right" || facing === "left") { const s = f.spans[from]; if (s) set(pix, facing === "left" ? s.l : facing === "right" ? s.r : Math.round((s.l + s.r) / 2), from, "#ffd23f"); }
  return pix;
}

function boots(f: Fit): Pixels {
  const pix: Pixels = new Map(), from = Math.max(f.legsRow <= f.bottom ? f.legsRow : f.bottom, f.bottom - 1);
  for (let j = from; j <= f.bottom; j++) for (let i = 0; i < 16; i++) if (f.mask[j]?.[i]) set(pix, i, j, j === f.bottom ? "#b8861c" : "#f2c230");
  return pix;
}

/** Draw the outfit over a Friend frame drawn at (x, y). Call after the Friend itself. */
export function drawOutfit(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, outfit: Outfit | undefined, facing: Facing, clock = 0, moving = false) {
  if (!outfit) return;
  const f = fitFrame(rows);
  if (outfit.back === "cape") paint(ctx, x, y, f, cape(f, facing, clock, moving), facing !== "up");
  if (outfit.body) paint(ctx, x, y, f, top(outfit.body, f, facing), false);
  if (outfit.feet === "rainboots") paint(ctx, x, y, f, boots(f), false);
  if (outfit.neck === "scarf") paint(ctx, x, y, f, scarf(f, facing, clock, moving), false);
  if (outfit.head) paint(ctx, x, y, f, hat(outfit.head, f, facing, clock), true, rows);
}
