// Fit sheet: every wardrobe piece on silhouettes of every body type (ears, side-on quadruped, humanoid, blob, wide,
// tiny, antennae, legless) plus the SDK's recorded Friend #7730. Bundled and rendered by tests/wardrobe.mjs.
import { drawHero } from "../games/expeditions/art.js";
import { WARDROBE, type Facing, type Outfit } from "../games/expeditions/wardrobe.js";

const S = (art: string[]) => art.map(r => r.padEnd(16, ".").replace(/[^#]/g, "."));
export const BODIES: Record<string, readonly string[]> = {
  ears: S(["", "", "..#.......#", "..##.....##", "..#########", "..#########", "..#########", "...#######", "....#####", "...#######", "..#########", "..#########", "..#########", "...##...##", "...##...##", ""]),
  quadruped: S(["", "", "", "..........##", ".........####", ".........####", "..#########", ".##########", ".##########", ".##########", "..#######", "..##...##", "..##...##", "..##...##", "..##...##", ""]),
  humanoid: S(["", "", ".....####", "....######", "....######", "....######", ".....####", "...########", "..##.####.##", "..##.####.##", "....######", "....##..##", "....##..##", "....##..##", "...###..###", ""]),
  blob: S(["", "", "", "", "", ".....######", "...##########", "..############", "..############", "..############", "..############", "...##########", ".....######", "", "", ""]),
  wide: S(["", "", "", "", ".##.........##", ".###.......###", "..##.######.##", "...##########", "....########", "....########", "...##########", "..###.####.###", "..#...#..#...#", "", "", ""]),
  tiny: S(["", "", "", "", "", "", "", "", "......####", ".....######", ".....######", ".....######", "......#..#", "", "", ""]),
  antennae: S(["", "....#....#", ".....#..#", "......##", ".....####", "....######", "....######", ".....####", "....######", "...########", "...########", "....######", ".....#..#", ".....#..#", "....##..##", ""]),
  ghost: S(["", "", "....######", "...########", "..##########", "..##########", "..##########", "..##########", "..##########", "..##########", "..##########", "..##########", "..#.##.##.#", "", "", ""]),
};

type Body = readonly string[] | Readonly<{ down: readonly string[]; right: readonly string[] }>;
const pose = (b: Body, facing: Facing) => (Array.isArray(b) ? b as readonly string[] : (b as { down: readonly string[]; right: readonly string[] })[facing === "right" ? "right" : "down"]);

/** Checks every body × piece × facing: the piece is visible, stays near the sprite box, and hats never cover the Friend. */
export function checkFits(extra: Record<string, Body> = {}) {
  const bodies: Record<string, Body> = { ...BODIES, ...extra }, problems: string[] = [];
  const draw = (rows: readonly string[], outfit: Outfit, facing: Facing) => {
    const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d")!;
    drawHero(g, rows, 12, 16, { outfit, clock: 0.3, moving: facing === "right" }, facing); return g.getImageData(0, 0, 40, 40).data;
  };
  for (const [name, body] of Object.entries(bodies)) for (const facing of ["down", "right"] as Facing[]) {
    const rows = pose(body, facing), bare = draw(rows, {}, facing);
    for (const item of WARDROBE) {
      const worn = draw(rows, { [item.slot]: item.id }, facing);
      let changed = 0, onFriend = 0, minX = 99, maxX = -1, minY = 99, maxY = -1;
      for (let p = 0; p < 1600; p++) {
        if (bare[p * 4] === worn[p * 4] && bare[p * 4 + 1] === worn[p * 4 + 1] && bare[p * 4 + 2] === worn[p * 4 + 2] && bare[p * 4 + 3] === worn[p * 4 + 3]) continue;
        const x = p % 40, y = Math.floor(p / 40); changed++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if (rows[y - 16]?.[x - 12] === "#") onFriend++;
      }
      const at = `${name} / ${facing} / ${item.id}`;
      if (!changed) problems.push(`${at}: nothing visible`);
      if (minX < 12 - 4 || maxX > 12 + 19 || minY < 16 - 11 || maxY > 16 + 17) problems.push(`${at}: drawn too far from the Friend`);
      if (item.slot === "head" && onFriend > 0) problems.push(`${at}: the hat covers ${onFriend} Friend pixels`);
    }
  }
  return problems;
}

export function renderSheet(canvas: HTMLCanvasElement, extra: Record<string, Body> = {}) {
  const bodies: Record<string, Body> = { ...BODIES, ...extra }, names = Object.keys(bodies);
  const cols = [null, ...WARDROBE], cellW = 26, cellH = 30, scale = 4;
  canvas.width = cols.length * cellW * scale; canvas.height = names.length * 2 * cellH * scale;
  const g = canvas.getContext("2d")!; g.imageSmoothingEnabled = false; g.scale(scale, scale);
  names.forEach((name, r) => (["down", "right"] as Facing[]).forEach((facing, k) => cols.forEach((item, c) => {
    const x = c * cellW, y = (r * 2 + k) * cellH;
    g.fillStyle = (r * 2 + k + c) % 2 ? "#23254a" : "#2a2c52"; g.fillRect(x, y, cellW, cellH);
    const outfit: Outfit = item ? { [item.slot]: item.id } : {};
    drawHero(g, pose(bodies[name], facing), x + 5, y + 11, { outfit, moving: facing === "right", clock: 0.3 }, facing);
  })));
}

/* ---------- keepsake glow ---------- */
import { drawKeepsakeGlow } from "../games/expeditions/glow.js";
import { spriteBounds } from "../games/expeditions/art.js";

/** Draws the Friend the way the engine does: glow first, then the Friend over it. */
function withGlow(g: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, tier: number, clock: number) {
  const b = spriteBounds(rows);
  drawKeepsakeGlow(g, tier, x + (b.left + b.right + 1) / 2, y + b.bottom + 1, (b.right - b.left + 1) / 2, clock, false);
  drawHero(g, rows, x, y, {}, "down");
}

/** Glow shows for Rare to Mythic only, stays close to the Friend's feet and never changes a Friend pixel. */
export function checkGlow(rows: readonly string[]) {
  const problems: string[] = [];
  const draw = (tier: number) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d")!; withGlow(g, rows, 12, 16, tier, 0.7); return g.getImageData(0, 0, 40, 40).data; };
  const bare = draw(0), b = spriteBounds(rows);
  for (let tier = 1; tier <= 6; tier++) {
    const d = draw(tier); let changed = 0, onFriend = 0, far = 0;
    for (let p = 0; p < 1600; p++) {
      if (d[p * 4] === bare[p * 4] && d[p * 4 + 1] === bare[p * 4 + 1] && d[p * 4 + 2] === bare[p * 4 + 2] && d[p * 4 + 3] === bare[p * 4 + 3]) continue;
      const x = p % 40, y = Math.floor(p / 40); changed++;
      if (rows[y - 16]?.[x - 12] === "#") onFriend++;
      if (y > 16 + b.bottom + 4 || y < 16 + b.bottom - 18 || x < 12 + b.left - 6 || x > 12 + b.right + 6) far++;
    }
    if (tier < 3 && changed) problems.push(`tier ${tier}: a glow below Rare`);
    if (tier >= 3 && changed < 12) problems.push(`tier ${tier}: glow too faint (${changed} px)`);
    if (onFriend) problems.push(`tier ${tier}: glow changed ${onFriend} Friend pixels`);
    if (far) problems.push(`tier ${tier}: ${far} glow pixels far from the Friend`);
  }
  return problems;
}

/** The Friend with no glow and with each glow tier, on a night-camp colour, for the README. */
export function renderGlowSheet(canvas: HTMLCanvasElement, rows: readonly string[]) {
  const tiers = [0, 3, 4, 5, 6], cellW = 34, cellH = 34, scale = 5;
  canvas.width = tiers.length * cellW * scale; canvas.height = cellH * scale;
  const g = canvas.getContext("2d")!; g.imageSmoothingEnabled = false; g.scale(scale, scale);
  tiers.forEach((tier, c) => { g.fillStyle = c % 2 ? "#1b1d48" : "#21244f"; g.fillRect(c * cellW, 0, cellW, cellH); withGlow(g, rows, c * cellW + 9, 10, tier, 0.7); });
}
