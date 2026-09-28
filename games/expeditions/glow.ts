/** Keepsake glow (see keepsakes.ts): a ring of light under the Friend's feet and a few motes rising around it,
 * in the colour of the rarest kept find (Rare blue, Epic purple, Legendary gold, Mythic rainbow). The engine draws
 * it right before it redraws the Friend over weather and darkness, so it stays bright at night and in the cave and
 * never covers the Friend's own pixels. */
const COLORS: Readonly<Record<number, readonly string[]>> = {
  3: ["#4aa3ff", "#9fd0ff"],
  4: ["#b86bff", "#dcb6ff"],
  5: ["#ffb52e", "#fff0a8"],
  6: ["#ff4d6d", "#ffb52e", "#ffd23f", "#5ccb5f", "#4aa3ff", "#b86bff"],
};

/** `cx` is the Friend's centre column, `feet` the row just below its feet, `half` half its width (canvas pixels). */
export function drawKeepsakeGlow(ctx: CanvasRenderingContext2D, tier: number, cx: number, feet: number, half: number, clock: number, still: boolean) {
  const pal = COLORS[tier];
  if (!pal) return;
  const rx = half + 3, rainbow = pal.length > 2;
  const pulse = still ? 0.8 : 0.65 + 0.25 * Math.sin(clock * 3);
  const colour = (k: number) => (rainbow ? pal[(k + (still ? 0 : Math.floor(clock * 6))) % pal.length] : pal[k % 2]);
  // soft pool of light, then a one-pixel elliptical ring
  ctx.globalAlpha = 0.28 * pulse; ctx.fillStyle = pal[0];
  ctx.beginPath(); ctx.ellipse(cx, feet, rx, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = pulse;
  for (let a = 0, k = 0; a < Math.PI * 2; a += Math.PI / (rx * 1.6), k++) {
    ctx.fillStyle = colour(k); ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(feet + Math.sin(a) * 2), 1, 1);
  }
  // motes rising from the ring, more for rarer finds
  const motes = tier + 1;
  for (let m = 0; m < motes; m++) {
    const phase = still ? (m / motes) : (clock * 0.55 + m / motes) % 1;
    const x = Math.round(cx + Math.sin(m * 2.39 + (still ? 0 : clock * 0.8)) * (rx - 1));
    const y = Math.round(feet - 1 - phase * 16);
    ctx.globalAlpha = 0.45 + 0.55 * (1 - phase); ctx.fillStyle = colour(m + 1);
    ctx.fillRect(x, y, 1, 1);
    // rarer finds: sparkles with little arms
    if (tier >= 5) { ctx.globalAlpha *= 0.55; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  }
  ctx.globalAlpha = 1;
}
