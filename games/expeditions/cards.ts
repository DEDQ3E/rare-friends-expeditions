/** Pixel-art pictures for the location cards on the Expedition board (drawn in code, returned as PNG data URLs).
 * The forest card follows the next expedition's forecast (time of day and rain); the cave card shows the
 * lantern-lit shaft with its rope, crystals and a spider. */

import { INK } from "./art.js";
import { drawMoon, drawRange, drawSky, drawSun, mix } from "./backdrop.js";
import { drawBirch, drawBush, drawFarTrees, drawOak, drawPine, hash } from "./scenery.js";
import { FOREST_PALETTES, type Weather } from "./weather.js";

const CW = 150, CH = 60;
const cache = new Map<string, string>();

function paint(key: string, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement("canvas"); c.width = CW; c.height = CH;
  const g = c.getContext("2d"); if (!g) return "";
  g.imageSmoothingEnabled = false; draw(g);
  const url = c.toDataURL(); cache.set(key, url); return url;
}

export function forestCard(w: Weather): string {
  return paint(`forest:${w.time}:${w.rain}`, g => {
    const P = FOREST_PALETTES[w.time], night = w.time === "night", base = 50;
    drawSky(g, [...P.sky, P.horizon], 40, false);
    if (night) { for (let i = 0; i < 26; i++) { g.fillStyle = hash(i * 3) > 0.7 ? "#ffffff" : "rgba(220,220,255,.6)"; g.fillRect(Math.floor(hash(i) * CW), Math.floor(hash(i + 9) * 26), 1, 1); } drawMoon(g, 126, 11, 5); }
    else if (w.time === "evening") drawSun(g, 118, 30, 7, "#ff9a4a", "255,150,90", false, 0, true);
    else drawSun(g, w.time === "morning" ? 22 : 128, w.time === "morning" ? 24 : 11, 5, "#fff6c0", "255,250,200", false, 0, true);
    drawRange(g, 30, 40, 22, 2.2, mix(P.mountain, P.horizon, 0.45), mix(P.mountain, "#ffffff", 0.3), night ? undefined : "#f4f6ff");
    g.fillStyle = P.hill; for (let x = 0; x < CW; x++) { const h = 6 + Math.round(4 * Math.abs(Math.sin(x / 13 + 1))); g.fillRect(x, base - 4 - h, 1, h + 4); }
    drawFarTrees(g, 11, P, CW, base - 3);
    // a small grove: pine, oak and birch with bushes
    drawBush(g, 14, base, 9, P, 3); drawPine(g, 30, base, 0, P); drawBirch(g, 58, base, 0, P, 5);
    drawOak(g, 84, base, 0, P, 7); drawBush(g, 104, base, 10, P, 11); drawPine(g, 128, base, 0, P); drawBush(g, 146, base, 8, P, 13);
    g.fillStyle = INK; g.fillRect(0, base, CW, 1);
    g.fillStyle = P.grass; g.fillRect(0, base + 1, CW, 3);
    g.fillStyle = P.dirt; g.fillRect(0, base + 4, CW, CH - base - 4);
    g.fillStyle = P.dirtDark; for (let x = 0; x < CW; x += 11) g.fillRect(x + 3, base + 6, 5, 1);
    g.fillStyle = P.grassDark; for (let x = 0; x < CW; x += 6) g.fillRect(x, base + 1, 2, 1);
    if (w.rain !== "none") {
      const n = w.rain === "light" ? 40 : w.rain === "heavy" ? 90 : 130;
      g.fillStyle = "rgba(0,10,30,.18)"; g.fillRect(0, 0, CW, CH);
      g.fillStyle = "rgba(200,220,255,.6)";
      for (let i = 0; i < n; i++) { const x = Math.floor(hash(i * 1.7) * CW), y = Math.floor(hash(i * 2.3 + 5) * CH); g.fillRect(x, y, 1, 3); }
      if (w.rain === "storm") { g.fillStyle = "#fff6c0"; for (const [x, y] of [[96, 2], [95, 3], [94, 4], [95, 5], [96, 6], [95, 7], [94, 8], [93, 9], [94, 10]] as const) g.fillRect(x, y, 2, 1); }
    }
  });
}

export function caveCard(): string {
  return paint("cave", g => {
    g.fillStyle = "#261f36"; g.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 40; i++) { g.fillStyle = hash(i) < 0.5 ? "#1c1729" : "#33293f"; g.fillRect(Math.floor(hash(i * 2.1) * CW), Math.floor(hash(i * 3.7) * CH), 4 + Math.floor(hash(i * 5.3) * 5), 2); }
    // shaft walls with lit edges
    for (let y = 0; y < CH; y++) {
      const l = Math.round(22 + 6 * Math.sin(y / 9) + 3 * Math.sin(y / 3.7)), r = Math.round(126 - 6 * Math.sin(y / 11 + 2) - 3 * Math.sin(y / 4.1));
      g.fillStyle = "#3d3354"; g.fillRect(0, y, l, 1); g.fillRect(r, y, CW - r, 1);
      g.fillStyle = "#8a7cc0"; g.fillRect(l - 1, y, 1, 1); g.fillStyle = "#6a5e96"; g.fillRect(r, y, 1, 1);
      g.fillStyle = INK; g.fillRect(l, y, 1, 1); g.fillRect(r - 1, y, 1, 1);
    }
    // stalactites
    g.fillStyle = "#3d3354"; for (const [x, h] of [[40, 7], [52, 4], [98, 8], [110, 5]] as const) for (let j = 0; j < h; j++) g.fillRect(x - Math.floor((h - j) / 3), j, Math.floor((h - j) / 1.5) + 1, 1);
    // glowing crystals on the walls and a ledge
    const glow = (x: number, y: number, r: number, rgb: string) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const cluster = (x: number, y: number, a: string, b: string) => { g.fillStyle = INK; g.fillRect(x, y - 6, 6, 7); g.fillStyle = a; g.fillRect(x + 1, y - 4, 1, 4); g.fillRect(x + 3, y - 5, 1, 5); g.fillRect(x + 4, y - 3, 1, 3); g.fillStyle = b; g.fillRect(x + 3, y - 5, 1, 1); g.fillRect(x + 1, y - 4, 1, 1); };
    glow(26, 44, 14, "63,200,240"); cluster(22, 46, "#3fc8f0", "#bff3ff");
    glow(122, 22, 14, "178,122,232"); cluster(119, 24, "#b27ae8", "#e8ccff");
    g.fillStyle = INK; g.fillRect(84, 44, 44, 6); g.fillStyle = "#564a76"; g.fillRect(84, 45, 43, 4); g.fillStyle = "#a496d8"; g.fillRect(84, 45, 43, 1);
    glow(100, 43, 9, "90,240,255"); g.fillStyle = INK; g.fillRect(98, 40, 5, 3); g.fillStyle = "#5af0ff"; g.fillRect(99, 41, 3, 1);
    // spider on its thread
    g.fillStyle = "rgba(220,220,240,.55)"; g.fillRect(58, 0, 1, 30);
    g.fillStyle = INK; g.fillRect(55, 30, 7, 5); g.fillRect(54, 31, 9, 1); g.fillRect(54, 33, 9, 1); g.fillStyle = "#6a4a8a"; g.fillRect(56, 31, 5, 3); g.fillStyle = "#ff4d6d"; g.fillRect(57, 32, 1, 1); g.fillRect(59, 32, 1, 1);
    // the rope and the lantern pool of light
    glow(80, 34, 26, "255,196,120");
    g.fillStyle = "#c8a070"; for (let y = 0; y < 26; y++) g.fillRect(80, y, 1, 1);
    g.fillStyle = INK; g.fillRect(78, 26, 5, 7); g.fillStyle = "#6b6f80"; g.fillRect(79, 27, 3, 1); g.fillRect(79, 31, 3, 1); g.fillStyle = "#ffd23f"; g.fillRect(79, 28, 3, 3); g.fillStyle = "#fff3a8"; g.fillRect(80, 29, 1, 1);
    // floating crystals
    for (const [x, y] of [[70, 44], [74, 52], [88, 18]] as const) { glow(x + 2, y + 2, 6, "63,200,240"); g.fillStyle = "#1b5a78"; g.fillRect(x + 1, y, 3, 5); g.fillStyle = "#3fc8f0"; g.fillRect(x + 2, y + 1, 1, 3); g.fillStyle = "#ffffff"; g.fillRect(x + 2, y + 1, 1, 1); }
    // glowworms
    for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(160,255,210,.85)"; g.fillRect(34 + Math.floor(hash(i * 7.1) * 80), Math.floor(hash(i * 4.3) * 20), 1, 1); }
  });
}

export function ruinsCard(): string {
  return paint("ruins", g => {
    // warm sky and a low sun behind the temple
    const sky = g.createLinearGradient(0, 0, 0, 44); sky.addColorStop(0, "#f2a35e"); sky.addColorStop(0.6, "#f7c98a"); sky.addColorStop(1, "#fbe3b4");
    g.fillStyle = sky; g.fillRect(0, 0, CW, CH);
    drawSun(g, 104, 16, 7, "#fff0b0", "255,230,160", false, 0, true);
    // jungle behind
    g.fillStyle = "#4f7a3a"; for (let x = 0; x < CW; x++) { const h = 10 + Math.round(5 * Math.abs(Math.sin(x / 9)) + 3 * Math.sin(x / 4)); g.fillRect(x, 44 - h, 1, h); }
    g.fillStyle = "#3a5f2c"; for (let x = 0; x < CW; x += 2) { const h = 5 + Math.round(3 * Math.abs(Math.sin(x / 6 + 2))); g.fillRect(x, 44 - h, 2, h); }
    // temple: stepped pyramid with a dark doorway
    for (let s = 0; s < 4; s++) { const w = 70 - s * 14, x = 40 + s * 7, y = 44 - (s + 1) * 7; g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, 8); g.fillStyle = s % 2 ? "#c8a26a" : "#bf9860"; g.fillRect(x, y, w, 7); g.fillStyle = "#e0c088"; g.fillRect(x, y, w, 1); g.fillStyle = "#8a6a40"; for (let k = x + 5; k < x + w; k += 9) g.fillRect(k, y + 2, 1, 5); }
    g.fillStyle = INK; g.fillRect(69, 30, 12, 14); g.fillStyle = "#2a1c10"; g.fillRect(70, 31, 10, 13);
    g.fillStyle = "#ffd23f"; g.fillRect(73, 16, 4, 4); g.fillStyle = "#fff3a8"; g.fillRect(74, 17, 2, 2);
    // broken columns in front
    for (const [x, h] of [[18, 22], [30, 14], [120, 26], [134, 12]] as const) {
      g.fillStyle = INK; g.fillRect(x - 1, 50 - h - 1, 9, h + 1); g.fillStyle = "#d8b27a"; g.fillRect(x, 50 - h, 7, h); g.fillStyle = "#a88658"; g.fillRect(x + 5, 50 - h, 2, h);
      g.fillStyle = "#e8d0a0"; g.fillRect(x, 50 - h, 7, 1); g.fillStyle = "#4f7a3a"; g.fillRect(x + 1, 50 - h, 2, 6); g.fillStyle = "#7fa84a"; g.fillRect(x + 1, 50 - h + 2, 1, 1);
    }
    // courtyard floor with a trap row
    g.fillStyle = INK; g.fillRect(0, 50, CW, 1);
    for (let x = 0; x < CW; x += 10) { g.fillStyle = (x / 10) % 2 ? "#c8a26a" : "#bf9860"; g.fillRect(x, 51, 10, 9); g.fillStyle = "#8a6a40"; g.fillRect(x + 9, 51, 1, 9); }
    for (const x of [52, 62, 72, 82, 92]) { g.fillStyle = "#6f7484"; g.fillRect(x + 1, 52, 8, 7); g.fillStyle = "#dfe4f0"; g.fillRect(x + 2, 51, 1, 3); g.fillRect(x + 5, 51, 1, 3); g.fillRect(x + 8, 51, 1, 3); }
    // a rolling boulder
    g.fillStyle = INK; for (let dy = -5; dy <= 5; dy++) { const w = Math.round(Math.sqrt(25 - dy * dy)); g.fillRect(108 - w - 1, 45 + dy, w * 2 + 3, 1); }
    for (let dy = -4; dy <= 4; dy++) { const w = Math.round(Math.sqrt(16 - dy * dy)); g.fillStyle = dy < 0 ? "#b8a680" : "#8a7a60"; g.fillRect(108 - w, 45 + dy, w * 2 + 1, 1); }
    // dart in flight
    g.fillStyle = "#6b4a2b"; g.fillRect(24, 41, 9, 1); g.fillStyle = "#dfe4f0"; g.fillRect(33, 40, 2, 3); g.fillStyle = "#ff4d6d"; g.fillRect(24, 40, 2, 1); g.fillRect(24, 42, 2, 1);
  });
}
