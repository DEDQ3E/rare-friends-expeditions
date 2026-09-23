/** Weather for Rare Friends: Expeditions: time of day, rain levels and storms.
 * Purely visual plus an XP multiplier; weather never changes the RF odds. */

import { INK } from "./art.js";

export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Rain = "none" | "light" | "heavy" | "storm";
export type Weather = Readonly<{ time: TimeOfDay; rain: Rain }>;

export const TIMES: readonly TimeOfDay[] = ["morning", "day", "evening", "night"];
export const TIME_LABEL: Readonly<Record<TimeOfDay, string>> = { morning: "Morning", day: "Day", evening: "Evening", night: "Night" };
export const RAIN_LABEL: Readonly<Record<Rain, string>> = { none: "Clear", light: "Light rain", heavy: "Heavy rain", storm: "Thunderstorm" };
/** XP multiplier for sparks and run bonuses. Rain is harder to see through, so it pays more XP. */
export const XP_MULT: Readonly<Record<Rain, number>> = { none: 1, light: 1.1, heavy: 1.2, storm: 1.3 };
const RAIN_LEVEL: Readonly<Record<Rain, number>> = { none: 0, light: 0.35, heavy: 0.75, storm: 1 };

function pick<T extends string>(weights: Readonly<Record<T, number>>, rnd: () => number): T {
  const entries = Object.entries(weights) as [T, number][];
  let r = rnd() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
}
export function rollRain(rnd: () => number = Math.random): Rain { return pick({ none: 0.5, light: 0.22, heavy: 0.16, storm: 0.12 }, rnd); }
export function rollWeather(rnd: () => number = Math.random): Weather { return { time: TIMES[Math.floor(rnd() * TIMES.length)], rain: rollRain(rnd) }; }

export type ForestPalette = Readonly<{
  sky: readonly [string, string, string, string]; horizon: string; cloud: string; mountain: string; mountainHi: string; hill: string;
  trunk: string; canopy: string; canopyHi: string; canopyLo: string; grass: string; grassDark: string; dirt: string; dirtDark: string; pebble: string;
  far: string; birch: string; flowers: readonly string[];
}>;
export const FOREST_PALETTES: Readonly<Record<TimeOfDay, ForestPalette>> = {
  morning: { sky: ["#f7a98b", "#fbbf9d", "#fdd4b4", "#fee6cf"], horizon: "#fee6cf", cloud: "#fff4ea", mountain: "#b39ad2", mountainHi: "#d6c4ea", hill: "#58a766",
    trunk: "#7a4a26", canopy: "#3b8c48", canopyHi: "#5fb866", canopyLo: "#2c7039", grass: "#8fd65a", grassDark: "#69b546", dirt: "#735033", dirtDark: "#5a3c24", pebble: "#efe2cf", far: "#86a88c", birch: "#f3ece0", flowers: ["#ffffff", "#ff9ec4", "#fff3a8"] },
  day: { sky: ["#7cc8ff", "#94d3ff", "#addfff", "#c6eaff"], horizon: "#c6eaff", cloud: "#ffffff", mountain: "#8a9be0", mountainHi: "#a8b6ee", hill: "#3e9b5a",
    trunk: "#6b3f1f", canopy: "#2f7d3c", canopyHi: "#47a655", canopyLo: "#256632", grass: "#7fcf4f", grassDark: "#5aa83a", dirt: "#6b4a2b", dirtDark: "#553820", pebble: "#e8e0d0", far: "#5f9d7c", birch: "#eeeae0", flowers: ["#ffffff", "#ff7eb6", "#fff3a8", "#9fd8ff"] },
  evening: { sky: ["#3b2a5c", "#7a3f6e", "#c4586a", "#f08a5d"], horizon: "#f5a06a", cloud: "#f3b3a0", mountain: "#6a5a9a", mountainHi: "#8f7ab8", hill: "#2f7a4a",
    trunk: "#5a3218", canopy: "#245f36", canopyHi: "#3a8047", canopyLo: "#1b4a2a", grass: "#6aae45", grassDark: "#4a8a34", dirt: "#5c3e25", dirtDark: "#462e1b", pebble: "#e0c2a8", far: "#46607a", birch: "#e6c9b8", flowers: ["#ffd9e8", "#ffb36b", "#fff3a8"] },
  night: { sky: ["#0b1026", "#131a3c", "#1b2450", "#232f66"], horizon: "#2a3670", cloud: "#4a5480", mountain: "#2b3566", mountainHi: "#3d4a82", hill: "#1f4a3a",
    trunk: "#3e2414", canopy: "#173d2b", canopyHi: "#255a3a", canopyLo: "#10301f", grass: "#3f7a3a", grassDark: "#2f5e2c", dirt: "#3e2c1c", dirtDark: "#2e2014", pebble: "#8a8aa8", far: "#1c3246", birch: "#9a9ab4", flowers: ["#b8b8e0", "#8f7ab8", "#d8d8ff"] },
};

type Drop = { x: number; y: number; v: number; len: number; land: number };
type Splash = { x: number; y: number; life: number };

/** Rain, splashes, overcast darkening and lightning, shared by the camp and the forest. */
export function createRainFx(onThunder: () => void) {
  let rain: Rain = "none", level = 0, target = 0;
  let drops: Drop[] = [], splashes: Splash[] = [];
  let flash = 0, bolt: { pts: [number, number][]; life: number } | null = null, nextBolt = 4;

  function spawn(top: number, groundY: number): Drop {
    return { x: Math.random() * 300 - 20, y: top, v: 170 + Math.random() * 70, len: 3 + Math.floor(Math.random() * 4), land: groundY + Math.random() * (160 - groundY) };
  }
  return {
    get rain() { return rain; },
    get level() { return level; },
    set(next: Rain, instant = false) { rain = next; target = RAIN_LEVEL[next]; if (instant) { level = target; drops = []; splashes = []; } if (next === "storm") nextBolt = 1.5 + Math.random() * 2; },
    update(dt: number, groundY: number, scroll: number, reducedMotion: boolean) {
      level += (target - level) * Math.min(1, dt * 0.5);
      const want = Math.round(level * (reducedMotion ? 90 : 230));
      while (drops.length < want) drops.push(spawn(-Math.random() * 160, groundY));
      if (drops.length > want) drops.length = want;
      const wind = rain === "storm" ? -70 : rain === "heavy" ? -40 : -20;
      for (const d of drops) {
        d.y += d.v * dt; d.x += (wind - scroll * 0.5) * dt;
        if (d.y >= d.land) { if (splashes.length < 60) splashes.push({ x: d.x, y: d.land, life: 0.16 }); Object.assign(d, spawn(-4 - Math.random() * 20, groundY)); }
        if (d.x < -30) d.x += 300;
      }
      for (const s of splashes) s.life -= dt;
      splashes = splashes.filter(s => s.life > 0);
      flash = Math.max(0, flash - dt * 3);
      if (bolt) { bolt.life -= dt; if (bolt.life <= 0) bolt = null; }
      if (rain === "storm" && level > 0.8) {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          nextBolt = 3 + Math.random() * 5; flash = 1;
          let x = 30 + Math.random() * 180, y = 0; const pts: [number, number][] = [[x, y]];
          while (y < 60 + Math.random() * 25) { y += 6 + Math.random() * 8; x += (Math.random() - 0.5) * 14; pts.push([x, y]); }
          bolt = { pts, life: 0.2 }; onThunder();
        }
      }
    },
    /** Overcast sky cover, drawn right after the sky. */
    drawClouds(ctx: CanvasRenderingContext2D, clock: number, color: string) {
      if (level < 0.05) return;
      ctx.globalAlpha = Math.min(1, level * 1.1);
      ctx.fillStyle = color; ctx.fillRect(0, 0, 240, 10 + level * 18);
      for (let i = 0; i < 9; i++) {
        const x = ((i * 37 - clock * (4 + level * 6)) % 300 + 300) % 300 - 30, y = 6 + (i % 3) * 7 + level * 8;
        ctx.fillRect(x, y, 34, 7); ctx.fillRect(x + 6, y - 4, 20, 4); ctx.fillRect(x + 4, y + 7, 24, 3);
      }
      ctx.globalAlpha = 1;
    },
    /** Rain streaks and splashes. */
    drawRain(ctx: CanvasRenderingContext2D) {
      if (!drops.length && !splashes.length) return;
      ctx.fillStyle = "rgba(205,225,255,0.55)";
      for (const d of drops) { ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.len); ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) + d.len, 1, 1); }
      ctx.fillStyle = "rgba(220,235,255,0.7)";
      for (const s of splashes) { ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x) + 1, Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1); }
    },
    /** Darkening, lightning bolt and flash on top of the scene (under the HUD). */
    drawOverlay(ctx: CanvasRenderingContext2D, reducedMotion: boolean) {
      if (level > 0.02) { ctx.fillStyle = `rgba(14,20,40,${(level * 0.32).toFixed(3)})`; ctx.fillRect(0, 0, 240, 160); }
      if (bolt) {
        for (const [color, w] of [["rgba(170,200,255,.6)", 3], ["#ffffff", 1]] as const) {
          ctx.fillStyle = color;
          for (let i = 1; i < bolt.pts.length; i++) {
            const [x0, y0] = bolt.pts[i - 1], [x1, y1] = bolt.pts[i], steps = Math.ceil(Math.abs(y1 - y0));
            for (let s = 0; s <= steps; s++) { const t = s / steps; ctx.fillRect(Math.round(x0 + (x1 - x0) * t) - (w >> 1), Math.round(y0 + (y1 - y0) * t), w, 1); }
          }
        }
      }
      if (flash > 0) { ctx.fillStyle = `rgba(235,240,255,${(flash * (reducedMotion ? 0.12 : 0.5)).toFixed(3)})`; ctx.fillRect(0, 0, 240, 160); }
    },
  };
}
export type RainFx = ReturnType<typeof createRainFx>;

/** Blinking fireflies for night scenes. */
export function drawFireflies(ctx: CanvasRenderingContext2D, clock: number, count: number, top: number, bottom: number, scroll = 0, reducedMotion = false) {
  for (let i = 0; i < count; i++) {
    const seed = i * 97.13;
    const x = ((((seed * 13) % 260) - scroll * 0.3 + Math.sin(clock * 0.7 + seed) * 8) % 260 + 260) % 260 - 10;
    const y = top + ((seed * 7) % (bottom - top)) + Math.sin(clock * 1.3 + seed) * 4;
    const on = reducedMotion || Math.sin(clock * 3 + seed) > 0.1;
    if (!on) continue;
    ctx.fillStyle = "rgba(220,255,120,.35)"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.fillStyle = "#eaff8a"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

/** Sun or moon (and stars at night) for the forest sky. */
export function drawCelestial(ctx: CanvasRenderingContext2D, time: TimeOfDay, clock: number, reducedMotion: boolean) {
  const disc = (cx: number, cy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1); }
  };
  if (time === "night") {
    for (let i = 0; i < 40; i++) { const x = (i * 53 + 11) % 240, y = (i * 31 + 5) % 70; if (reducedMotion || Math.sin(clock * 2 + i) > -0.4) { ctx.fillStyle = y < 35 ? "#ffffff" : "#c8c8ff"; ctx.fillRect(x, y, 1, 1); } }
    disc(196, 20, 7, "#fff3c8"); ctx.fillStyle = "#e8d8a0"; ctx.fillRect(193, 17, 2, 2); ctx.fillRect(198, 22, 2, 1);
  } else if (time === "morning") {
    ctx.fillStyle = "rgba(255,230,160,.35)"; disc(38, 42, 12, "rgba(255,230,160,.35)"); disc(38, 42, 8, "#ffe08a"); ctx.fillStyle = INK;
  } else if (time === "day") {
    disc(196, 18, 10, "rgba(255,250,200,.35)"); disc(196, 18, 6, "#fff3a8");
  } else {
    disc(178, 78, 16, "rgba(255,150,90,.35)"); disc(178, 78, 11, "#ff9a4a"); ctx.fillStyle = "#ffc27a"; ctx.fillRect(170, 72, 6, 1);
  }
}
