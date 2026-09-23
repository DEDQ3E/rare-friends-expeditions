/** Backdrops for Rare Friends: Expeditions: gradient skies, layered mountains, cumulus clouds, moon and stars,
 * sun rays, birds, shooting stars and mist. Expensive layers are cached on small offscreen canvases. */

type Ctx = CanvasRenderingContext2D;

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function rnd(seed: number) { const s = Math.sin(seed * 91.37 + 17.3) * 43758.5453; return s - Math.floor(s); }

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, w: number, h: number, paint: (g: Ctx) => void) {
  let c = cache.get(key);
  if (!c) { c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); if (g) { g.imageSmoothingEnabled = false; paint(g); } cache.set(key, c); if (cache.size > 40) cache.delete(cache.keys().next().value!); }
  return c;
}

/** Smooth vertical sky gradient through `stops` (rendered at full screen resolution),
 * optionally with a faint milky way band (night). */
const gradients = new WeakMap<Ctx, Map<string, CanvasGradient>>();
export function drawSky(ctx: Ctx, stops: readonly string[], height: number, milkyWay = false) {
  let per = gradients.get(ctx); if (!per) { per = new Map(); gradients.set(ctx, per); }
  const key = `${stops.join()}:${height}`;
  let grad = per.get(key);
  if (!grad) { grad = ctx.createLinearGradient(0, 0, 0, height); stops.forEach((c, i) => grad!.addColorStop(i / (stops.length - 1), c)); per.set(key, grad); }
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 242, height);
  if (milkyWay) {
    ctx.drawImage(cached(`milky:${height}`, 240, height, g => {
      for (let i = 0; i < 700; i++) {
        const t = rnd(i), x = t * 260 - 10, band = 58 - t * 44 + (rnd(i + 3) - 0.5) * 22 * (0.6 + 0.4 * Math.sin(t * 9));
        if (band < 0 || band >= height - 30) continue;
        g.fillStyle = rnd(i + 7) > 0.85 ? "rgba(255,250,235,.55)" : rnd(i + 7) > 0.5 ? "rgba(200,190,255,.22)" : "rgba(170,160,230,.12)";
        g.fillRect(Math.round(x), Math.round(band), 1, 1);
      }
    }), 0, 0);
  }
}

/** Twinkling stars in three brightness levels. */
export function drawStars(ctx: Ctx, clock: number, count: number, maxY: number, still: boolean) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd(i * 3) * 240), y = Math.floor(rnd(i * 3 + 1) * maxY), b = rnd(i * 3 + 2);
    const tw = still ? 1 : 0.5 + 0.5 * Math.sin(clock * (1.5 + b * 2) + i);
    if (b > 0.9) { ctx.fillStyle = `rgba(255,255,255,${(0.6 + tw * 0.4).toFixed(2)})`; ctx.fillRect(x, y, 1, 1); if (tw > 0.7) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } }
    else { ctx.fillStyle = `rgba(${b > 0.5 ? "255,250,230" : "200,200,255"},${(0.25 + tw * 0.45 * b).toFixed(2)})`; ctx.fillRect(x, y, 1, 1); }
  }
}

function disc(g: Ctx, cx: number, cy: number, r: number) { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(Math.round(cx - h), Math.round(cy + y), h * 2 + 1, 1); } }

/** Moon with craters and a soft halo. */
export function drawMoon(ctx: Ctx, x: number, y: number, r: number) {
  for (let k = 4; k >= 1; k--) { ctx.fillStyle = `rgba(255,245,210,${(0.035 * (5 - k)).toFixed(3)})`; disc(ctx, x, y, r + k * 4); }
  ctx.fillStyle = "#e8dcae"; disc(ctx, x, y, r); ctx.fillStyle = "#fff6d6"; disc(ctx, x - 1, y - 1, r - 1);
  ctx.fillStyle = "#e3d6a4"; for (const [dx, dy, cr] of [[-3, -2, 2], [3, 2, 2], [-1, 4, 1], [4, -3, 1]]) disc(ctx, x + dx, y + dy, cr);
  ctx.fillStyle = "#fffbea"; ctx.fillRect(x - 4, y - 5, 2, 1);
}

/** Sun with glow; optional soft rays fanning down (morning/evening). */
export function drawSun(ctx: Ctx, x: number, y: number, r: number, core: string, glowRgb: string, rays: boolean, clock: number, still: boolean) {
  if (rays) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6 + (still ? 0 : Math.sin(clock * 0.3 + i) * 0.02), len = 150;
      ctx.fillStyle = `rgba(${glowRgb},0.05)`; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.05) * len, y + Math.sin(a - 0.05) * len); ctx.lineTo(x + Math.cos(a + 0.05) * len, y + Math.sin(a + 0.05) * len); ctx.fill();
    }
  }
  for (let k = 4; k >= 1; k--) { ctx.fillStyle = `rgba(${glowRgb},${(0.06 * (5 - k)).toFixed(3)})`; disc(ctx, x, y, r + k * 4); }
  ctx.fillStyle = core; disc(ctx, x, y, r); ctx.fillStyle = "rgba(255,255,255,.55)"; disc(ctx, x - Math.round(r / 3), y - Math.round(r / 3), Math.max(1, Math.round(r / 3)));
}

/** A mountain range: ridge from summed sines, lit rim on rising slopes, optional snow caps. */
export function drawRange(ctx: Ctx, scroll: number, base: number, height: number, seed: number, color: string, rim: string, snow?: string) {
  const ridge = (wx: number) => height * (0.55 + 0.28 * Math.sin(wx / 41 + seed) + 0.14 * Math.sin(wx / 17 + seed * 2.3) + 0.06 * Math.sin(wx / 6.1 + seed));
  let prev = ridge(scroll - 1);
  for (let x = 0; x <= 241; x++) {
    const h = ridge(x + scroll), top = Math.round(base - h);
    ctx.fillStyle = color; ctx.fillRect(x, top, 1, 160 - top);
    if (h > prev) { ctx.fillStyle = rim; ctx.fillRect(x, top, 1, 1); }
    if (snow && h > height * 0.78) { ctx.fillStyle = snow; ctx.fillRect(x, top, 1, Math.max(1, Math.round((h - height * 0.78) * 0.9))); }
    prev = h;
  }
}

/** Soft cumulus cloud sprite (cached): lit top, mid body, shaded flat bottom. */
function cloudSprite(w: number, seed: number, light: string, mid: string, shade: string) {
  const h = Math.round(w * 0.42) + 4;
  return cached(`cloud:${w}:${seed}:${light}:${mid}:${shade}`, w + 4, h, g => {
    const puffs: [number, number, number][] = [];
    const n = 3 + Math.floor(w / 12);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, r = Math.round((w / n) * (0.9 + rnd(seed + i) * 0.6) * (1 - Math.abs(t - 0.45) * 0.8)); puffs.push([2 + t * w, h - 3 - r * 0.8, Math.max(3, r)]); }
    g.fillStyle = shade; for (const [x, y, r] of puffs) disc(g, x, y + 1, r);
    g.fillStyle = mid; for (const [x, y, r] of puffs) disc(g, x, y, r - 1);
    g.fillStyle = light; for (const [x, y, r] of puffs) disc(g, x - r * 0.25, y - r * 0.3, Math.max(1, r - 2.5));
    g.clearRect(0, h - 2, w + 4, 2); g.fillStyle = shade; g.fillRect(4, h - 3, w - 4, 1);
  });
}
export function drawClouds(ctx: Ctx, scroll: number, count: number, top: number, span: number, light: string, mid: string, shade: string, alpha = 1, snap: (v: number) => number = Math.round) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const w = 24 + Math.floor(rnd(i + 40) * 26), x = ((i * 97 + rnd(i) * 60 - scroll * (0.5 + rnd(i + 5) * 0.5)) % 330 + 330) % 330 - 50, y = top + Math.floor(rnd(i + 9) * span);
    ctx.drawImage(cloudSprite(w, i, light, mid, shade), snap(x), y);
  }
  ctx.globalAlpha = 1;
}

/** A few birds flapping across the sky. */
export function drawBirds(ctx: Ctx, clock: number, color: string, still: boolean, snap: (v: number) => number = Math.round) {
  for (let i = 0; i < 3; i++) {
    const x = ((200 - clock * (9 + i * 2) - i * 70) % 300 + 300) % 300 - 30, y = 26 + i * 7 + Math.sin(clock * 0.8 + i) * 3;
    const up = !still && Math.floor(clock * 6 + i * 2) % 2 === 0;
    const bx = snap(x), by = snap(y);
    ctx.fillStyle = color; ctx.fillRect(bx, by, 1, 1);
    ctx.fillRect(bx - 1, by - (up ? 1 : 0), 1, 1); ctx.fillRect(bx + 1, by - (up ? 1 : 0), 1, 1);
    ctx.fillRect(bx - 2, by - (up ? 2 : -1), 1, 1); ctx.fillRect(bx + 2, by - (up ? 2 : -1), 1, 1);
  }
}

/** Occasional shooting star (night). */
export function drawShootingStar(ctx: Ctx, clock: number) {
  const period = 11, t = clock % period, k = Math.floor(clock / period);
  if (t > 0.7) return;
  const x0 = 60 + rnd(k) * 160, y0 = 6 + rnd(k + 1) * 24, p = t / 0.7, x = x0 - p * 50, y = y0 + p * 22;
  for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(255,250,230,${(0.9 - i * 0.07).toFixed(2)})`; ctx.fillRect(Math.round(x + i * 2.2), Math.round(y - i), 1, 1); }
}

/** Drifting mist bands (night/morning), drawn over distant layers. */
export function drawMist(ctx: Ctx, clock: number, y: number, h: number, rgb: string, alpha: number, still: boolean, snap: (v: number) => number = Math.round) {
  for (let i = 0; i < 4; i++) {
    const off = still ? i * 40 : (clock * (3 + i) + i * 60) % 280;
    ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
    ctx.fillRect(snap(off - 40), y + i * 2, 90, h - i);
    ctx.fillRect(snap(off - 320), y + i * 2, 90, h - i);
  }
}

/** Row of pine silhouettes with pointed tops. */
export function drawPineRow(ctx: Ctx, base: number, spacing: number, minH: number, varH: number, color: string, seed: number, scroll = 0) {
  ctx.fillStyle = color;
  const first = Math.floor(scroll / spacing) - 1;
  for (let c = first; c < first + 240 / spacing + 3; c++) {
    const cx = Math.round(c * spacing - scroll + rnd(c + seed) * spacing * 0.6), h = minH + Math.floor(rnd(c * 7 + seed) * varH), top = base - h;
    for (let y = top; y <= base; y++) { const half = Math.floor(((y - top) / h) * (h * 0.32)) + (((y - top) % 4 === 3) ? 1 : 0); ctx.fillRect(cx - half, y, half * 2 + 1, 1); }
  }
}
