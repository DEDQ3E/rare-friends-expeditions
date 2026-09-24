/** Pixel art for Rare Friends: Expeditions. All artwork is authored in code (no external assets). */
import { drawOutfit, type Facing, type Outfit } from "./wardrobe.js";


export const INK = "#1c1c1c";

export type Pixmap = Readonly<{ rows: readonly string[]; palette: Readonly<Record<string, string>> }>;

export type Rarity = "junk" | "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export const RARITIES: readonly Rarity[] = ["junk", "common", "uncommon", "rare", "epic", "legendary", "mythic"];
export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  junk: "Junk", common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary", mythic: "Mythic",
};
export const RARITY_COLOR: Readonly<Record<Rarity, string>> = {
  junk: "#9aa0a6", common: "#f1efe6", uncommon: "#7fcf4f", rare: "#4aa3ff", epic: "#b86bff", legendary: "#ffb52e", mythic: "#ff5ad1",
};

/** Forest finds, one per outcome in game.json (same order). */
export const FOREST_FINDS: readonly Readonly<{ name: string; blurb: string; art: Pixmap }>[] = [
  { name: "Dry Twig", blurb: "Snapped off on the way home. Worth nothing, but it counts.", art: { palette: { k: INK, a: "#9a7650", b: "#c49a6c" }, rows: [
    "........k.", ".......kb.", "......kbk.", "..k..kak..", "..bk.kak..", "...kbak...", "...kak....", "..kak.....", ".kak......", ".kk......."] } },
  { name: "Acorn", blurb: "A perfect little acorn. Squirrels would trade for it.", art: { palette: { k: INK, a: "#c98a3e", b: "#ecc27c", c: "#6b4a2b" }, rows: [
    "....kk....", "..kkcckk..", ".kcccccck.", ".kkkkkkkk.", ".kabaaaak.", ".kbaaaaak.", "..kaaaak..", "..kaaaak..", "...kaak...", "....kk...."] } },
  { name: "Porcini", blurb: "A fat forest mushroom. Smells like autumn.", art: { palette: { k: INK, a: "#f2e2c0", b: "#c07a48", c: "#8b4a2b" }, rows: [
    "..kkkkkk..", ".kbbcccck.", "kbccccccck", "kkkkkkkkkk", "...kaak...", "...kaak...", "..kaaaak..", "..kaaaak..", "..kkkkkk..", ".........."] } },
  { name: "Owl Feather", blurb: "Silent and soft. Dropped by something watching.", art: { palette: { k: INK, a: "#e8e0d0", b: "#ffffff", c: "#8a7a6a" }, rows: [
    "........k.", ".......kak", "......kabk", ".....kacak", "....kacak.", "...kacak..", "..kacak...", ".kaak.....", ".kk.......", "k........."] } },
  { name: "Amber Beetle", blurb: "A beetle asleep in amber for a thousand years.", art: { palette: { k: INK, a: "#f5a623", b: "#ffd27a", c: "#6b3a10" }, rows: [
    "...kkkk...", "..kbbaak..", ".kbaaaaak.", "kbaacaaaak", "kaacccaaak", "kaaacaaaak", "kaacacaaak", ".kaaaaaak.", "..kaaaak..", "...kkkk..."] } },
  { name: "Golden Scarab", blurb: "It hums when held. Nobody knows why.", art: { palette: { k: INK, a: "#ffd23f", b: "#fff3a8", c: "#b87a10" }, rows: [
    "..k....k..", "...k..k...", "..kkkkkk..", ".kbacacak.", "kbaaacaaak", "kaaaacaaak", "kaaaacaaak", ".kaaacaak.", "k.kkkkkk.k", ".........."] } },
  { name: "Heart of the Forest", blurb: "The forest's oldest secret, still warm.", art: { palette: { k: INK, a: "#3ddc84", b: "#c8ffe0", c: "#1f8a4c" }, rows: [
    ".kk....kk.", "kbak..kaak", "kbaakkaaak", "kaaaaaaaak", "kaaaaaaack", ".kaaaaack.", "..kaaack..", "...kack...", "....kk....", ".........."] } },
];

/** Crystal Cave finds: same seven rarity tiers (and the same odds and prices) as the forest, different look. */
export const CAVE_FINDS: readonly Readonly<{ name: string; blurb: string; art: Pixmap }>[] = [
  { name: "Plain Pebble", blurb: "Round, grey and very honest about it.", art: { palette: { k: INK, a: "#8a8fa3", b: "#b6bccc", c: "#666b80" }, rows: [
    "..........", "..........", "...kkkk...", "..kbbaak..", ".kbaaaaak.", ".kaaaacak.", ".kaacaaak.", "..kaaaak..", "...kkkk...", ".........."] } },
  { name: "Quartz Shard", blurb: "Clear as spring water and twice as cold.", art: { palette: { k: INK, a: "#cfe3ee", b: "#ffffff" }, rows: [
    "....k.....", "...kbk....", "...kbak...", "..kbaak.k.", "..kbaakkbk", ".kbaaakbak", ".kbaaakaak", ".kbaaaaak.", "..kkkkkk..", ".........."] } },
  { name: "Glowworm Jar", blurb: "A borrowed jar of tiny lights. They seem happy.", art: { palette: { k: INK, a: "#24445a", g: "#b6ff6a", b: "#fff9a0", c: "#8b5a2b" }, rows: [
    "...kkkk...", "...kcck...", "..kkkkkk..", ".kaaaaaak.", ".kagaabak.", ".kaaagaak.", ".kgaaaaak.", ".kaabagak.", ".kaaaaaak.", "..kkkkkk.."] } },
  { name: "Amethyst", blurb: "Purple points that catch the lantern light.", art: { palette: { k: INK, a: "#9b59d0", b: "#e0b8ff", c: "#6a3a9a" }, rows: [
    "....k.....", "...kbk..k.", "...kak.kbk", ".k.kak.kak", "kbkkaakkak", "kakkaakaak", "kaakaaaaak", ".kcaaaacak", "..kkkkkkk.", ".........."] } },
  { name: "Moon Crystal", blurb: "It glows a little brighter every night.", art: { palette: { k: INK, a: "#7fb8ff", b: "#e8f4ff" }, rows: [
    "...kkkk...", "..kbbbak..", ".kbbaak...", ".kbak.....", "kbak......", "kbak......", ".kbak.....", ".kbbaak...", "..kbbbak..", "...kkkk..."] } },
  { name: "Heart of the Cave", blurb: "Warm as a hearth, deep under the stone.", art: { palette: { k: INK, a: "#ff5a3a", b: "#ffc0a0", c: "#b8281a" }, rows: [
    ".kk...kk..", "kbbk.kaak.", "kbaakaaaak", "kaaaaaaaak", "kaaaaaacak", ".kaaaacak.", "..kaaaak..", "...kaak...", "....kk....", ".........."] } },
  { name: "Dragon Egg", blurb: "Something inside is listening.", art: { palette: { k: INK, a: "#2fb8a0", b: "#a8f0e0", c: "#ffd23f" }, rows: [
    "...kkkk...", "..kbaaak..", ".kbaacaak.", ".kaaaaaak.", "kaacaaacak", "kaaaaaaaak", "kacaaacaak", "kaaaaaaaak", ".kaacaaak.", "..kkkkkk.."] } },
];
/** Sunken Ruins finds: again the same seven rarity tiers, odds and prices. */
export const RUINS_FINDS: readonly Readonly<{ name: string; blurb: string; art: Pixmap }>[] = [
  { name: "Pottery Shard", blurb: "Part of a pot. The rest of the pot is somewhere else.", art: { palette: { k: INK, a: "#c0663a", b: "#e08a5a", c: "#6b2f18" }, rows: [
    "....kkk...", "...kaaak..", "..kabbaak.", ".kaaaaaak.", ".kacaccak.", "kaaaaaaak.", "kaaaaak...", ".kkaak....", "...kk.....", ".........."] } },
  { name: "Copper Coin", blurb: "Stamped with a sun. It still shines a little.", art: { palette: { k: INK, a: "#c87a3a", b: "#f0b070" }, rows: [
    "...kkkk...", "..kbbaak..", ".kbaaaaak.", "kbaakkaaak", "kaak..kaak", "kaak..kaak", "kaaakkaaak", ".kaaaaaak.", "..kaaaak..", "...kkkk..."] } },
  { name: "Glass Bead", blurb: "Blue as deep water, smooth as a river stone.", art: { palette: { k: INK, a: "#3a8ad0", b: "#bfe4ff" }, rows: [
    "....k.....", "....k.....", "...kkk....", "..kbbak...", ".kbaaaak..", ".kaaaaak..", ".kaaaaak..", "..kaaak...", "...kkk....", "....k....."] } },
  { name: "Silver Ring", blurb: "A ring with a pink stone, too small for anyone alive.", art: { palette: { k: INK, a: "#b8c0d0", b: "#ffffff", c: "#e84a8a" }, rows: [
    "....kk....", "...kcck...", "..kkcckk..", ".kbk..kak.", "kbk....kak", "kak....kak", "kak....kak", ".kak..kak.", "..kaaaak..", "...kkkk..."] } },
  { name: "Ancient Mask", blurb: "Its eyes follow you. Politely.", art: { palette: { k: INK, a: "#3fb89a", b: "#ffd23f", c: "#1f6a5a" }, rows: [
    "..kkkkkk..", ".kaaaaaak.", "kabaaaabak", "kakkaakkak", "kaaaaaaaak", "kaaakkaaak", ".kaaaaaak.", ".kacacaak.", "..kaaaak..", "...kkkk..."] } },
  { name: "Sun Crown", blurb: "Made for a ruler who loved mornings.", art: { palette: { k: INK, a: "#ffd23f", b: "#fff3a8", c: "#e84a4a", d: "#3a8ad0" }, rows: [
    "..........", "k...kk...k", "kk.kbak.kk", "kbkkaaakak", "kaaaaaaaak", "kacaadacak", "kaaaaaaaak", "kkkkkkkkkk", "..........", ".........."] } },
  { name: "Idol of the First Friend", blurb: "Carved in jade by someone who clearly had a Friend of their own.", art: { palette: { k: INK, a: "#2fc88a", b: "#c8ffe0" }, rows: [
    "...kkkk...", "..kbaaak..", "..kakkak..", "..kaaaak..", "...kaak...", ".kkaaaakk.", "kaakaakaak", "...kaak...", "..kaaaak..", ".kkkkkkkk."] } },
];
export type Location = "forest" | "cave" | "ruins";
export const LOCATIONS: readonly Location[] = ["forest", "cave", "ruins"];
export const FINDS: Readonly<Record<Location, typeof FOREST_FINDS>> = { forest: FOREST_FINDS, cave: CAVE_FINDS, ruins: RUINS_FINDS };
export const LOCATION_NAME: Readonly<Record<Location, string>> = { forest: "Whispering Forest", cave: "Crystal Cave", ruins: "Sunken Ruins" };
export const CRYSTAL: Pixmap = { palette: { a: "#3fc8f0", b: "#bff3ff", c: "#ffffff", k: "#1b5a78" }, rows: [
  "..k..", ".kbk.", "kbcak", "kaaak", ".kak.", "..k.."] };
export const LANTERN: Pixmap = { palette: { k: INK, a: "#ffd23f", b: "#fff3a8", m: "#6b6f80" }, rows: [
  ".kk.", "kmmk", "kabk", "kbak", "kmmk"] };

const CHEST_BODY = ["kgggggkghkgggggk", "kcaaaaakggkaaaak", "kcaaaaaakkaaaaak", "kcaaaaaaaaaaaaak", "kcaaaaaaaaaaaaak", "kcccccccccccccck", "kkkkkkkkkkkkkkkk"];
const CHEST_PALETTE = { k: INK, a: "#b86b2b", b: "#e0924a", c: "#7a4418", g: "#ffd23f", h: "#fff3a8" };
export const CHEST: Pixmap = { palette: CHEST_PALETTE, rows: ["..kkkkkkkkkkkk..", ".kbbbbbbbbbbbbk.", "kbaaaaaaaaaaaaak", "kaaaaaaaaaaaaaak", "kkkkkkkggkkkkkkk", ...CHEST_BODY] };
export const CHEST_OPEN: Pixmap = { palette: CHEST_PALETTE, rows: ["..kkkkkkkkkkkk..", ".kcccccccccccck.", "kc............ck", "kkkkkkkkkkkkkkkk", "kh............hk", ...CHEST_BODY] };
export const HEART: Pixmap = { palette: { k: INK, a: "#ff4d6d", b: "#ffb3c1" }, rows: [
  ".kk.kk.", "kbakaak", "kaaaaak", ".kaaak.", "..kak..", "...k..."] };
export const SPARK: Pixmap = { palette: { a: "#fff3a8", b: "#ffd23f" }, rows: [
  "..a..", ".aba.", "abbba", ".aba.", "..a.."] };
export const PASS: Pixmap = { palette: { k: INK, a: "#f1e3b0", b: "#c8a24a", c: "#3e9b5a" }, rows: [
  "kkkkkkkkkk", "kaaaaaaaak", "kacccaabak", "kaccaaabak", "kacaaaabak", "kaaaaaaaak", "kkkkkkkkkk"] };

export function drawPixmap(ctx: CanvasRenderingContext2D, art: Pixmap, x: number, y: number, scale = 1, alpha = 1) {
  const prev = ctx.globalAlpha; ctx.globalAlpha = alpha;
  art.rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = art.palette[row[i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * scale, y + j * scale, scale, scale); } } });
  ctx.globalAlpha = prev;
}

/** Render a pixmap to a data URL for use in HTML panels. */
export function pixmapUrl(art: Pixmap, scale = 4, silhouette = false): string {
  const w = Math.max(...art.rows.map(r => r.length)), h = art.rows.length;
  const canvas = document.createElement("canvas"); canvas.width = w * scale; canvas.height = h * scale;
  const ctx = canvas.getContext("2d"); if (!ctx) return "";
  if (silhouette) {
    art.rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (art.palette[row[i]]) { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(i * scale, j * scale, scale, scale); } });
  } else drawPixmap(ctx, art, 0, 0, scale);
  return canvas.toDataURL();
}

/* ---------- Hero (the selected Rare Friend) ---------- */

/** The Friend is always drawn from its canonical frames in the canonical look (black mask, white halo). Clothes
 * from the wardrobe are worn over it (FriendSDK v0.1.2 allows costumes), fitted to its own silhouette and never
 * changing its outline; a torch or lantern is held beside it. */
export type HeroLook = Readonly<{ torch?: boolean; lantern?: boolean; moving?: boolean; clock?: number; outfit?: Outfit }>;
/** Canonical Friend colors (the SDK reference look). */
export const FRIEND_MASK = "#111111", FRIEND_HALO = "#ffffff";

type Bounds = { top: number; bottom: number; left: number; right: number };
export function spriteBounds(rows: readonly string[]): Bounds {
  let top = 16, bottom = -1, left = 16, right = -1;
  rows.forEach((row, j) => { for (let i = 0; i < 16; i++) if (row[i] === "#") { top = Math.min(top, j); bottom = Math.max(bottom, j); left = Math.min(left, i); right = Math.max(right, i); } });
  if (bottom < 0) return { top: 0, bottom: 15, left: 0, right: 15 };
  return { top, bottom, left, right };
}

type C = CanvasRenderingContext2D;
const px = (ctx: C, x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/** Only the Friend itself: its canonical frame as a black mask with a white one-pixel halo (the SDK's
 * reference look). The engine also redraws this after weather and light overlays so that nothing tints it. */
export function drawFriendPixels(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, flash = false) {
  const on = (i: number, j: number) => j >= 0 && j < 16 && i >= 0 && i < 16 && rows[j][i] === "#";
  ctx.fillStyle = flash ? "#ffffff" : FRIEND_HALO;
  for (let j = -1; j < 17; j++) for (let i = -1; i < 17; i++) {
    if (on(i, j)) continue;
    if (on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1)) ctx.fillRect(x + i, y + j, 1, 1);
  }
  ctx.fillStyle = flash ? "#ffffff" : FRIEND_MASK;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if (on(i, j)) ctx.fillRect(x + i, y + j, 1, 1);
}

/** Draw a 16×16 Friend frame at (x, y) = top-left of its 16×16 box, 1 canvas pixel per sprite pixel.
 * The Friend is its canonical frame in the canonical colors with its outfit on top; a held torch or lantern sits outside its halo. */
export function drawHero(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, look: HeroLook, facing: Facing = "right", flash = false) {
  drawFriendPixels(ctx, rows, x, y, flash);
  if (!flash) drawOutfit(ctx, rows, x, y, look.outfit, facing, look.clock ?? 0, !!look.moving);
  if (flash || (!look.lantern && !look.torch)) return;
  const b = spriteBounds(rows), midY = Math.round((b.top + b.bottom) / 2);
  let right = b.right; // rightmost pixel on the middle row, so the item is held at the Friend's side
  for (let i = 15; i >= 0; i--) if (rows[midY]?.[i] === "#") { right = i; break; }
  const hx = x + right + 2, hy = y + midY - 2;
  if (look.lantern) { px(ctx, hx + 1, hy - 2, 1, 2, INK); drawPixmap(ctx, LANTERN, hx, hy); }
  else {
    px(ctx, hx, hy + 2, 3, 7, INK); px(ctx, hx + 1, hy + 3, 1, 5, "#8b5a2b");
    px(ctx, hx, hy, 3, 3, "#ff8c3a"); px(ctx, hx + 1, hy - 1, 1, 3, "#ffd23f"); px(ctx, hx + 1, hy + 1, 1, 1, "#fff3a8");
  }
}

/* ---------- weather icons (9×9) ---------- */
const CLOUD = ["...ccc...", ".cccccc..", "ccccccccc", ".ccccccc."];
export const WEATHER_ICONS = {
  sun: { palette: { y: "#ffd23f", o: "#ff9a3c" }, rows: ["....y....", ".y.....y.", "...ooo...", "..oyyyo..", "y.oyyyo.y", "..oyyyo..", "...ooo...", ".y.....y.", "....y...."] },
  dusk: { palette: { y: "#ffb36b", o: "#ff6a3c", h: "#6a5a9a" }, rows: [".........", "...ooo...", "..oyyyo..", ".oyyyyyo.", ".oyyyyyo.", "hhhhhhhhh", ".hhhhhhh.", ".........", "........."] },
  moon: { palette: { m: "#fff3c8", s: "#d8c890" }, rows: ["..mmm....", ".mms.....", "mms......", "mm.......", "mm.......", "mms....m.", ".mms..mm.", "..mmmmm..", "........."] },
  light: { palette: { c: "#d0d7e6", d: "#6ec6ff" }, rows: [...CLOUD, ".........", ".d..d..d.", ".........", "..d..d...", "........."] },
  heavy: { palette: { c: "#9aa4b8", d: "#6ec6ff" }, rows: [...CLOUD, "d.d.d.d.d", ".d.d.d.d.", "d.d.d.d.d", ".d.d.d.d.", "........."] },
  storm: { palette: { c: "#6d7688", y: "#ffd23f" }, rows: [...CLOUD, "....yy...", "...yy....", "..yyyy...", "....y....", "...y....."] },
} satisfies Record<string, Pixmap>;

/* ---------- emote bubbles (drawn above the Friend; the Friend's own artwork is never altered) ---------- */
export type Emote = "zzz" | "note" | "heart" | "wow" | "dots" | "dizzy" | "sweat" | "star";
const BUBBLE_ICONS: Readonly<Record<Emote, Pixmap>> = {
  zzz: { palette: { k: "#3a3d6e" }, rows: ["kkk....", "..k....", ".k.kkk.", "kkk..k.", "....k..", "...kkk."] },
  note: { palette: { k: INK }, rows: ["..kkkk.", "..k..k.", "..k..k.", "..k..k.", "kkk.kkk", "kkk.kkk"] },
  heart: { palette: { r: "#ff4d6d", p: "#ffb3c1" }, rows: [".rr.rr.", "rprrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."] },
  wow: { palette: { k: "#e04848" }, rows: ["...k...", "...k...", "...k...", "...k...", ".......", "...k..."] },
  dots: { palette: { k: "#3a3d6e" }, rows: [".......", ".......", ".......", "k..k..k", ".......", "......."] },
  dizzy: { palette: { y: "#ffb52e" }, rows: ["y.....y", ".y...y.", "..y.y..", "...y...", "..y.y..", ".y...y."] },
  sweat: { palette: { b: "#6ec6ff", w: "#ffffff" }, rows: ["...b...", "..bbb..", ".bbwbb.", ".bbbbb.", "..bbb..", "......."] },
  star: { palette: { y: "#ffd23f", o: "#ff9a3c" }, rows: ["...y...", "..yyy..", "yyyyyyy", ".yyoyy.", ".yy.yy.", "y.....y"] },
};
/** Speech bubble 11×10 with the tail pointing down at (cx, bottom). */
export function drawEmote(ctx: CanvasRenderingContext2D, emote: Emote, cx: number, bottom: number) {
  const x = Math.round(cx) - 5, y = Math.round(bottom) - 10;
  ctx.fillStyle = INK; ctx.fillRect(x + 1, y, 9, 1); ctx.fillRect(x, y + 1, 11, 6); ctx.fillRect(x + 1, y + 7, 9, 1); ctx.fillRect(x + 4, y + 8, 3, 1); ctx.fillRect(x + 5, y + 9, 1, 1);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 1, y + 1, 9, 6); ctx.fillRect(x + 5, y + 7, 1, 1);
  drawPixmap(ctx, BUBBLE_ICONS[emote], x + 2, y + 1);
}
