/** Sunken Ruins for Rare Friends: Expeditions: a top-down TRAP GAUNTLET (the third, hardest mini-game).
 *
 * The Friend crosses an ancient temple tile by tile (W A S D / arrows, one tile per step, hold to keep
 * walking) from the entrance to the altar before the sand in the hourglass runs out. Every row is a
 * trap: spike plates rising in waves, dart traps firing across the hall, stone boulders rolling along
 * grooves, crumbling floor over pits and fire vents. Relic shards give XP. It gets harder in three halls.
 * Like the other places, the find is decided before the Friend sets out; the gauntlet only produces XP.
 * All art is drawn in code. */

import { HEART, INK, drawPixmap, type Pixmap } from "./art.js";
import type { Particle } from "./camp.js";
import type { PerkEffects } from "./perks.js";
import { hash } from "./scenery.js";

type Ctx = CanvasRenderingContext2D;
export type Dir = "up" | "down" | "left" | "right";

export const TILE = 16, COLS = 13, X0 = 16;
export const ROWS = 44;               // rows 0 … 43; row 0 is the entrance
export const ALTAR = 41;              // reaching this row ends the gauntlet
export const RUINS_TIME = 75;         // seconds of sand in the hourglass
const rowY = (r: number) => (ROWS - 1 - r) * TILE;  // world y of a row's top edge
const WORLD_H = ROWS * TILE;
const BELOW = 48; // entrance plaza below row 0, so the Friend starts clear of the SDK toolbar

export const RUINS_ZONES = [
  { from: 0, name: "Outer Courtyard", note: "spike plates, darts and pits" },
  { from: 14, name: "Hall of Boulders", note: "rolling stones and crumbling floor" },
  { from: 28, name: "Inner Sanctum", note: "fire vents, faster traps, no rest" },
] as const;
const zoneOf = (r: number) => (r >= 28 ? 2 : r >= 14 ? 1 : 0);

type LaneKind = "start" | "safe" | "spikes" | "arrows" | "boulders" | "crumble" | "fire" | "pits" | "stairs" | "altar";
type Lane = {
  kind: LaneKind; speed: number; phase: number; wave: number;
  blocked: boolean[]; pit: boolean[]; crack: number[];      // crack: -1 intact, ≥0 seconds until it falls
  side: -1 | 1; interval: number; next: number; arrows: number[]; dir: number;
  boulders: { x: number; alive: boolean }[];
};
type Shard = { col: number; row: number; alive: boolean; heart: boolean; phase: number };

export const RELIC: Pixmap = { palette: { k: INK, a: "#ffd23f", b: "#fff3a8", c: "#b87a10" }, rows: [
  "..kkk..", ".kbaak.", "kbacaak", "kaccaak", "kaacaak", ".kaaak.", "..kkk.."] };
export const HOURGLASS: Pixmap = { palette: { k: INK, g: "#e8d8b0", s: "#ffd23f" }, rows: [
  "kkkkk", "kgsgk", ".kgk.", "..k..", ".kgk.", "kgsgk", "kkkkk"] };

export type RuinsHooks = Readonly<{
  onEvent: (e: { type: string; [k: string]: unknown }) => void;
  tryShield: () => boolean;
  hitReact: () => void;
  particle: (p: Particle) => void;
}>;

export function createRuins(hooks: RuinsHooks) {
  let lanes: Lane[] = [], shards: Shard[] = [];
  let perk: PerkEffects = { extraHearts: 0, shield: 0, magnet: 0, moveMult: 1, fallMult: 1, stomp: false, invulnBonus: 0, xpMult: 1 };
  let col = 6, row = 0, fromCol = 6, fromRow = 0, tween = 1, facing: Dir = "up", cooldown = 0, lastDir = "";
  let safeCol = 6, safeRow = 0;
  let hearts = 3, maxHearts = 3, sparks = 0, hits = 0, invuln = 0, timeLeft = RUINS_TIME, finished = false, chestOpen = false, cam = 0, view = 0, time = 0, zone = 0, lastTick = 11;

  /* ---------- level ---------- */
  function build(rnd: () => number) {
    lanes = []; shards = [];
    const blank = (kind: LaneKind, speed = 1): Lane => ({ kind, speed, phase: rnd() * 10, wave: rnd() < 0.5 ? 1 : -1,
      blocked: Array(COLS).fill(false), pit: Array(COLS).fill(false), crack: Array(COLS).fill(-1),
      side: rnd() < 0.5 ? -1 : 1, interval: 2, next: 0.5 + rnd() * 1.5, arrows: [], dir: rnd() < 0.5 ? -1 : 1, boulders: [] });
    const shard = (c: number, r: number, heart = false) => shards.push({ col: c, row: r, alive: true, heart, phase: rnd() * 6 });
    let r = 0;
    const push = (l: Lane) => { lanes[r] = l; r++; };
    push(blank("start")); push(blank("start"));
    while (r < ALTAR - 2) {
      // traps run at 80% speed and ramp up gently from hall to hall (tuned ~25% easier after playtesting)
      const z = zoneOf(r), speed = 0.8 * (1 + z * 0.16);
      const pool: LaneKind[] = ["spikes", "spikes", "arrows", "arrows", "pits"];
      if (z >= 1) pool.push("boulders", "boulders", "boulders", "crumble", "crumble");
      if (z >= 2) pool.push("fire", "fire", "fire", "boulders", "spikes");
      const run = z === 0 ? 1 + Math.floor(rnd() * 2) : z === 1 ? 2 : 2 + Math.floor(rnd() * 2);
      let prev: LaneKind | null = null;
      for (let k = 0; k < run && r < ALTAR - 2; k++) {
        let kind = pool[Math.floor(rnd() * pool.length)];
        if (kind === prev && kind !== "spikes") kind = pool[Math.floor(rnd() * pool.length)];
        prev = kind;
        const l = blank(kind, speed);
        if (kind === "arrows") { l.interval = (2.2 - rnd() * 0.5) / speed; }
        if (kind === "boulders") {
          const n = z >= 2 && rnd() < 0.45 ? 2 : 1, span = COLS * TILE + 40;
          for (let b = 0; b < n; b++) l.boulders.push({ x: X0 - 20 + ((rnd() * 0.3 + b / n) * span), alive: true });
          l.interval = (46 + rnd() * 22) * speed; // px/s
        }
        if (kind === "pits" || kind === "crumble") {
          // holes with at least one safe way across
          const holes = kind === "pits" ? 3 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 2);
          for (let h = 0; h < holes; h++) l.pit[Math.floor(rnd() * COLS)] = true;
          if (l.pit.filter(Boolean).length > COLS - 5) l.pit.fill(false);
          if (kind === "crumble") for (let c = 0; c < COLS; c++) if (!l.pit[c]) l.crack[c] = 99;
        }
        if (kind !== "pits" && rnd() < 0.35) shard(Math.floor(rnd() * COLS), r);
        push(l);
      }
      // a resting row: broken pillars and relic shards
      const safe = blank("safe");
      const pillars = 1 + Math.floor(rnd() * 3);
      for (let p = 0; p < pillars; p++) safe.blocked[1 + Math.floor(rnd() * (COLS - 2))] = true;
      for (let s = 0; s < 1 + Math.floor(rnd() * 2); s++) { const c = Math.floor(rnd() * COLS); if (!safe.blocked[c]) shard(c, r); }
      if (r === 20 || r === 32) { const c = safe.blocked[6] ? 5 : 6; shard(c, r, true); }
      push(safe);
    }
    while (r < ALTAR) push(blank("stairs"));
    while (r < ROWS) push(blank("altar"));
    // no pits or shards on blocked tiles
    shards = shards.filter(s => !lanes[s.row].blocked[s.col] && !lanes[s.row].pit[s.col]);
  }

  /* ---------- rules ---------- */
  // spike cycle: down (safe) → WARNING (~0.8 s: the plate glows red, rattles and the tips creep out) → up (hurts)
  // slower cycle (≈4 s at the start): about 1.2 s of warning, then the spikes stay up for about 1 s
  const WARN_FROM = 0.46, UP_FROM = 0.74;
  const spikeT = (l: Lane, c: number) => { const P = 3.4 / l.speed; return (((time + l.phase + c * 0.16 * l.wave) % P) + P) % P / P; };
  const spikeState = (l: Lane, c: number) => { const t = spikeT(l, c); return t < WARN_FROM ? 0 : t < UP_FROM ? 1 : 2; }; // 0 down, 1 warning, 2 up
  /** 0 → 1 through the warning, for the animation. */
  const spikeWarn = (l: Lane, c: number) => Math.max(0, Math.min(1, (spikeT(l, c) - WARN_FROM) / (UP_FROM - WARN_FROM)));
  let warnCooldown = 0;
  const fireState = (l: Lane, c: number) => {
    const P = 0.95 / l.speed, g = Math.floor((time + l.phase) / P) % 3, into = ((time + l.phase) % P) / P;
    if ((c + (l.wave > 0 ? 0 : 1)) % 3 === g) return into < 0.22 ? 1 : 2; // this group is burning (brief smoke first)
    if ((c + (l.wave > 0 ? 0 : 1)) % 3 === (g + 1) % 3 && into > 0.75) return 1; // next group smokes
    return 0;
  };
  const heroPx = () => {
    const k = tween >= 1 ? 1 : tween;
    return { x: X0 + (fromCol + (col - fromCol) * k) * TILE, y: rowY(fromRow) + (rowY(row) - rowY(fromRow)) * k };
  };
  const hover = () => perk.fallMult < 1;

  function hurt(kind: "hit" | "fall") {
    if (invuln > 0 || finished) return;
    if (kind === "hit" && hooks.tryShield()) { invuln = 0.8; return; }
    hearts--; hits++; invuln = 1.2 + perk.invulnBonus; hooks.hitReact();
    hooks.onEvent({ type: "hit", hearts });
    if (kind === "fall") { fromCol = col = safeCol; fromRow = row = safeRow; tween = 1; }
    if (hearts <= 0) finish(false);
  }
  let completedRun = false;
  function finish(completed: boolean) {
    if (finished) return;
    finished = true; completedRun = completed; facing = "up";
    hooks.onEvent({ type: "finish", result: { sparks, hits, completed } });
  }
  function tryStep(dx: number, dy: number, dir: Dir) {
    const nc = col + dx, nr = row + dy;
    facing = dir;
    if (nc < 0 || nc >= COLS || nr < 0 || nr > ALTAR) return false;
    if (lanes[nr].blocked[nc]) return false;
    fromCol = col; fromRow = row; col = nc; row = nr; tween = 0;
    hooks.onEvent({ type: "step", surface: "stone" });
    return true;
  }

  function update(dt: number, moveX: number, moveY: number, still: boolean) {
    if (finished) return;
    time += dt; invuln = Math.max(0, invuln - dt); cooldown = Math.max(0, cooldown - dt);
    timeLeft = Math.max(0, timeLeft - dt);
    if (timeLeft <= 10 && Math.ceil(timeLeft) < lastTick) { lastTick = Math.ceil(timeLeft); hooks.onEvent({ type: "tick" }); }
    if (timeLeft <= 0) { finish(false); return; }
    // movement: one tile per step, holding keeps stepping
    // a measured pace: each step takes 0.16 s and a new one can start 0.26 s after the last (tapping too),
    // so the gauntlet is about reading the traps, not speed-running
    if (tween < 1) tween = Math.min(1, tween + dt / (0.16 / perk.moveMult));
    const want = moveY < 0 ? "up" : moveY > 0 ? "down" : moveX < 0 ? "left" : moveX > 0 ? "right" : "";
    if (!want) lastDir = "";
    if (tween >= 1 && want && cooldown <= 0) {
      const ok = want === "up" ? tryStep(0, 1, "up") : want === "down" ? tryStep(0, -1, "down") : want === "left" ? tryStep(-1, 0, "left") : tryStep(1, 0, "right");
      cooldown = ok ? 0.26 / perk.moveMult : 0.06; lastDir = want;
    }
    // arriving on a tile
    const lane = lanes[row];
    if (tween >= 1) {
      if (lane.kind === "crumble" && lane.crack[col] === 99) lane.crack[col] = 0.5;
      if (lane.kind === "safe" || lane.kind === "start" || lane.kind === "stairs") { safeCol = col; safeRow = row; }
      if (row >= ALTAR) { finish(true); return; }
    }
    // announce each hall once, the first time it is reached (walking back and forth must not re-trigger it)
    const z = zoneOf(row); if (z > zone) { zone = z; hooks.onEvent({ type: "zone", index: z }); }
    // traps tick
    const hp = heroPx(), hx0 = hp.x + 3, hx1 = hp.x + 13, hy0 = hp.y + 3, hy1 = hp.y + 14;
    for (let r = 0; r < ROWS; r++) {
      const l = lanes[r], ly = rowY(r);
      if (l.kind === "crumble") for (let c = 0; c < COLS; c++) if (l.crack[c] >= 0 && l.crack[c] < 99) {
        l.crack[c] -= dt;
        if (l.crack[c] <= 0) { l.crack[c] = -1; l.pit[c] = true; hooks.onEvent({ type: "crumble" });
          if (!still) for (let i = 0; i < 6; i++) hooks.particle({ x: X0 + c * TILE + 8, y: ly - cam + 8, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.5, color: "#a07a48", g: 80 }); }
      }
      if (l.kind === "arrows") {
        l.next -= dt;
        if (l.next <= 0) { l.next = l.interval; l.arrows.push(l.side < 0 ? X0 - 4 : X0 + COLS * TILE - 6); if (Math.abs(r - row) < 6) hooks.onEvent({ type: "arrow" }); }
        const v = 110 * l.speed * -l.side;
        l.arrows = l.arrows.map(x => x + v * dt).filter(x => x > X0 - 14 && x < X0 + COLS * TILE + 4);
        if (!finished && (r === row || (tween < 1 && r === fromRow))) for (const ax of l.arrows) if (ax + 10 >= hx0 && ax <= hx1 && ly + 8 >= hy0 && ly + 6 <= hy1) hurt("hit");
      }
      if (l.kind === "boulders") {
        const span = COLS * TILE + 40;
        for (const b of l.boulders) {
          if (!b.alive) continue;
          b.x += l.dir * l.interval * dt;
          if (b.x > X0 + COLS * TILE + 20) b.x -= span; if (b.x < X0 - 20) b.x += span;
          if ((r === row || (tween < 1 && r === fromRow)) && b.x + 6 >= hx0 && b.x - 6 <= hx1 && ly + 14 >= hy0 && ly + 2 <= hy1 && invuln <= 0) {
            if (perk.stomp) { b.alive = false; sparks++; hooks.onEvent({ type: "stomp" }); hooks.onEvent({ type: "spark", sparks });
              if (!still) for (let i = 0; i < 10; i++) hooks.particle({ x: b.x, y: ly - cam + 8, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 40, life: 0.5, color: i % 2 ? "#8a7a60" : "#b8a680", g: 120 }); }
            else hurt("hit");
          }
        }
      }
    }
    // a metal rattle when spikes on or right next to the Friend's tile start their warning
    warnCooldown = Math.max(0, warnCooldown - dt);
    if (warnCooldown <= 0) for (let dr = -1; dr <= 1; dr++) {
      const l = lanes[row + dr]; if (!l || l.kind !== "spikes") continue;
      for (let dc = -1; dc <= 1; dc++) { const c = col + dc; if (c < 0 || c >= COLS) continue; const w = spikeWarn(l, c); if (w > 0 && w < 0.12) { hooks.onEvent({ type: "spikewarn" }); warnCooldown = 0.5; dr = 2; break; } }
    }
    // standing traps (checked on the tile the Friend is mostly on)
    const onRow = tween < 0.5 ? fromRow : row, onCol = tween < 0.5 ? fromCol : col, here = lanes[onRow];
    if (here.kind === "spikes" && spikeState(here, onCol) === 2) hurt("hit");
    if (here.kind === "fire" && fireState(here, onCol) === 2) hurt("hit");
    if ((here.kind === "pits" || here.kind === "crumble") && here.pit[onCol] && tween >= 0.5 && !hover()) hurt("fall");
    // relic shards and hearts
    const reach = perk.magnet >= 16 ? 1 : 0;
    for (const s of shards) {
      if (!s.alive || Math.abs(s.row - onRow) > reach || Math.abs(s.col - onCol) > reach) continue;
      s.alive = false;
      if (s.heart) { if (hearts < maxHearts) hearts++; hooks.onEvent({ type: "heart", hearts }); }
      else { sparks++; hooks.onEvent({ type: "spark", sparks });
        if (!still) for (let i = 0; i < 4; i++) hooks.particle({ x: X0 + s.col * TILE + 8, y: rowY(s.row) - cam + 8, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, color: "#fff3a8" }); }
    }
    // camera: the Friend stays in the lower third so the traps ahead are visible
    const target = Math.max(0, Math.min(WORLD_H - 160 + BELOW, heroPx().y + 8 - 100));
    cam += (target - cam) * Math.min(1, dt * 8);
  }

  /* ---------- drawing ---------- */
  function floorTile(ctx: Ctx, x: number, y: number, r: number, c: number) {
    const h = hash(r * 31.7 + c * 7.3), alt = (r + c) % 2 === 0;
    ctx.fillStyle = alt ? "#c8a26a" : "#bf9860"; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#d8b27a"; ctx.fillRect(x + 1, y + 1, TILE - 2, 1);
    ctx.fillStyle = "#8a6a40"; ctx.fillRect(x, y + TILE - 1, TILE, 1); ctx.fillRect(x + TILE - 1, y, 1, TILE);
    if (h < 0.18) { ctx.fillStyle = "#9a7648"; ctx.fillRect(x + 4, y + 6, 5, 1); ctx.fillRect(x + 8, y + 7, 3, 1); ctx.fillRect(x + 10, y + 8, 1, 2); }
    else if (h < 0.26) { ctx.fillStyle = "#6f8a4a"; ctx.fillRect(x + 2, y + 11, 3, 2); ctx.fillStyle = "#8aa85a"; ctx.fillRect(x + 3, y + 11, 1, 1); }
    else if (h > 0.93) { ctx.fillStyle = "#a07a48"; ctx.fillRect(x + 5, y + 4, 6, 6); ctx.fillStyle = "#c8a26a"; ctx.fillRect(x + 6, y + 5, 4, 4); ctx.fillStyle = "#8a6a40"; ctx.fillRect(x + 7, y + 6, 2, 2); } // carved glyph
  }
  function pitTile(ctx: Ctx, x: number, y: number) {
    ctx.fillStyle = "#5a3f24"; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(x + 1, y + 2, TILE - 2, TILE - 2);
    ctx.fillStyle = "#120b05"; ctx.fillRect(x + 3, y + 5, TILE - 6, TILE - 7);
    ctx.fillStyle = INK; ctx.fillRect(x, y, TILE, 1);
  }
  const HOLES = [[3, 4], [9, 4], [6, 9], [3, 12], [11, 11]] as const;
  function drawSpikes(ctx: Ctx, x: number, y: number, st: number, warn: number, clock: number, still: boolean) {
    // warning: a calm, readable tremble (a 1 px nudge a few times a second, a little faster near the end)
    // while cracks spread and grit crumbles out, as if something pushes from below
    const k = st === 1 ? warn : 0;
    const beat = Math.floor(clock * (4 + k * 4) + x * 0.05) % 2;
    const sx = st === 1 && !still && k > 0.15 ? (beat ? 1 : 0) : 0;
    const px = x + sx, py = y;
    ctx.fillStyle = "#6f7484"; ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = "#8a90a2"; ctx.fillRect(px + 1, py + 1, TILE - 2, 1);
    ctx.fillStyle = "#555a68"; ctx.fillRect(px + 1, py + TILE - 2, TILE - 2, 1);
    for (const [dx, dy] of HOLES) { ctx.fillStyle = "#2a2e38"; ctx.fillRect(px + dx, py + dy, 2, 2); }
    if (st === 1) {
      // hairline cracks spread from the holes
      if (k > 0.3) { ctx.fillStyle = "#33363f"; ctx.fillRect(px + 5, py + 5, 3, 1); ctx.fillRect(px + 8, py + 6, 1, 3); ctx.fillRect(px + 4, py + 10, 2, 1); ctx.fillRect(px + 10, py + 9, 1, 2); }
      if (k > 0.6) { ctx.fillRect(px + 11, py + 5, 2, 1); ctx.fillRect(px + 2, py + 7, 1, 2); ctx.fillRect(px + 7, py + 12, 3, 1); }
      // grit and sand jumping out of the holes and trickling off the edges
      if (!still) {
        const n = k < 0.3 ? 1 : k < 0.6 ? 2 : 4;
        for (const [dx, dy] of HOLES) for (let g = 0; g < n; g++) {
          const t = (clock * (0.9 + g * 0.25) + dx * 0.37 + dy * 0.21 + g * 0.5) % 1, hop = Math.sin(t * Math.PI) * (1.5 + k * 2);
          ctx.fillStyle = g % 2 ? "#e8dcc0" : "#b8ad9c";
          ctx.fillRect(px + dx + (g % 2 ? 1 : 0) + Math.round((t - 0.5) * 3), py + dy - Math.round(hop), 1, 1);
        }
        for (let g = 0; g < n; g++) { const t = (clock * 0.8 + g * 0.31 + x * 0.013) % 1; ctx.fillStyle = "rgba(203,184,154,.8)"; ctx.fillRect(px + 2 + ((g * 5 + x) % 12), py + TILE - 1 + Math.round(t * 3), 1, 1); }
      }
      // at the very end the tips peek out
      if (k > 0.82) for (const [dx, dy] of HOLES) { ctx.fillStyle = INK; ctx.fillRect(px + dx - 1, py + dy - 1, 4, 1); ctx.fillStyle = "#e8ecf8"; ctx.fillRect(px + dx, py + dy - 1, 2, 1); }
      return;
    }
    if (st === 0) return;
    for (const [dx, dy] of HOLES) {
      ctx.fillStyle = INK; ctx.fillRect(px + dx - 1, py + dy - 3, 4, 4); ctx.fillStyle = "#dfe4f0"; ctx.fillRect(px + dx, py + dy - 4, 2, 4); ctx.fillStyle = "#ffffff"; ctx.fillRect(px + dx, py + dy - 4, 1, 2);
    }
  }
  function drawVent(ctx: Ctx, x: number, y: number) {
    ctx.fillStyle = "#4a3a2a"; ctx.fillRect(x + 3, y + 3, 10, 10);
    ctx.fillStyle = "#2a1c10"; for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, y + 4 + i * 3, 8, 2);
  }
  function drawFlame(ctx: Ctx, x: number, y: number, st: number, clock: number) {
    if (st === 1) { ctx.fillStyle = "rgba(90,80,70,.55)"; ctx.fillRect(x + 6, y + 2 - Math.floor((clock * 20) % 5), 4, 4); return; }
    const f = Math.floor(clock * 14) % 2;
    ctx.fillStyle = "#ff5a1a"; ctx.fillRect(x + 3, y - 6, 10, 18); ctx.fillRect(x + 5, y - 10 - f, 6, 4);
    ctx.fillStyle = "#ffa63a"; ctx.fillRect(x + 5, y - 5, 6, 15); ctx.fillStyle = "#fff3a8"; ctx.fillRect(x + 6, y + 1, 4, 8);
  }
  function drawBoulder(ctx: Ctx, x: number, y: number, rot: number) {
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(x) - 6, y + 13, 13, 2);
    const cx = Math.round(x), cy = y + 8;
    for (let dy = -7; dy <= 7; dy++) { const w = Math.round(Math.sqrt(49 - dy * dy)); ctx.fillStyle = INK; ctx.fillRect(cx - w - 1, cy + dy, w * 2 + 3, 1); ctx.fillStyle = dy < -2 ? "#b8a680" : dy < 3 ? "#9a8a68" : "#7a6c50"; ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
    ctx.fillStyle = "#6a5c44"; const a = rot; for (let k = -5; k <= 5; k++) ctx.fillRect(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k * 0.6), 1, 1);
    ctx.fillStyle = "#d8c8a0"; ctx.fillRect(cx - 3, cy - 5, 3, 1);
  }
  /** A carved serpent head in the wall; its eyes and mouth glow red just before it fires. */
  function drawTrap(ctx: Ctx, x: number, y: number, side: number, warn: boolean) {
    ctx.fillStyle = INK; ctx.fillRect(x, y + 2, 8, 12);
    ctx.fillStyle = "#7a8a5a"; ctx.fillRect(x + 1, y + 3, 6, 10); ctx.fillStyle = "#9aac72"; ctx.fillRect(x + 1, y + 3, 6, 1);
    ctx.fillStyle = warn ? "#ff4d6d" : "#2a1c10"; ctx.fillRect(x + 2, y + 5, 1, 1); ctx.fillRect(x + 5, y + 5, 1, 1);
    ctx.fillStyle = warn ? "#ffb0b0" : "#1a1008"; ctx.fillRect(side < 0 ? x + 5 : x + 1, y + 7, 2, 3);
  }
  function drawWalls(ctx: Ctx, clock: number) {
    const first = Math.floor(view / TILE);
    for (let r = first; r < first + 12; r++) {
      const y = r * TILE - view, h = hash(r * 5.1);
      for (const x of [0, X0 + COLS * TILE]) {
        ctx.fillStyle = "#a88658"; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#c8a26a"; ctx.fillRect(x + 1, y + 1, TILE - 2, 1);
        ctx.fillStyle = "#6a4f30"; ctx.fillRect(x, y + TILE - 1, TILE, 1); ctx.fillRect(x + (r % 2 ? 7 : 3), y, 1, TILE);
        if (h < 0.3) { ctx.fillStyle = "#6a4f30"; ctx.fillRect(x + 4, y + 4, 8, 1); ctx.fillRect(x + 4, y + 4, 1, 6); ctx.fillRect(x + 7, y + 7, 5, 1); } // glyphs
        if (hash(r * 2.7 + x) < 0.25) { ctx.fillStyle = "#4f7a3a"; const vx = x === 0 ? TILE - 3 : 1; ctx.fillRect(x + vx, y, 2, 10); ctx.fillStyle = "#7fa84a"; ctx.fillRect(x + vx, y + 3, 1, 1); ctx.fillRect(x + vx + 1, y + 7, 1, 1); }
      }
    }
    ctx.fillStyle = INK; ctx.fillRect(X0 - 1, 0, 1, 160); ctx.fillRect(X0 + COLS * TILE, 0, 1, 160);
    void clock;
  }
  function drawAltar(ctx: Ctx, clock: number, still: boolean) {
    const top = rowY(ROWS - 1) - view, altarY = rowY(ALTAR) - view;
    if (altarY < -40) return;
    // temple wall with a great doorway and a sun disk
    ctx.fillStyle = "#a88658"; ctx.fillRect(X0, top, COLS * TILE, (ROWS - 1 - ALTAR) * TILE);
    ctx.fillStyle = "#6a4f30"; for (let yy = top; yy < altarY; yy += 8) ctx.fillRect(X0, yy + 7, COLS * TILE, 1);
    const mid = X0 + (COLS * TILE) / 2;
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(mid - 20, top + 8, 40, altarY - top - 8);
    ctx.fillStyle = "#ffd23f"; const glow = still ? 1 : 0.8 + 0.2 * Math.sin(clock * 2);
    ctx.globalAlpha = glow; ctx.fillRect(mid - 6, top + 14, 12, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff3a8"; ctx.fillRect(mid - 3, top + 17, 6, 6);
    for (const px of [mid - 44, mid + 36]) { ctx.fillStyle = INK; ctx.fillRect(px - 1, top, 10, altarY - top); ctx.fillStyle = "#d8b27a"; ctx.fillRect(px, top, 8, altarY - top); ctx.fillStyle = "#a88658"; ctx.fillRect(px + 6, top, 2, altarY - top); }
    // altar dais and the chest on it
    ctx.fillStyle = INK; ctx.fillRect(mid - 18, altarY - 5, 36, 6); ctx.fillStyle = "#e0c088"; ctx.fillRect(mid - 17, altarY - 4, 34, 4);
  }

  function draw(ctx: Ctx, clock: number, still: boolean, drawHeroAt: (x: number, y: number, facing: Dir, moving: boolean, blink: boolean) => void, chest: (x: number, y: number, open: boolean) => void) {
    view = Math.round(cam); // one whole-pixel camera per frame, so rows, walls and the altar never leave seams
    const first = Math.max(0, Math.floor(view / TILE) - 1);
    const rowsOnScreen: number[] = [];
    for (let wy = first; wy < first + 12; wy++) { const r = ROWS - 1 - wy; if (r >= -3 && r < ROWS) rowsOnScreen.push(r); }
    // floor and ground traps
    for (const r of rowsOnScreen) {
      const y = Math.round(rowY(r) - view);
      if (r < 0) { // entrance plaza and steps
        for (let c = 0; c < COLS; c++) { floorTile(ctx, X0 + c * TILE, y, r, c); if (r === -1) { ctx.fillStyle = "#e0c088"; ctx.fillRect(X0 + c * TILE, y, TILE, 2); } }
        continue;
      }
      const l = lanes[r];
      for (let c = 0; c < COLS; c++) {
        const x = X0 + c * TILE;
        if (l.kind === "altar") {
          if (r === ALTAR) { floorTile(ctx, x, y, r, c); ctx.fillStyle = "rgba(255,230,170,.28)"; ctx.fillRect(x, y, TILE, TILE); }
          continue;
        }
        if (l.pit[c]) { pitTile(ctx, x, y); continue; }
        floorTile(ctx, x, y, r, c);
        if (l.kind === "stairs") { ctx.fillStyle = "#e0c088"; ctx.fillRect(x, y, TILE, 3); ctx.fillStyle = "#8a6a40"; ctx.fillRect(x, y + 3, TILE, 1); }
        if (l.kind === "boulders") { ctx.fillStyle = "#a88658"; ctx.fillRect(x, y + 6, TILE, 4); ctx.fillStyle = "#8a6a40"; ctx.fillRect(x, y + 10, TILE, 1); }
        if (l.kind === "spikes") drawSpikes(ctx, x, y, spikeState(l, c), spikeWarn(l, c), clock, still);
        if (l.kind === "fire") drawVent(ctx, x, y);
        if (l.kind === "crumble" && l.crack[c] !== -1) {
          const shake = l.crack[c] < 99 && !still ? Math.round(Math.sin(clock * 60 + c)) : 0;
          ctx.fillStyle = "#6a4f30"; ctx.fillRect(x + 3 + shake, y + 3, 1, 5); ctx.fillRect(x + 4 + shake, y + 7, 5, 1); ctx.fillRect(x + 9 + shake, y + 8, 1, 5); ctx.fillRect(x + 11, y + 2, 1, 3);
          if (l.crack[c] < 99) { ctx.fillStyle = "rgba(42,28,16,.35)"; ctx.fillRect(x, y, TILE, TILE); }
        }
        if (l.blocked[c]) { // broken pillar
          ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x + 2, y + 12, 13, 3);
          ctx.fillStyle = INK; ctx.fillRect(x + 2, y - 6, 12, 19); ctx.fillStyle = "#d8b27a"; ctx.fillRect(x + 3, y - 5, 10, 17);
          ctx.fillStyle = "#a88658"; ctx.fillRect(x + 10, y - 5, 3, 17); ctx.fillRect(x + 3, y + 3, 10, 1);
          ctx.fillStyle = "#e8d0a0"; ctx.fillRect(x + 3, y - 5, 10, 2);
        }
      }
      if (l.kind === "arrows") { ctx.fillStyle = "#9a7648"; ctx.fillRect(X0, y + 6, COLS * TILE, 4); ctx.fillStyle = "#7a5a34"; ctx.fillRect(X0, y + 7, COLS * TILE, 2); }
    }
    drawWalls(ctx, clock);
    for (const r of rowsOnScreen) { const l = lanes[r]; if (l && l.kind === "arrows") drawTrap(ctx, l.side < 0 ? X0 - 9 : X0 + COLS * TILE + 1, Math.round(rowY(r) - view), l.side, l.next < 0.45); }
    drawAltar(ctx, clock, still);
    // relic shards and hearts
    for (const s of shards) {
      if (!s.alive) continue;
      const y = Math.round(rowY(s.row) - view); if (y < -16 || y > 170) continue;
      const bob = still ? 0 : Math.round(Math.sin(clock * 4 + s.phase));
      if (s.heart) drawPixmap(ctx, HEART, X0 + s.col * TILE + 4, y + 4 + bob);
      else drawPixmap(ctx, RELIC, X0 + s.col * TILE + 4, y + 4 + bob);
    }
    // moving traps and the Friend, back to front
    const hp = heroPx();
    const movers = (front: boolean) => {
      for (const r of rowsOnScreen) {
        const l = lanes[r]; if (!l) continue;
        const y = Math.round(rowY(r) - view), isFront = rowY(r) > hp.y;
        if (isFront !== front) continue;
        if (l.kind === "boulders") for (const b of l.boulders) if (b.alive) drawBoulder(ctx, b.x, y, still ? 0 : (b.x / 7) * l.dir);
        if (l.kind === "arrows") for (const ax of l.arrows) { const dirX = -l.side; ctx.fillStyle = "#6b4a2b"; ctx.fillRect(Math.round(ax), y + 7, 10, 1); ctx.fillStyle = "#dfe4f0"; ctx.fillRect(dirX > 0 ? Math.round(ax) + 10 : Math.round(ax) - 2, y + 6, 2, 3); ctx.fillStyle = "#ff4d6d"; ctx.fillRect(dirX > 0 ? Math.round(ax) : Math.round(ax) + 8, y + 6, 2, 1); ctx.fillRect(dirX > 0 ? Math.round(ax) : Math.round(ax) + 8, y + 8, 2, 1); }
        if (l.kind === "fire") for (let c = 0; c < COLS; c++) { const st = fireState(l, c); if (st) drawFlame(ctx, X0 + c * TILE, y, st, clock); }
      }
    };
    movers(false);
    if (finished && completedRun) { const cx = X0 + 6 * TILE, cy = Math.round(rowY(ALTAR) - view) - 17; chest(cx, cy, chestOpen); }
    else if (finished) { const cx = Math.round(hp.x) + (col >= COLS - 2 ? -18 : 18), cy = Math.round(hp.y - view) + 3; chest(cx, cy, chestOpen); } // the guardians hand over the find
    const blink = invuln > 0 && !finished && !still && Math.floor(clock * 14) % 2 === 0;
    drawHeroAt(Math.round(hp.x), Math.round(hp.y - view), facing, tween < 1, blink);
    movers(true);
    // warm light shafts and floating dust
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const sx = 40 + i * 70 + (still ? 0 : Math.sin(clock * 0.3 + i) * 6);
      ctx.fillStyle = "rgba(255,220,150,.05)"; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 22, 0); ctx.lineTo(sx + 60, 160); ctx.lineTo(sx + 30, 160); ctx.fill();
    }
    ctx.restore();
    if (!still) for (let i = 0; i < 14; i++) { const dx = (i * 53 + clock * (4 + (i % 3))) % 240, dy = (i * 37 + clock * 3) % 160; ctx.fillStyle = "rgba(255,240,200,.45)"; ctx.fillRect(Math.round(dx), Math.round(dy), 1, 1); }
  }

  return {
    start(seed: () => number, nextPerk: PerkEffects, startHearts: number, startRow = 0) {
      perk = nextPerk; build(seed);
      col = fromCol = safeCol = 6; row = fromRow = safeRow = Math.max(0, Math.min(ALTAR - 1, startRow)); tween = 1; facing = "up"; cooldown = 0; lastDir = "";
      hearts = maxHearts = startHearts; sparks = 0; hits = 0; invuln = 0; timeLeft = RUINS_TIME; finished = false; chestOpen = false; time = 0; zone = 0; lastTick = 11;
      cam = Math.max(0, Math.min(WORLD_H - 160 + BELOW, rowY(row) + 8 - 100));
    },
    update, draw,
    openChest() { chestOpen = true; },
    /** Where the Friend stands on screen (for celebration effects). */
    heroScreen() { const p = heroPx(); return { x: p.x + 8, y: p.y - cam }; },
    get hearts() { return hearts; }, get maxHearts() { return maxHearts; }, get sparks() { return sparks; },
    get timeLeft() { return timeLeft; }, get finished() { return finished; }, get progress() { return row / ALTAR; },
  };
}
export type Ruins = ReturnType<typeof createRuins>;
