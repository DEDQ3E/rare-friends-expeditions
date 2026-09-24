/** Canvas scenes for Rare Friends: Expeditions: the camp and the forest run.
 * 240 × 160 logical pixels, scaled up with nearest-neighbour. In the camp the Friend walks freely with
 * depth (W A S D); the forest is a single horizontal lane (A / D to move, W / Space to jump, S to drop).
 * No economy logic lives here: the run only produces XP (sparks); the find is decided by the SDK
 * when the expedition starts. */

import { CAVE_CAM_MAX, CAVE_FLOOR, CAVE_HERO_Y, buildCave, zoneAt, createDarkness, drawCaveBack, drawCaveEntity, drawCaveEntrance, drawCaveFloor, drawCaveGlints, drawCaveWalls, wallL, wallR, type CaveEntity, type Light } from "./cave.js";
import { HOURGLASS, RUINS_TIME, createRuins, type Dir } from "./ruins.js";
import { CHEST, CHEST_OPEN, CRYSTAL, HEART, INK, SPARK, drawEmote, drawFriendPixels, drawHero, drawPixmap, spriteBounds, type Emote, type HeroLook, type Pixmap } from "./art.js";
import { drawOutfit, hatHeight } from "./wardrobe.js";
import type { PerkEffects } from "./perks.js";
import { MOB_SIZE, drawMob, type MobKind } from "./mobs.js";
import { drawBirds, drawClouds, drawMist, drawMoon, drawPineRow, drawRange, drawShootingStar, drawSky, drawStars, drawSun, mix } from "./backdrop.js";
import { drawBench, drawBoard, drawChest, drawCrates, drawFairyLights, drawFire, drawFireBack, drawFireFront, drawLanternPost, drawRug, drawShop, drawTent, drawParticle, emitFire, fireGlow, type CampFrame, type Particle } from "./camp.js";
import { drawBirch, drawBush, drawFarTrees, drawFern, drawGroundDecor, drawOak, drawPine, hash, haze } from "./scenery.js";
import { FOREST_PALETTES, createRainFx, drawFireflies, rollRain, type Rain, type Weather } from "./weather.js";

export const W = 240, H = 160;
export const RUN_LENGTH = 1500; // world pixels, about 23 s

export type CampSpot = "board" | "outfitter" | "merchant" | "collection";
/** Label anchors in logical pixels (used by the UI to place accessible buttons). */
export const CAMP_SPOTS: Readonly<Record<CampSpot, { x: number; y: number }>> = {
  board: { x: 22, y: 53 }, outfitter: { x: 70, y: 73 }, merchant: { x: 212, y: 56 }, collection: { x: 118, y: 106 },
}
/** Where the Friend's feet must be to use a place (logical pixels). */
const CAMP_STATIONS: Readonly<Record<CampSpot, { x: number; y: number }>> = {
  board: { x: 22, y: 126 }, outfitter: { x: 70, y: 126 }, collection: { x: 118, y: 130 }, merchant: { x: 212, y: 126 },
}

type Clip = readonly (readonly string[])[];
export type HeroSprites = Readonly<{ walk: Readonly<{ right: Clip; left: Clip; up: Clip; down: Clip }>; idle: Clip }>;
export type Trail = "spark" | "leaves" | null;
export type RunConfig = Readonly<{ hearts: number; doubleJump: boolean; seed: number; trail: Trail; weather: Weather; perk: PerkEffects }>;
/** The Crystal Cave descent: no weather, no jumping; the Friend is lowered on a rope. */
export type CaveConfig = Readonly<{ hearts: number; seed: number; trail: Trail; perk: PerkEffects; /** previews/tests only: start this deep */ startAt?: number }>;
export type RunResult = Readonly<{ sparks: number; hits: number; completed: boolean }>;
export type RunEvent =
  | { type: "spark"; sparks: number }
  | { type: "heart"; hearts: number }
  | { type: "hit"; hearts: number }
  | { type: "jump"; air: boolean }
  | { type: "land" }
  | { type: "step"; surface: "grass" | "path" | "stone" }
  | { type: "arrow" }
  | { type: "crumble" }
  | { type: "tick" }
  | { type: "spikewarn" }
  | { type: "near"; spot: CampSpot | null }
  | { type: "finish"; result: RunResult }
  | { type: "thunder" }
  | { type: "campWeather"; rain: Rain }
  | { type: "stomp" }
  | { type: "shield" }
  | { type: "zone"; index: number }
  | { type: "rumble" }
  | { type: "whoosh" };

type Facing = "right" | "left" | "up" | "down";
type Entity = { kind: MobKind | "spark" | "heart"; x: number; depth: number; z: number; w: number; h: number; alive: boolean; phase: number; variant: number };
type Rect = { x: number; y: number; w: number; h: number };

const HERO_X = 44;                         // forest camera anchor
const GROUND = 128;                        // forest ground line (screen y): the run is one horizontal lane
const CAMP_MIN_Y = 118, CAMP_MAX_Y = 146;  // Friend's feet in the camp
const GRAVITY = 600, JUMP_V = 212;
const WALK = 52;

// Things the Friend cannot walk through in the camp (feet space).
const CAMP_BLOCKS: readonly Rect[] = [
  { x: 8, y: 117, w: 6, h: 6 }, { x: 31, y: 117, w: 6, h: 6 },    // quest board posts
  { x: 44, y: 112, w: 52, h: 11 },                                 // tent
  { x: 98, y: 118, w: 5, h: 5 },                                   // lantern post
  { x: 108, y: 116, w: 20, h: 9 },                                 // chest
  { x: 138, y: 120, w: 29, h: 12 },                                // campfire
  { x: 166, y: 109, w: 22, h: 11 },                                // barrel and crates
  { x: 167, y: 125, w: 19, h: 6 },                                 // bench
  { x: 185, y: 106, w: 54, h: 17 },                                // shop counter
]

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111"];
function drawNumber(ctx: CanvasRenderingContext2D, value: number, x: number, y: number, color: string) {
  const text = String(Math.max(0, Math.floor(value)));
  for (let n = 0; n < text.length; n++) {
    const bits = DIGITS[Number(text[n])];
    for (let k = 0; k < 15; k++) if (bits[k] === "1") {
      ctx.fillStyle = INK; ctx.fillRect(x + n * 4 + (k % 3) + 1, y + Math.floor(k / 3) + 1, 1, 1);
      ctx.fillStyle = color; ctx.fillRect(x + n * 4 + (k % 3), y + Math.floor(k / 3), 1, 1);
    }
  }
}

export function createEngine(canvas: HTMLCanvasElement, onEvent: (event: RunEvent) => void) {
  const maybe = canvas.getContext("2d");
  if (!maybe) throw new Error("This browser cannot draw the game.");
  const ctx: CanvasRenderingContext2D = maybe;
  // Render at a whole-number multiple of the logical 240×160 art so scrolling layers can move in
  // screen-pixel steps (smooth parallax) while every art pixel stays a crisp square.
  let S = 4;
  function resize() {
    const cssW = canvas.clientWidth || W * 4, dpr = window.devicePixelRatio || 1;
    const next = Math.max(2, Math.min(8, Math.round((cssW * dpr) / W)));
    if (next !== S || canvas.width !== W * next) { S = next; canvas.width = W * S; canvas.height = H * S; }
  }
  resize();
  window.addEventListener("resize", resize);
  const snap = (v: number) => Math.round(v * S) / S;
  /** Draw a scrolling layer at integer scroll, then shift it by the sub-pixel remainder. */
  function layer(scroll: number, draw: (whole: number) => void) {
    const whole = Math.floor(scroll); ctx.save(); ctx.translate(-snap(scroll - whole), 0); draw(whole); ctx.restore();
  }

  let sprites: HeroSprites | null = null;
  let look: HeroLook | null = null;
  let mode: "camp" | "run" | "cave" | "ruins" = "camp";
  let season = false;
  let paused = false, reducedMotion = false, destroyed = false;
  let raf = 0, last = 0, clock = 0;
  let moveX = 0, moveY = 0;
  let particles: Particle[] = [];
  // weather
  const fx = createRainFx(() => onEvent({ type: "thunder" }));
  let runWeather: Weather = { time: "day", rain: "none" };
  let campRain: Rain = "none", campTimer = 18 + Math.random() * 12, campRainAnnounced = false;

  // camp state
  let campX = 140, campY = 140, campFacing: Facing = "down", campMoving = false, stepTimer = 0, lastNear: CampSpot | null = null;
  // run state
  let cfg: RunConfig = { hearts: 3, doubleJump: false, seed: 1, trail: null, weather: { time: "day", rain: "none" }, perk: { extraHearts: 0, shield: 0, magnet: 0, moveMult: 1, fallMult: 1, stomp: false, invulnBonus: 0, xpMult: 1 } };
  let shieldLeft = 0;
  // emotes and celebration (drawn around the Friend; its own artwork is never altered)
  let emote: { kind: Emote; until: number } | null = null, idleFor = 0, nextHum = 6;
  let celebration: { pix: Pixmap; mood: "sad" | "happy" | "great"; t: number } | null = null;
  let dist = 0, speed = 60, heroOff = 0, heroY = GROUND, runFacing: Facing = "right";
  let z = 0, vz = 0, grounded = true, airJumps = 0;
  let hearts = 3, invuln = 0, sparks = 0, hits = 0, finished = false, chestOpen = false, shake = 0;
  let entities: Entity[] = [];
  let chestX = RUN_LENGTH + 36;
  const CHEST_DEPTH = GROUND;
  // cave state (world y grows downward; `depth` is the camera's top edge)
  let depth = 0, caveY = CAVE_HERO_Y, fall = 40, caveX = 112, brake = false, caveFacing: Facing = "down", rescue = false, caveChestX = 140, caveZone = 0;
  let cave: CaveEntity[] = [];
  const drawDarkness = createDarkness();
  // where the Friend was drawn this frame: redrawn after weather, darkness and light overlays so its original
  // artwork is never tinted (contest rule: preserve the Friend's original character artwork)
  let friendAt: { rows: readonly string[]; x: number; y: number; facing?: Facing; moving?: boolean } | null = null;
  const restoreFriend = () => {
    if (friendAt) { drawFriendPixels(ctx, friendAt.rows, friendAt.x, friendAt.y); drawOutfit(ctx, friendAt.rows, friendAt.x, friendAt.y, look?.outfit, friendAt.facing ?? "down", clock, !!friendAt.moving); }
    friendAt = null;
  };
  /** Speech bubbles and a held-up find sit above the hat. */
  const hatLift = () => hatHeight(look?.outfit);
  // ruins: a top-down trap gauntlet (see ruins.ts); the engine supplies the Friend, shield and effects
  const ruins = createRuins({
    onEvent: e => onEvent(e as RunEvent),
    tryShield: () => { if (shieldLeft <= 0) return false; shieldLeft--; onEvent({ type: "shield" }); return true; },
    hitReact: () => { emote = { kind: "dizzy", until: clock + 0.7 }; shake = reducedMotion ? 0 : 0.2; },
    particle: p => { particles.push(p); },
  });

  function frameOf(clip: Clip, fps: number) { return clip[reducedMotion ? 0 : Math.floor(clock * fps) % clip.length]; }

  /* ---------------- camp ---------------- */
  const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 53 + 17) % W, y: (i * 29 + 7) % 64, p: i * 0.7 }));
  function drawCampBackground() {
    drawSky(ctx, CAMP_SKY, 106, true);
    drawStars(ctx, clock, 60, 72, reducedMotion);
    if (!reducedMotion && fx.level < 0.2) drawShootingStar(ctx, clock);
    drawMoon(ctx, 198, 22, 8);
    drawClouds(ctx, clock * 1.5, 3, 6, 26, "#5c5a90", "#40406e", "#2c2c54", 0.7, snap);
    fx.drawClouds(ctx, clock, "#2a2c48");
    drawRange(ctx, 0, 100, 36, 1.3, "#2a2b5c", "#46478c", "#7e7eba");
    drawMist(ctx, clock, 84, 7, "160,140,210", 0.06, reducedMotion, snap);
    drawRange(ctx, 40, 104, 22, 4.1, "#1f2448", "#353b70");
    drawPineRow(ctx, 106, 11, 16, 12, "#1b2a40", 3);
    drawMist(ctx, clock, 97, 7, "160,140,210", 0.08, reducedMotion, snap);
    drawPineRow(ctx, 107, 15, 20, 14, "#132232", 9);
    const NP = FOREST_PALETTES.night;
    drawPine(ctx, 100, 106, 1, NP); drawOak(ctx, 128, 105, 0, NP, 3); drawBirch(ctx, 238, 106, 0, NP, 5); drawPine(ctx, 3, 104, 2, NP); drawPine(ctx, 160, 105, 0, NP);
    ctx.fillStyle = "#2f5a3a"; ctx.fillRect(0, 104, W, 56);
    ctx.fillStyle = "#3a6b44"; for (let x = 0; x < W; x += 7) ctx.fillRect(x + ((x * 7) % 5), 108 + ((x * 13) % 40), 2, 1);
    ctx.fillStyle = "#6b5a44"; for (let x = 0; x < W; x++) { const y = 138 + Math.round(3 * Math.sin(x / 16)); ctx.fillRect(x, y, 1, 6); }
    ctx.fillStyle = "#7d6a50"; for (let x = 0; x < W; x += 5) ctx.fillRect(x, 139 + Math.round(3 * Math.sin(x / 16)), 2, 1);
    // flowers, tufts and stones around the camp
    for (const [x, y, k] of [[4, 130, 0], [40, 132, 1], [90, 140, 2], [130, 150, 1], [194, 134, 2], [226, 146, 0], [30, 150, 3], [160, 146, 3], [62, 146, 0], [104, 134, 1], [236, 128, 3], [148, 140, 0]] as const) {
      if (k === 0) { ctx.fillStyle = "#3a6b44"; ctx.fillRect(x, y - 2, 1, 2); ctx.fillRect(x + 2, y - 3, 1, 3); ctx.fillRect(x + 4, y - 2, 1, 2); }
      else if (k === 1) { ctx.fillStyle = "#3a6b44"; ctx.fillRect(x + 1, y - 2, 1, 2); ctx.fillStyle = "#c8b8f0"; ctx.fillRect(x, y - 3, 3, 1); ctx.fillRect(x + 1, y - 4, 1, 1); ctx.fillStyle = "#ffd23f"; ctx.fillRect(x + 1, y - 3, 1, 1); }
      else if (k === 2) { ctx.fillStyle = INK; ctx.fillRect(x, y - 3, 5, 2); ctx.fillStyle = "#c07a48"; ctx.fillRect(x + 1, y - 3, 3, 1); ctx.fillStyle = "#e8dcc0"; ctx.fillRect(x + 2, y - 1, 1, 1); }
      else { ctx.fillStyle = INK; ctx.fillRect(x, y - 2, 5, 2); ctx.fillStyle = "#6f7488"; ctx.fillRect(x + 1, y - 2, 3, 1); }
    }
    // puddles while it rains
    if (fx.level > 0.12) {
      ctx.globalAlpha = Math.min(1, fx.level * 1.2);
      for (const [px, py, pw] of [[20, 140, 18], [84, 146, 22], [128, 138, 14], [176, 144, 20], [214, 136, 12]] as const) {
        ctx.fillStyle = "#34506a"; ctx.fillRect(px, py, pw, 3); ctx.fillRect(px + 2, py - 1, pw - 4, 5);
        ctx.fillStyle = "#5d7f9c"; ctx.fillRect(px + 3, py, pw - 8, 1);
        if (!reducedMotion) { const r = (clock * 3 + px) % 4; ctx.fillStyle = "rgba(200,225,255,.6)"; ctx.fillRect(px + pw / 2 - r, py + 1, 1, 1); ctx.fillRect(px + pw / 2 + r, py + 1, 1, 1); }
      }
      ctx.globalAlpha = 1;
    }
    // warm light from the fire on the ground, and the rug under the chest
    fireGlow(campFrame()); drawRug(campFrame());
  }
  const CAMP_SKY = ["#0b0e28", "#12163a", "#1b1d48", "#282456", "#3c2c64", "#57376e", "#734274", "#8a4d78"] as const;
  const campFrame = (): CampFrame => ({ ctx, clock, still: reducedMotion, rain: fx.level });
  function drawCampHero() {
    if (!sprites || !look) return;
    const rows = campMoving ? frameOf(sprites.walk[campFacing], 12) : frameOf(sprites.idle, 5);
    const b = spriteBounds(rows); const hx = Math.round(campX) - 8, hy = Math.round(campY) - 1 - b.bottom;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(hx + b.left, Math.round(campY), b.right - b.left + 1, 2);
    if (look.torch) torchGlow(hx + 16, hy + 2, 20);
    const campPose: Facing = campMoving ? campFacing : "down";
    drawHero(ctx, rows, hx, hy, { ...look, moving: campMoving, clock }, campPose); friendAt = { rows, x: hx, y: hy, facing: campPose, moving: campMoving };
    if (emote && clock < emote.until) drawEmote(ctx, emote.kind, hx + 8 + (emote.kind === "zzz" && !reducedMotion ? Math.sin(clock * 2) : 0), hy + spriteBounds(rows).top - 2 - hatLift());
    else if (emote && clock >= emote.until) emote = null;
  }
  function drawCamp() {
    drawCampBackground();
    const f = campFrame();
    const layers: { y: number; draw: () => void }[] = [
      { y: 122, draw: () => drawBoard(f) }, { y: 121.5, draw: () => drawTent(f) }, { y: 122.2, draw: () => drawLanternPost(f) },
      { y: 124, draw: () => drawChest(f) }, { y: 124.5, draw: () => drawFireBack(f) }, { y: 127, draw: () => drawFire(f) },
      { y: 130, draw: () => drawFireFront(f) }, { y: 120, draw: () => drawCrates(f) }, { y: 131, draw: () => drawBench(f) },
      { y: 122.5, draw: () => drawShop(f) }, { y: campY, draw: drawCampHero },
    ];
    if (season) for (const [px, py, big] of [[40, 127, 1], [47, 129, 0], [196, 129, 1], [16, 128, 0]] as const) layers.push({ y: py, draw: () => drawPumpkin(px, py, !!big) });
    layers.sort((a, b) => a.y - b.y).forEach(l => l.draw());
    drawFairyLights(f);
    for (const p of particles) drawParticle(ctx, p);
    if (fx.level < 0.5) drawFireflies(ctx, clock, 7, 96, 140, 0, reducedMotion);
    fx.drawRain(ctx); fx.drawOverlay(ctx, reducedMotion); restoreFriend();
  }
  /** Harvest Season pumpkin with a carved face that glows at night. */
  function drawPumpkin(x: number, y: number, big: boolean) {
    const w = big ? 9 : 7, h = big ? 6 : 5, l = x - Math.floor(w / 2), t = y - h;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(l, y, w, 1);
    ctx.fillStyle = INK; ctx.fillRect(l, t + 1, w, h - 1); ctx.fillRect(l + 1, t, w - 2, h + 1);
    ctx.fillStyle = "#e0701a"; ctx.fillRect(l + 1, t + 1, w - 2, h - 1); ctx.fillStyle = "#f59a3c"; ctx.fillRect(l + 1, t + 1, 2, h - 2);
    ctx.fillStyle = "#b8540f"; ctx.fillRect(x, t + 1, 1, h - 1);
    ctx.fillStyle = INK; ctx.fillRect(x - 1, t - 2, 2, 2); ctx.fillStyle = "#5ccb5f"; ctx.fillRect(x + 1, t - 2, 2, 1);
    if (big) { const glow = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(clock * 6 + x); ctx.fillStyle = `rgba(255,220,90,${glow.toFixed(2)})`; ctx.fillRect(x - 3, t + 2, 1, 1); ctx.fillRect(x + 2, t + 2, 1, 1); ctx.fillRect(x - 2, t + 4, 5, 1); }
  }
  const blocked = (x: number, y: number) => CAMP_BLOCKS.some(r => x + 4 > r.x && x - 4 < r.x + r.w && y + 1 > r.y && y - 1 < r.y + r.h);
  function updateCamp(dt: number) {
    if (moveX || moveY) { idleFor = 0; if (emote?.kind === "zzz") emote = null; } else idleFor += dt;
    if (idleFor > 8 && !emote) emote = { kind: "zzz", until: clock + 9999 };
    nextHum -= dt;
    if (nextHum <= 0) { nextHum = 7 + Math.random() * 6; if (!emote && Math.hypot(campX - 152, campY - 128) < 34) emote = { kind: Math.random() < 0.5 ? "note" : "heart", until: clock + 1.6 }; }
    if (!campRainAnnounced) { campRainAnnounced = true; onEvent({ type: "campWeather", rain: campRain }); }
    campTimer -= dt;
    if (campTimer <= 0) {
      let next = rollRain(); if (next === campRain) next = campRain === "none" ? "light" : "none";
      campRain = next; fx.set(next); campTimer = 35 + Math.random() * 45; onEvent({ type: "campWeather", rain: next });
    }
    campMoving = moveX !== 0 || moveY !== 0;
    if (campMoving) {
      const len = Math.hypot(moveX, moveY) || 1, dx = (moveX / len) * WALK * dt, dy = (moveY / len) * WALK * 0.75 * dt;
      const nx = Math.max(8, Math.min(W - 8, campX + dx)), ny = Math.max(CAMP_MIN_Y, Math.min(CAMP_MAX_Y, campY + dy));
      if (!blocked(nx, campY)) campX = nx;
      if (!blocked(campX, ny)) campY = ny;
      stepTimer -= dt;
      if (stepTimer <= 0) { stepTimer = 0.3; onEvent({ type: "step", surface: campY >= 138 ? "path" : "grass" }); }
      campFacing = Math.abs(moveX) >= Math.abs(moveY) && moveX !== 0 ? (moveX < 0 ? "left" : "right") : (moveY < 0 ? "up" : "down");
    }
    let near: CampSpot | null = null, best = 20;
    for (const spot of Object.keys(CAMP_STATIONS) as CampSpot[]) { const s = CAMP_STATIONS[spot]; const d = Math.hypot(campX - s.x, (campY - s.y) * 1.4); if (d < best) { best = d; near = spot; } }
    if (near !== lastNear) { lastNear = near; onEvent({ type: "near", spot: near }); }
  }

  /* ---------------- forest run ---------------- */
  function buildLevel(seed: number, weather: Weather) {
    const rnd = mulberry32(seed); const list: Entity[] = [];
    const mob = (kind: MobKind, x: number, z = 0, variant = 0): Entity => ({ kind, x, depth: GROUND, z, ...MOB_SIZE[kind], alive: true, phase: rnd() * 6, variant });
    const spark = (x: number, z: number): Entity => ({ kind: "spark", x, depth: GROUND, z, w: 5, h: 5, alive: true, phase: rnd() * 6, variant: 0 });
    const night = weather.time === "night", wet = weather.rain !== "none";
    // One challenge per "beat". Beats are spaced so every hazard can be cleared on its own:
    // never a ground obstacle and a flyer together, and moving creatures only start moving when close.
    let x = 260;
    while (x < RUN_LENGTH - 60) {
      const r = rnd(); let gap = 95 + Math.floor(rnd() * 40);
      if (r < 0.24) {
        const kinds: MobKind[] = x > 450 ? ["root", "rock", "shroom", "log"] : ["root", "rock", "shroom"];
        const k = kinds[Math.floor(rnd() * kinds.length)], w = MOB_SIZE[k].w;
        list.push(mob(k, x));
        for (let s = -1; s <= 1; s++) list.push(spark(x + w / 2 - 2 + s * 10, 24 - Math.abs(s) * 6));
        if (k === "log") gap += 15;
      } else if (r < 0.4) {
        list.push(mob("slime", x, 0, wet && rnd() < 0.5 ? 0 : Math.floor(rnd() * 3))); gap += 15;
      } else if (r < 0.47 && x > 400) {
        list.push(mob("hedgehog", x)); gap += 15;
      } else if (r < 0.54 && wet) {
        list.push(mob("frog", x)); gap += 20;
      } else if (r < 0.66 && x > 420) {
        list.push(mob(night ? (rnd() < 0.75 ? "bat" : "bee") : rnd() < 0.35 ? "wasp" : "bee", x, 14)); gap += 10;
      } else {
        const n = 4 + Math.floor(rnd() * 3), high = rnd() < 0.5;
        for (let s = 0; s < n; s++) list.push(spark(x + s * 9, high ? 22 + Math.sin((s / (n - 1)) * Math.PI) * 10 : 5));
        gap = 60 + Math.floor(rnd() * 30);
      }
      x += gap;
    }
    for (const at of [RUN_LENGTH * 0.45, RUN_LENGTH * 0.8]) if (rnd() < 0.8) list.push({ kind: "heart", x: at, depth: GROUND, z: 28, w: 7, h: 6, alive: true, phase: 0, variant: 0 });
    return list;
  }

  function parallax(factor: number) { return dist * factor; }
  function drawForest() {
    const P = FOREST_PALETTES[runWeather.time];
    const time = runWeather.time, night = time === "night";
    drawSky(ctx, [...P.sky, P.horizon], 112, night);
    if (night) { drawStars(ctx, clock, 50, 70, reducedMotion); if (!reducedMotion && fx.level < 0.2) drawShootingStar(ctx, clock); drawMoon(ctx, 196, 20, 7); }
    else if (time === "morning") drawSun(ctx, 40, 46, 7, "#ffe08a", "255,220,150", fx.level < 0.3, clock, reducedMotion);
    else if (time === "day") drawSun(ctx, 196, 20, 6, "#fff6c0", "255,250,200", false, clock, reducedMotion);
    else drawSun(ctx, 176, 82, 10, "#ff9a4a", "255,150,90", fx.level < 0.3, clock, reducedMotion);
    drawClouds(ctx, parallax(0.08) + clock * 1.5, 5, 6, 38, P.cloud, mix(P.cloud, P.sky[2], 0.3), mix(P.cloud, P.sky[1], 0.55), night ? 0.55 : 0.95, snap);
    fx.drawClouds(ctx, clock, night ? "#232a48" : "#6d7688");
    if (!night && fx.level < 0.3) drawBirds(ctx, clock, mix(P.mountain, "#1c1c1c", 0.55), reducedMotion, snap);
    const farC = mix(P.mountain, P.horizon, 0.5);
    layer(parallax(0.1), s => drawRange(ctx, s, 104, 46, 2.2, farC, mix(farC, "#ffffff", 0.25), night ? mix(P.mountainHi, "#ffffff", 0.15) : time === "evening" ? "#ffd8c8" : "#f4f6ff"));
    if (time === "morning" || night) drawMist(ctx, clock, 88, 8, night ? "150,160,220" : "255,240,230", night ? 0.07 : 0.14, reducedMotion, snap);
    layer(parallax(0.18), s => drawRange(ctx, s, 114, 32, 5.7, P.mountain, P.mountainHi));
    layer(parallax(0.4), s => { ctx.fillStyle = P.hill; for (let x = 0; x <= W + 1; x++) { const wx = x + s; const h = 16 + Math.round(9 * Math.abs(Math.sin(wx / 15 + 1))); ctx.fillRect(x, 124 - h, 1, h + 4); } });
    // Forest composition: distant tree line → back grove → front grove with undergrowth.
    // Groves share a species and density so the forest reads as stands and clearings, not random props.
    layer(parallax(0.4), s => drawFarTrees(ctx, s, P, W + 2, 116));
    haze(ctx, P.horizon, 0.22, 60, GROUND, W);
    const grove = (cell: number, seed: number) => { const g = Math.floor(cell / 6); return { density: hash(g * 3.7 + seed), species: hash(g * 1.9 + seed + 11) }; };
    const tree = (x: number, size: number, sp: number, cell: number) => { if (sp < 0.4) drawPine(ctx, x, GROUND, size, P); else if (sp < 0.75) drawOak(ctx, x, GROUND, size, P, cell); else drawBirch(ctx, x, GROUND, size, P, cell); };
    const species = (gs: number, cell: number) => hash(cell + 77) < 0.75 ? gs : hash(cell + 78);
    layer(parallax(0.55), back => {
      for (let i = -1; i < 12; i++) {
        const cell = Math.floor(back / 22) + i, g = grove(cell, 1);
        if (hash(cell + 3) < 0.25 + g.density * 0.6) tree(Math.round(cell * 22 - back + hash(cell) * 8), 0, species(g.species, cell), cell);
      }
    });
    haze(ctx, P.horizon, 0.16, 50, GROUND, W);
    // undergrowth band along the tree line
    ctx.fillStyle = P.canopyLo; ctx.fillRect(0, GROUND - 2, W, 2);
    layer(parallax(0.72), front => {
    for (let i = -1; i < 9; i++) {
      const cell = Math.floor(front / 34) + i, g = grove(cell, 5), x = Math.round(cell * 34 - front + hash(cell + 1) * 12);
      if (hash(cell + 7) < 0.2 + g.density * 0.55) {
        tree(x, 1 + Math.floor(hash(cell + 9) * 2), species(g.species, cell), cell);
        if (hash(cell + 13) < 0.7) drawBush(ctx, x + (hash(cell + 14) < 0.5 ? -7 : 7), GROUND, 7 + Math.floor(hash(cell + 15) * 5), P, cell);
        drawFern(ctx, x + 11, GROUND, P, cell);
      } else if (hash(cell + 17) < 0.5) {
        drawBush(ctx, x, GROUND, 8 + Math.floor(hash(cell + 18) * 5), P, cell + 100);
        if (hash(cell + 19) < 0.5) drawBush(ctx, x + 9, GROUND, 6, P, cell + 101);
        drawFern(ctx, x - 9, GROUND, P, cell + 3);
      } else drawFern(ctx, x, GROUND, P, cell + 5);
    }
    });
    if (runWeather.time === "night" && fx.level < 0.6) drawFireflies(ctx, clock, 10, 70, 122, dist, reducedMotion);
    layer(dist, dd => {
    ctx.fillStyle = INK; ctx.fillRect(0, GROUND, W + 2, 1);
    ctx.fillStyle = P.grass; ctx.fillRect(0, GROUND + 1, W + 2, 4);
    ctx.fillStyle = P.dirt; ctx.fillRect(0, GROUND + 5, W + 2, H - GROUND - 5);
    const g = dd % 8; ctx.fillStyle = P.grassDark; for (let x = -8; x < W + 8; x += 8) ctx.fillRect(x - g, GROUND + 5, 4, 1);
    ctx.fillStyle = P.dirtDark; const d = dd % 16; for (let x = -16; x < W + 16; x += 16) for (let y = GROUND + 10; y < H; y += 8) ctx.fillRect(x - d + ((y / 8) % 2 ? 8 : 0), y, 6, 2);
    ctx.fillStyle = P.pebble; const st = dd % 53; for (let x = -53; x < W + 53; x += 53) ctx.fillRect(x - st + 20, GROUND + 14, 2, 1);
    drawGroundDecor(ctx, dd, P, W + 12, GROUND);
    if (fx.level > 0.3) { ctx.fillStyle = "rgba(120,160,200,.45)"; const pd = dd % 71; for (let x = -71; x < W + 71; x += 71) { ctx.fillRect(x - pd + 30, GROUND + 2, 12, 2); ctx.fillRect(x - pd + 32, GROUND + 1, 8, 1); } }
    });
  }



  const screenX = (worldX: number) => snap(HERO_X + (worldX - dist));
  function drawShadow(x: number, depth: number, w: number) { ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(x, Math.round(depth), w, 1); }
  function drawEntity(e: Entity) {
    const sx = screenX(e.x); if (sx < -24 || sx > W + 24 || !e.alive) return;
    const top = Math.round(e.depth - e.z - e.h);
    if (e.kind === "spark") {
      if (e.z > 6) drawShadow(sx + 1, e.depth, 3);
      drawPixmap(ctx, SPARK, sx, top + (reducedMotion ? 0 : Math.round(Math.sin(clock * 5 + e.phase))));
    } else if (e.kind === "heart") {
      drawShadow(sx + 1, e.depth, 5);
      drawPixmap(ctx, HEART, sx, top + (reducedMotion ? 0 : Math.round(Math.sin(clock * 4) * 1.5)));
    } else {
      if (e.z > 1) drawShadow(sx + 2, e.depth, e.w - 4);
      drawMob(ctx, e.kind, sx, top, clock, e.phase, e.variant, reducedMotion);
    }
  }


  function heroRows() {
    if (!sprites) return null;
    if (finished) return frameOf(sprites.idle, 5);
    const clip = sprites.walk[runFacing];
    if (!grounded) return clip[2 % clip.length];
    return frameOf(clip, 12);
  }

  function updateRun(dt: number) {
    if (finished) { if (speed > 0) { speed = Math.max(0, speed - 90 * dt); dist += speed * dt; } return; }
    speed = Math.min(78, 60 + dist / 90);
    dist += speed * dt;
    heroOff = Math.max(-26, Math.min(96, heroOff + moveX * 58 * cfg.perk.moveMult * dt));
    // jump physics (z = height above the ground)
    if (!grounded || vz > 0) {
      vz -= GRAVITY * (vz < 0 ? cfg.perk.fallMult : 1) * dt; z += vz * dt;
      if (z <= 0) { z = 0; vz = 0; grounded = true; airJumps = cfg.doubleJump ? 1 : 0; onEvent({ type: "land" }); if (!reducedMotion) for (let i = 0; i < 3; i++) particles.push({ x: HERO_X + heroOff + 8, y: heroY, vx: (Math.random() - 0.5) * 30, vy: -8, life: 0.3, color: "#c49a6c" }); }
    }
    invuln = Math.max(0, invuln - dt); shake = Math.max(0, shake - dt);
    const rows = heroRows(); const b = rows ? spriteBounds(rows) : { top: 2, bottom: 15, left: 3, right: 12 };
    const heroX = HERO_X + Math.round(heroOff);
    const hx0 = heroX + b.left + 1, hx1 = heroX + b.right - 1, hz0 = z, hz1 = z + (b.bottom - b.top);
    for (const e of entities) {
      if (!e.alive) continue;
      const awake = screenX(e.x) < heroX + 130; // creatures start moving only when the Friend is close
      if (e.kind === "slime" && awake) { e.x -= (e.variant === 2 ? 26 : 11) * dt; if (e.variant === 0) e.z = Math.max(0, Math.sin(clock * 4 + e.phase)) * 9; }
      if (e.kind === "hedgehog" && awake) e.x -= 18 * dt;
      if (e.kind === "frog" && awake) { const t = (clock * 0.9 + e.phase) % 1; if (t < 0.4) { e.z = Math.sin((t / 0.4) * Math.PI) * 12; e.x -= 40 * dt; e.variant = 1; } else { e.z = 0; e.variant = 0; } }
      if (e.kind === "bat") { e.z = 14 + Math.sin(clock * 3 + e.phase) * 10; if (awake) e.x -= 20 * dt; }
      if (e.kind === "wasp") { e.z = 13 + Math.sin(clock * 4 + e.phase) * 11; if (awake) e.x -= 14 * dt; }
      if (e.kind === "bee") e.z = 16 + Math.sin(clock * 2.6 + e.phase) * 12;
      if (e.kind === "spark" && cfg.perk.magnet > 0) {
        const dx = heroX + 8 - (screenX(e.x) + 2), dz = (z + 7) - (e.z + 2), d = Math.hypot(dx, dz);
        if (d < cfg.perk.magnet && d > 0.5) { const pull = Math.min(d, 90 * dt); e.x += (dx / d) * pull; e.z += (dz / d) * pull; }
      }
      const ex = screenX(e.x);
      if (ex > W + 30 || ex + e.w < -10) continue;
      const overlap = hx1 >= ex && hx0 <= ex + e.w && Math.abs(e.depth - heroY) <= 5 && hz1 >= e.z && hz0 <= e.z + e.h - 1;
      if (!overlap) continue;
      if (e.kind === "spark") {
        e.alive = false; sparks++; onEvent({ type: "spark", sparks });
        if (!reducedMotion) for (let i = 0; i < 4; i++) particles.push({ x: ex + 2, y: e.depth - e.z - 3, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, color: "#fff3a8" });
      } else if (e.kind === "heart") {
        e.alive = false; if (hearts < cfg.hearts) hearts++; onEvent({ type: "heart", hearts });
      } else if (cfg.perk.stomp && vz < 0 && hz0 > e.z + e.h * 0.4 && (e.kind === "slime" || e.kind === "hedgehog" || e.kind === "frog")) {
        e.alive = false; vz = 170; grounded = false; sparks++; onEvent({ type: "stomp" }); onEvent({ type: "spark", sparks });
        if (!reducedMotion) for (let i = 0; i < 8; i++) particles.push({ x: ex + e.w / 2, y: e.depth - 2, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30, life: 0.4, color: "#ffffff" });
      } else if (invuln <= 0 && shieldLeft > 0) {
        shieldLeft--; invuln = 0.8; onEvent({ type: "shield" });
        if (!reducedMotion) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; particles.push({ x: heroX + 8, y: heroY - z - 7, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.35, color: "#e8f0ff" }); }
      } else if (invuln <= 0) {
        hearts--; hits++; invuln = 1.2 + cfg.perk.invulnBonus; emote = { kind: "dizzy", until: clock + 0.7 }; shake = reducedMotion ? 0 : 0.2; if (grounded) { vz = 90; grounded = false; }
        onEvent({ type: "hit", hearts });
        if (hearts <= 0) { finish(false); return; }
      }
    }
    if (screenX(chestX) <= heroX + 42) finish(true);
    emitTrail(heroX + 2, heroY - z - 8, -1);
  }

  /** Cosmetic trail behind the Friend: sparkles, or autumn leaves (Harvest Season). */
  function emitTrail(x: number, y: number, dir: number) {
    if (!cfg.trail || reducedMotion) return;
    if (cfg.trail === "spark") { if (Math.random() < 0.6) particles.push({ x, y: y + Math.random() * 6, vx: dir * (30 + Math.random() * 20), vy: (Math.random() - 0.5) * 10, life: 0.5, color: Math.random() < 0.5 ? "#ffd23f" : "#ff7eb6" }); }
    else if (Math.random() < 0.18) particles.push({ x: x + Math.random() * 6, y: y + Math.random() * 6, vx: dir * (18 + Math.random() * 16) + (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, life: 1.1, color: ["#d9531e", "#f08a24", "#ffd23f", "#b8401a"][Math.floor(Math.random() * 4)], g: 22 });
  }
  function finish(completed: boolean) {
    if (finished) return;
    finished = true; runFacing = "right";
    if (!completed) chestX = dist + Math.round(heroOff) + 40; // dropped next to the tired Friend
    onEvent({ type: "finish", result: { sparks, hits, completed } });
  }

  function drawRunHero() {
    const rows = heroRows(); if (!rows || !look) return;
    const b = spriteBounds(rows), hx = HERO_X + snap(heroOff);
    const shadowW = Math.max(4, (b.right - b.left + 1) - Math.round(z / 6));
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(hx + 8 - Math.floor(shadowW / 2), Math.round(heroY), shadowW, 2);
    const blink = invuln > 0 && !finished && !reducedMotion && Math.floor(clock * 14) % 2 === 0;
    let lift = 0;
    if (celebration && !reducedMotion) { const age = clock - celebration.t; lift = celebration.mood === "sad" ? 0 : Math.round(Math.abs(Math.sin(age * (celebration.mood === "great" ? 11 : 8))) * (celebration.mood === "great" ? 8 : 5)); }
    const hy = Math.round(heroY - 1 - b.bottom - z) - lift;
    if (look.torch && (runWeather.time === "night" || runWeather.time === "evening")) torchGlow(hx + 16, hy + 2, 26);
    const runPose: Facing = finished ? "down" : runFacing;
    if (!blink) { drawHero(ctx, rows, hx, hy, { ...look, moving: !finished, clock }, runPose); friendAt = { rows, x: hx, y: hy, facing: runPose, moving: !finished }; }
    heroExtras(hx, hy, b);
  }
  /** Shield ring, celebration (the find held up) and emote bubbles around the Friend. */
  function heroExtras(hx: number, hy: number, b: { top: number }) {
    if (shieldLeft > 0 && !finished) { // Bone Guard / Phase shield: a thin twinkling pixel ring
      const spin = reducedMotion ? 0 : clock * 1.6;
      for (let i = 0; i < 14; i++) { const a = spin + (i / 14) * Math.PI * 2; ctx.fillStyle = i % 2 ? "rgba(190,220,255,.55)" : "rgba(255,255,255,.8)"; ctx.fillRect(Math.round(hx + 8 + Math.cos(a) * 11), Math.round(hy + 8 + Math.sin(a) * 10), 1, 1); }
    }
    const headTop = hy + b.top - hatLift();
    if (celebration) {
      const age = clock - celebration.t, w = celebration.pix.rows[0].length, bob = reducedMotion ? 0 : Math.round(Math.sin(age * 6));
      if (celebration.mood === "sad") drawEmote(ctx, age < 0.9 ? "dots" : "sweat", hx + 8, headTop - 2);
      else { drawPixmap(ctx, celebration.pix, hx + 8 - Math.floor(w / 2), headTop - 3 - celebration.pix.rows.length + bob); if (age > 0.5) drawEmote(ctx, celebration.mood === "great" ? "star" : "heart", hx + 20, headTop - 6); }
    } else if (emote && clock < emote.until) drawEmote(ctx, emote.kind, hx + 8, headTop - 2);
  }
  /** Warm, soft torch light (additive radial gradient, flickers unless reduced motion). */
  function torchGlow(x: number, y: number, r: number) {
    const k = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(clock * 13) * Math.sin(clock * 7.3);
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * k);
    g.addColorStop(0, "rgba(255,190,90,.34)"); g.addColorStop(0.45, "rgba(255,150,60,.12)"); g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function drawRunChest() {
    const cx = screenX(chestX); if (cx > W + 20) return;
    const top = CHEST_DEPTH - 12;
    if (chestOpen && !reducedMotion) { ctx.fillStyle = "rgba(255,243,168,.35)"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35 + Math.sin(clock) * 0.05; ctx.beginPath(); ctx.moveTo(cx + 8, top + 4); ctx.lineTo(cx + 8 + Math.cos(a - 0.08) * 60, top + 4 + Math.sin(a - 0.08) * 60); ctx.lineTo(cx + 8 + Math.cos(a + 0.08) * 60, top + 4 + Math.sin(a + 0.08) * 60); ctx.fill(); } }
    drawPixmap(ctx, chestOpen ? CHEST_OPEN : CHEST, cx, top);
  }
  function drawRun() {
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));
    drawForest();
    const layers: { y: number; draw: () => void }[] = entities.filter(e => e.alive).map(e => ({ y: e.depth, draw: () => drawEntity(e) }));
    layers.push({ y: CHEST_DEPTH, draw: drawRunChest }, { y: heroY + 0.5, draw: drawRunHero });
    layers.sort((a, b) => a.y - b.y).forEach(l => l.draw());
    for (const p of particles) drawParticle(ctx, p);
    fx.drawRain(ctx); fx.drawOverlay(ctx, reducedMotion); restoreFriend();
    ctx.restore();
    ctx.fillStyle = "rgba(23,26,54,.72)"; ctx.fillRect(1, 1, Math.max(30, cfg.hearts * 9 + 5), 20); ctx.fillStyle = INK; ctx.fillRect(1, 21, Math.max(30, cfg.hearts * 9 + 5), 1);
    for (let i = 0; i < cfg.hearts; i++) drawPixmap(ctx, HEART, 4 + i * 9, 4, 1, i < hearts ? 1 : 0.25);
    drawPixmap(ctx, SPARK, 4, 13); drawNumber(ctx, sparks, 11, 13, "#fff3a8");
    const px0 = 70, px1 = 170; ctx.fillStyle = INK; ctx.fillRect(px0 - 1, 6, px1 - px0 + 2, 4); ctx.fillStyle = "#f1efe6"; ctx.fillRect(px0, 7, px1 - px0, 2);
    const prog = Math.min(1, dist / (RUN_LENGTH - 10)); ctx.fillStyle = "#7fcf4f"; ctx.fillRect(px0, 7, Math.round((px1 - px0) * prog), 2);
    ctx.fillStyle = "#b86b2b"; ctx.fillRect(px1 - 2, 4, 5, 5); ctx.fillStyle = INK; ctx.fillRect(px1 - 2, 6, 5, 1);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(px0 + Math.round((px1 - px0) * prog) - 1, 4, 3, 7); ctx.fillStyle = INK; ctx.fillRect(px0 + Math.round((px1 - px0) * prog), 5, 1, 5);
  }


  /* ---------------- crystal cave descent ---------------- */
  const caveHeroRows = () => {
    if (!sprites) return null;
    if (finished) return frameOf(sprites.idle, 5);
    return caveFacing === "down" ? sprites.idle[0] : frameOf(sprites.walk[caveFacing], 8);
  };
  function updateCave(dt: number) {
    if (finished) return;
    const rows = caveHeroRows(); const b = rows ? spriteBounds(rows) : { top: 2, bottom: 15, left: 3, right: 12 };
    // fall speed: glide, grip the rope (slower) or let it run (dive)
    const dive = moveY > 0 && !brake;
    // the deeper, the faster the rope runs
    const target = rescue ? 170 : brake ? 22 * cfg.perk.fallMult : dive ? 108 : 46 + Math.min(26, caveY / 55);
    fall += (target - fall) * Math.min(1, dt * 5);
    caveY = Math.min(CAVE_FLOOR, caveY + fall * dt);
    depth = Math.min(caveY - CAVE_HERO_Y, CAVE_CAM_MAX);
    // steer between the walls
    caveX += moveX * 74 * cfg.perk.moveMult * dt;
    // drafts push the Friend sideways
    for (const e of cave) if (e.kind === "gust" && e.alive && caveY - 6 >= e.y && caveY - 6 <= e.y + e.h) {
      caveX += e.dir * 50 * dt;
      if (e.state === 0) { e.state = 1; onEvent({ type: "whoosh" }); }
    }
    const zone = zoneAt(caveY); if (zone > caveZone) { caveZone = zone; onEvent({ type: "zone", index: zone }); }
    const midD = caveY - 8, lo = wallL(midD) + 1 - b.left, hi = wallR(midD) - 1 - b.right;
    caveX = Math.max(lo, Math.min(hi, caveX));
    caveFacing = moveX < 0 ? "left" : moveX > 0 ? "right" : "down";
    invuln = Math.max(0, invuln - dt); shake = Math.max(0, shake - dt);
    const hx0 = caveX + b.left + 1, hx1 = caveX + b.right - 1, hy1 = caveY - 1, hy0 = caveY - (b.bottom - b.top);
    const heroScreenY = caveY - depth;
    for (const e of cave) {
      if (!e.alive) continue;
      const below = e.y - caveY; // creatures wake up only when the Friend is close
      if (e.kind === "spider") e.y = e.base + Math.sin(clock * 1.7 + e.phase) * 13;
      if (e.kind === "cbat") { e.y = e.base + Math.sin(clock * 3 + e.phase) * 4; if (below < 120) { e.x += e.dir * 40 * dt; const l = wallL(e.y) + 2, r = wallR(e.y) - e.w - 2; if (e.x < l) { e.x = l; e.dir = 1; } if (e.x > r) { e.x = r; e.dir = -1; } } }
      if (e.kind === "slab") e.x = e.x0 + Math.sin(clock * 0.9 + e.phase) * e.amp;
      if (e.kind === "rock") {
        if (e.state === 0 && caveY >= e.base) { e.state = 1; e.t = 0; e.x = Math.round(Math.max(wallL(caveY) + 4, Math.min(wallR(caveY) - 12, caveX + (b.left + b.right) / 2 - 4 + (Math.random() - 0.5) * 6))); onEvent({ type: "rumble" }); }
        else if (e.state === 1) { e.t += dt; if (e.t > 0.9) { e.state = 2; e.y = depth - 12; } }
        else if (e.state === 2) { e.y += (fall + 150) * dt; if (e.y - depth > 175) e.alive = false; }
        if (e.state !== 2) continue;
      }
      if (e.kind === "gust") continue;
      if (e.kind === "beetle" && below < 140) { e.x += e.dir * 15 * dt; if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } if (e.x > e.x1) { e.x = e.x1; e.dir = -1; } }
      if (e.kind === "crystal" && cfg.perk.magnet > 0) {
        const dx = caveX + 8 - (e.x + 2), dy = caveY - 7 - (e.y + 3), d = Math.hypot(dx, dy);
        if (d < cfg.perk.magnet && d > 0.5) { const pull = Math.min(d, 90 * dt); e.x += (dx / d) * pull; e.y += (dy / d) * pull; }
      }
      if (rescue) continue;
      if (!(hx1 >= e.x && hx0 <= e.x + e.w - 1 && hy1 >= e.y && hy0 <= e.y + e.h - 1)) continue;
      if (e.kind === "crystal") {
        e.alive = false; sparks++; onEvent({ type: "spark", sparks });
        if (!reducedMotion) for (let i = 0; i < 4; i++) particles.push({ x: e.x + 2, y: e.y - depth + 3, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, color: "#bff3ff" });
      } else if (e.kind === "heart") {
        e.alive = false; if (hearts < cfg.hearts) hearts++; onEvent({ type: "heart", hearts });
      } else if (cfg.perk.stomp && dive && (e.kind === "ledge" || e.kind === "beetle" || e.kind === "slab")) {
        // Heavy Stomp: diving onto rock or a beetle smashes through it
        e.alive = false; sparks++; onEvent({ type: "stomp" }); onEvent({ type: "spark", sparks }); shake = reducedMotion ? 0 : 0.15;
        if (!reducedMotion) for (let i = 0; i < 12; i++) particles.push({ x: caveX + 8 + (Math.random() - 0.5) * 20, y: heroScreenY, vx: (Math.random() - 0.5) * 70, vy: -10 - Math.random() * 40, life: 0.5, color: i % 3 ? "#3d3556" : "#6a5f8a", g: 120 });
      } else if (invuln <= 0 && shieldLeft > 0) {
        shieldLeft--; invuln = 0.8; onEvent({ type: "shield" });
        if (!reducedMotion) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; particles.push({ x: caveX + 8, y: heroScreenY - 7, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.35, color: "#e8f0ff" }); }
      } else if (invuln <= 0) {
        hearts--; hits++; invuln = 1.2 + cfg.perk.invulnBonus; emote = { kind: "dizzy", until: clock + 0.7 }; shake = reducedMotion ? 0 : 0.2; fall = Math.min(fall, 30);
        caveX += (caveX + 8 < e.x + e.w / 2 ? -1 : 1) * 6;
        onEvent({ type: "hit", hearts });
        if (hearts <= 0) rescue = true; // the rope lets go: the Friend slides to the bottom safely
      }
    }
    if (caveY >= CAVE_FLOOR) {
      finished = true; fall = 0; caveFacing = "down"; onEvent({ type: "land" });
      caveChestX = caveX + 8 > 180 ? caveX - 26 : caveX + 30;
      if (!reducedMotion) for (let i = 0; i < 5; i++) particles.push({ x: caveX + 8, y: caveY - depth, vx: (Math.random() - 0.5) * 30, vy: -8, life: 0.3, color: "#6a5f8a" });
      onEvent({ type: "finish", result: { sparks, hits, completed: !rescue } });
      return;
    }
    emitTrail(caveX + 6, heroScreenY - 12, 0);
  }
  function drawCaveHero(lights: Light[]) {
    const rows = caveHeroRows(); if (!rows || !look) return;
    const b = spriteBounds(rows), hx = snap(caveX);
    let lift = 0;
    if (celebration && !reducedMotion) { const age = clock - celebration.t; lift = celebration.mood === "sad" ? 0 : Math.round(Math.abs(Math.sin(age * (celebration.mood === "great" ? 11 : 8))) * (celebration.mood === "great" ? 8 : 5)); }
    const feet = Math.round(caveY - depth), hy = feet - 1 - b.bottom - lift;
    // the rope, from the top of the screen down to the Friend (slack once it has landed)
    if (!rescue) {
      const rx = hx + 8, top = hy + b.top - 1, sway = reducedMotion || finished ? 0 : Math.sin(clock * 2) * (brake ? 0.3 : 1.2);
      for (let y = 0; y < top; y++) { const x = Math.round(rx + sway * (1 - y / Math.max(1, top))); ctx.fillStyle = INK; ctx.fillRect(x + 1, y, 1, 1); ctx.fillStyle = y % 4 === 0 ? "#a07a4a" : "#c8a070"; ctx.fillRect(x, y, 1, 1); }
    }
    if (finished) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(hx + b.left, feet, b.right - b.left + 1, 2); }
    const blink = invuln > 0 && !finished && !reducedMotion && Math.floor(clock * 14) % 2 === 0;
    const withLantern: HeroLook = { ...look, lantern: true, torch: false, moving: !finished, clock };
    if (!blink) { drawHero(ctx, rows, hx, hy, withLantern, caveFacing); friendAt = { rows, x: hx, y: hy, facing: caveFacing, moving: !finished }; }
    heroExtras(hx, hy, b);
    // the lantern lights the way down: a tall pool of light below the Friend
    const flick = reducedMotion ? 1 : 0.94 + 0.06 * Math.sin(clock * 11) * Math.sin(clock * 5.3);
    const reach = (52 + (look.torch ? 8 : 0)) * flick; // a carried torch widens the light
    lights.push({ x: hx + 8, y: hy + 30, r: reach, a: 1, sy: 1.5 });
    lights.push({ x: hx + 8, y: hy + 8, r: 26, a: 1 });
  }
  function drawCaveChest(lights: Light[]) {
    if (!finished) return;
    const cx = Math.round(caveChestX), top = Math.round(CAVE_FLOOR - depth) - 12;
    if (chestOpen && !reducedMotion) { ctx.fillStyle = "rgba(255,243,168,.35)"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35 + Math.sin(clock) * 0.05; ctx.beginPath(); ctx.moveTo(cx + 8, top + 4); ctx.lineTo(cx + 8 + Math.cos(a - 0.08) * 60, top + 4 + Math.sin(a - 0.08) * 60); ctx.lineTo(cx + 8 + Math.cos(a + 0.08) * 60, top + 4 + Math.sin(a + 0.08) * 60); ctx.fill(); } }
    drawPixmap(ctx, chestOpen ? CHEST_OPEN : CHEST, cx, top);
    lights.push({ x: cx + 8, y: top + 4, r: chestOpen ? 50 : 22, a: chestOpen ? 1 : 0.6 });
  }
  function drawCave() {
    const lights: Light[] = [];
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));
    const cam = snap(depth);
    drawCaveBack(ctx, cam, clock, reducedMotion, lights);
    drawCaveEntrance(ctx, cam, lights);
    drawCaveWalls(ctx, Math.floor(cam), clock, reducedMotion, lights);
    drawCaveFloor(ctx, cam, clock, reducedMotion, lights);
    for (const e of cave) drawCaveEntity(ctx, e, cam, clock, reducedMotion, lights);
    drawCaveChest(lights);
    drawCaveHero(lights);
    for (const p of particles) drawParticle(ctx, p);
    drawDarkness(ctx, lights, 0.8);
    // warm lantern tint on what the light touches
    {
      const hx = snap(caveX) + 8, hy = Math.round(caveY - depth) + 6, k = reducedMotion ? 1 : 0.95 + 0.05 * Math.sin(clock * 9);
      const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 58 * k);
      g.addColorStop(0, "rgba(255,196,120,.3)"); g.addColorStop(0.5, "rgba(255,160,80,.11)"); g.addColorStop(1, "rgba(255,140,60,0)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(hx - 60, hy - 60, 120, 140); ctx.restore();
    }
    drawCaveGlints(ctx, cave, cam, clock, reducedMotion); restoreFriend();
    ctx.restore();
    // HUD: hearts, crystals and a depth gauge
    ctx.fillStyle = "rgba(23,26,54,.72)"; ctx.fillRect(1, 1, Math.max(30, cfg.hearts * 9 + 5), 20); ctx.fillStyle = INK; ctx.fillRect(1, 21, Math.max(30, cfg.hearts * 9 + 5), 1);
    for (let i = 0; i < cfg.hearts; i++) drawPixmap(ctx, HEART, 4 + i * 9, 4, 1, i < hearts ? 1 : 0.25);
    drawPixmap(ctx, CRYSTAL, 4, 13); drawNumber(ctx, sparks, 11, 14, "#bff3ff");
    const gx = W - 8, gy0 = 26, gy1 = 134, prog = Math.min(1, caveY / CAVE_FLOOR);
    ctx.fillStyle = INK; ctx.fillRect(gx - 1, gy0 - 1, 4, gy1 - gy0 + 2); ctx.fillStyle = "#2a2438"; ctx.fillRect(gx, gy0, 2, gy1 - gy0);
    ctx.fillStyle = "#3fc8f0"; ctx.fillRect(gx, gy0, 2, Math.round((gy1 - gy0) * prog));
    ctx.fillStyle = "#b86b2b"; ctx.fillRect(gx - 1, gy1, 4, 3);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(gx - 2, gy0 + Math.round((gy1 - gy0) * prog) - 1, 6, 2);
  }

  /* ---------------- ruins gauntlet ---------------- */
  function drawRuins() {
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(0, 0, W + 2, H);
    ruins.draw(ctx, clock, reducedMotion, (x, y, facing: Dir, moving, blink) => {
      if (!sprites || !look) return;
      const rows = finished ? frameOf(sprites.idle, 5) : moving ? frameOf(sprites.walk[facing], 14) : facing === "down" ? frameOf(sprites.idle, 5) : sprites.walk[facing][0];
      const b = spriteBounds(rows);
      let lift = 0;
      if (celebration && !reducedMotion) { const age = clock - celebration.t; lift = celebration.mood === "sad" ? 0 : Math.round(Math.abs(Math.sin(age * (celebration.mood === "great" ? 11 : 8))) * (celebration.mood === "great" ? 8 : 5)); }
      const hy = y + 14 - b.bottom - lift;
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(x + b.left, y + 14, b.right - b.left + 1, 2);
      const ruinsPose: Facing = finished ? "down" : facing;
      if (!blink) { drawHero(ctx, rows, x, hy, { ...look, moving, clock }, ruinsPose); friendAt = { rows, x, y: hy, facing: ruinsPose, moving }; }
      heroExtras(x, hy, b);
    }, (x, y, open) => {
      if (open && !reducedMotion) { ctx.fillStyle = "rgba(255,243,168,.35)"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35 + Math.sin(clock) * 0.05; ctx.beginPath(); ctx.moveTo(x + 8, y + 4); ctx.lineTo(x + 8 + Math.cos(a - 0.08) * 60, y + 4 + Math.sin(a - 0.08) * 60); ctx.lineTo(x + 8 + Math.cos(a + 0.08) * 60, y + 4 + Math.sin(a + 0.08) * 60); ctx.fill(); } }
      drawPixmap(ctx, open ? CHEST_OPEN : CHEST, x, y);
    });
    for (const p of particles) drawParticle(ctx, p); restoreFriend();
    ctx.restore();
    // HUD: hearts, relic shards and the hourglass
    const hw = Math.max(30, ruins.maxHearts * 9 + 5);
    ctx.fillStyle = "rgba(23,26,54,.72)"; ctx.fillRect(1, 1, hw, 20); ctx.fillStyle = INK; ctx.fillRect(1, 21, hw, 1);
    for (let i = 0; i < ruins.maxHearts; i++) drawPixmap(ctx, HEART, 4 + i * 9, 4, 1, i < ruins.hearts ? 1 : 0.25);
    drawPixmap(ctx, SPARK, 4, 13); drawNumber(ctx, ruins.sparks, 11, 14, "#fff3a8");
    const t = ruins.timeLeft, px0 = 76, px1 = 176, low = t <= 10;
    ctx.fillStyle = "rgba(23,26,54,.72)"; ctx.fillRect(px0 - 14, 2, px1 - px0 + 30, 12);
    drawPixmap(ctx, HOURGLASS, px0 - 11, 4);
    ctx.fillStyle = INK; ctx.fillRect(px0 - 1, 6, px1 - px0 + 2, 4); ctx.fillStyle = "#3a2a1a"; ctx.fillRect(px0, 7, px1 - px0, 2);
    ctx.fillStyle = low && !reducedMotion && Math.floor(clock * 4) % 2 ? "#ff4d6d" : low ? "#ff8a5a" : "#ffd23f";
    ctx.fillRect(px0, 7, Math.round((px1 - px0) * (t / RUINS_TIME)), 2);
    drawNumber(ctx, Math.ceil(t), px1 + 4, 5, low ? "#ff8a8a" : "#fff3a8");
    // progress towards the altar (right edge)
    const gx = W - 8, gy0 = 26, gy1 = 134, prog = Math.min(1, ruins.progress);
    ctx.fillStyle = INK; ctx.fillRect(gx - 1, gy0 - 1, 4, gy1 - gy0 + 2); ctx.fillStyle = "#3a2a1a"; ctx.fillRect(gx, gy0, 2, gy1 - gy0);
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(gx, gy1 - Math.round((gy1 - gy0) * prog), 2, Math.round((gy1 - gy0) * prog));
    ctx.fillStyle = "#b86b2b"; ctx.fillRect(gx - 1, gy0 - 3, 4, 3);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(gx - 2, gy1 - Math.round((gy1 - gy0) * prog) - 1, 6, 2);
  }

  function frame(now: number) {
    if (destroyed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (!paused && !document.hidden) {
      clock += dt;
      if (mode === "run") updateRun(dt); else if (mode === "cave") updateCave(dt);
      else if (mode === "ruins") { ruins.update(dt, moveX, moveY, reducedMotion); finished = ruins.finished; invuln = Math.max(0, invuln - dt); shake = Math.max(0, shake - dt); }
      else updateCamp(dt);
      if (mode !== "cave" && mode !== "ruins") fx.update(dt, mode === "run" ? GROUND : 118, mode === "run" && !finished ? speed : 0, reducedMotion);
      if (mode === "camp" && !reducedMotion) emitFire(particles, dt, fx.level);
      for (const p of particles) { p.vy += (p.g ?? 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      particles = particles.filter(p => p.life > 0);
    }
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (mode === "camp") drawCamp(); else if (mode === "cave") drawCave(); else if (mode === "ruins") drawRuins(); else drawRun();
    if (paused) { ctx.fillStyle = "rgba(10,12,30,.45)"; ctx.fillRect(0, 0, W, H); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setSprites(next: HeroSprites) { sprites = next; },
    setLook(next: HeroLook) { look = next; },
    setPaused(next: boolean) { paused = next; },
    setReducedMotion(next: boolean) { reducedMotion = next; },
    showCamp() { mode = "camp"; particles = []; celebration = null; emote = null; idleFor = 0; campFacing = "down"; moveX = 0; moveY = 0; fx.set(campRain, true); onEvent({ type: "campWeather", rain: campRain }); },
    startRun(next: RunConfig) {
      cfg = next; mode = "run"; celebration = null; emote = null; shieldLeft = next.perk.shield; dist = 0; speed = 60; heroOff = 0; heroY = GROUND; runFacing = "right"; moveX = 0; moveY = 0;
      z = 0; vz = 0; grounded = true; airJumps = next.doubleJump ? 1 : 0;
      hearts = next.hearts; invuln = 0; sparks = 0; hits = 0; finished = false; chestOpen = false; shake = 0; particles = [];
      entities = buildLevel(next.seed, next.weather); chestX = RUN_LENGTH + 36;
      runWeather = next.weather; fx.set(next.weather.rain, true);
    },
    /** Start a Crystal Cave descent (lantern-lit, on a rope). */
    startCave(next: CaveConfig) {
      cfg = { ...cfg, hearts: next.hearts, seed: next.seed, trail: next.trail, perk: next.perk, doubleJump: false };
      mode = "cave"; celebration = null; emote = null; shieldLeft = next.perk.shield; moveX = 0; moveY = 0;
      depth = 0; caveY = CAVE_HERO_Y; fall = 30; caveX = 112; brake = false; caveFacing = "down"; rescue = false; caveZone = 0;
      hearts = next.hearts; invuln = 0; sparks = 0; hits = 0; finished = false; chestOpen = false; shake = 0; particles = [];
      cave = buildCave(mulberry32(next.seed)); fx.set("none", true);
      if (next.startAt) { caveY = next.startAt; depth = Math.min(caveY - CAVE_HERO_Y, CAVE_CAM_MAX); caveZone = zoneAt(caveY); }
    },
    /** Start a Sunken Ruins gauntlet (top-down, tile by tile, against the hourglass). */
    startRuins(next: CaveConfig) {
      cfg = { ...cfg, hearts: next.hearts, seed: next.seed, trail: null, perk: next.perk, doubleJump: false };
      mode = "ruins"; celebration = null; emote = null; shieldLeft = next.perk.shield; moveX = 0; moveY = 0;
      finished = false; chestOpen = false; shake = 0; particles = []; invuln = 0;
      ruins.start(mulberry32(next.seed), next.perk, next.hearts, next.startAt ?? 0); fx.set("none", true);
    },
    /** Harvest Season decorations in the camp. */
    setSeason(on: boolean) { season = on; },
    /** W A S D / arrows: dx, dy in -1..1. Walks in the camp; in the forest only dx is used. */
    setMove(dx: number, dy: number) { moveX = Math.sign(dx); moveY = Math.sign(dy); },
    /** Space / tap: jump, or double jump with Spring Boots. */
    jump() {
      if (mode === "cave") { if (!finished && !paused) brake = true; return true; }
      if (mode !== "run" || finished || paused) return false;
      if (grounded) { vz = JUMP_V; grounded = false; onEvent({ type: "jump", air: false }); return true; }
      if (airJumps > 0) { airJumps--; vz = JUMP_V * 0.85; onEvent({ type: "jump", air: true }); if (!reducedMotion) for (let i = 0; i < 5; i++) particles.push({ x: HERO_X + heroOff + 8, y: heroY - z, vx: (Math.random() - 0.5) * 40, vy: 20, life: 0.3, color: "#ffffff" }); return true; }
      return false;
    },
    /** S / ↓ in the forest: drop back to the ground faster. */
    drop() { if (mode === "run" && !grounded && !finished && !paused) vz = Math.min(vz, -280); },
    /** Releasing the jump key early gives a shorter hop. */
    release() { if (mode === "cave") brake = false; else if (mode === "run" && vz > 90) vz = 90; },
    openChest() { chestOpen = true; ruins.openChest(); },
    /** The Friend reacts to its find: holds it up and hops (happy/great), or droops (sad). */
    celebrate(pix: Pixmap, mood: "sad" | "happy" | "great") {
      celebration = { pix, mood, t: clock };
      const rs = ruins.heroScreen();
      const ax = mode === "cave" ? caveX + 8 : mode === "ruins" ? rs.x : HERO_X + heroOff + 8, ay = mode === "cave" ? caveY - depth - 20 : mode === "ruins" ? rs.y - 6 : heroY - 20;
      if (mood === "great" && !reducedMotion) for (let i = 0; i < 26; i++) particles.push({ x: ax, y: ay, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 60, life: 0.9 + Math.random() * 0.5, color: ["#ffd23f", "#ff5ad1", "#7fe0ff", "#b6f59a"][i % 4], g: 90 });
    },
    /** Show a short emote bubble above the Friend. */
    emote(kind: Emote, seconds = 1.5) { emote = { kind, until: clock + seconds }; },
    /** Set the camp weather now (the camp also changes weather by itself every 35–80 s). */
    setCampRain(next: Rain) { campRain = next; campTimer = 35 + Math.random() * 45; if (mode === "camp") fx.set(next); onEvent({ type: "campWeather", rain: next }); },
    destroy() { destroyed = true; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
  };
}

export type Engine = ReturnType<typeof createEngine>;
