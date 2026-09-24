/** Clothing fit for any Rare Friend.
 *
 * Every Friend has its own 16 × 16 silhouette, and it changes from frame to frame while walking. Instead of
 * fixed clothing positions, each frame is measured: the main body (largest connected shape, so hover lines
 * or sparkles do not count), where the head is (first row that is really solid, ignoring ears/antennae),
 * where the neck is (the row just above the shoulders widen), where the legs start (the rows split into
 * separate legs) and which pixels are feet. Clothes are then drawn along those measurements: hats sit on
 * the real head and match its width, capes follow the back contour row by row, sweaters and vests recolor
 * only the Friend's own torso pixels, boots only its own feet. The Friend's outline is never changed.
 * Results are cached per frame. */

export type Span = { l: number; r: number; n: number } | null;
export type Fit = Readonly<{
  mask: readonly (readonly boolean[])[];   // main body pixels
  spans: readonly Span[];                  // per row: leftmost, rightmost, filled count (main body)
  top: number; bottom: number; left: number; right: number; cx: number;
  headRow: number; headL: number; headR: number;
  neckRow: number; neckL: number; neckR: number;
  bodyTop: number; bodyBottom: number;     // torso rows (bodyBottom ≥ bodyTop when there is a torso)
  legsRow: number;                         // first row of separate legs (= bottom + 1 when none)
  feet: readonly number[];                 // columns of the lowest row
}>;

const cache = new WeakMap<readonly string[], Fit>();

export function fitFrame(rows: readonly string[]): Fit {
  const hit = cache.get(rows); if (hit) return hit;
  const H = rows.length, W = rows[0]?.length ?? 16;
  const on = (i: number, j: number) => j >= 0 && j < H && i >= 0 && i < W && rows[j][i] === "#";
  // largest 8-connected shape = the Friend's body
  const label: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  let best = 0, bestSize = 0, next = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!on(i, j) || label[j][i]) continue;
    next++; let size = 0; const stack = [[i, j]]; label[j][i] = next;
    while (stack.length) {
      const [a, b] = stack.pop()!; size++;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = a + di, y = b + dj; if (on(x, y) && !label[y][x]) { label[y][x] = next; stack.push([x, y]); } }
    }
    if (size > bestSize) { bestSize = size; best = next; }
  }
  const mask = label.map(r => r.map(v => v === best && best > 0));
  const spans: Span[] = mask.map(r => { let l = -1, rr = -1, n = 0; r.forEach((v, i) => { if (v) { if (l < 0) l = i; rr = i; n++; } }); return l < 0 ? null : { l, r: rr, n }; });
  let top = spans.findIndex(s => s), bottom = H - 1 - [...spans].reverse().findIndex(s => s);
  if (top < 0) { top = 2; bottom = 13; }
  let left = W, right = 0; for (const s of spans) if (s) { left = Math.min(left, s.l); right = Math.max(right, s.r); }
  const width = (j: number) => { const s = spans[j]; return s ? s.r - s.l + 1 : 0; };
  const count = (j: number) => spans[j]?.n ?? 0;
  const maxN = Math.max(1, ...spans.map(s => s?.n ?? 0));
  // head: the first row with a real solid run (skips thin ears, antennae and horns); the head is that run,
  // so a side-on Friend gets its hat on its head, not in the middle of its back
  const longest = (j: number) => { let best = { l: -1, r: -1 }, l = -1; for (let i = 0; i <= W; i++) { const v = i < W && mask[j]?.[i]; if (v && l < 0) l = i; if (!v && l >= 0) { if (i - l > best.r - best.l + 1 || best.l < 0) best = { l, r: i - 1 }; l = -1; } } return best; };
  let headRow = top, hs = { l: left, r: right, n: 0 };
  for (let j = top; j <= bottom; j++) { const run = longest(j), w = run.r - run.l + 1; if (run.l >= 0 && w >= 3 && w >= 0.6 * count(j)) { headRow = j; hs = { l: run.l, r: run.r, n: w }; break; } }
  void maxN;
  // legs: from the bottom up, rows that split into two or more separate runs
  const runs = (j: number) => { let n = 0; for (let i = 0; i < W; i++) if (mask[j]?.[i] && !mask[j]?.[i - 1]) n++; return n; };
  let legsRow = bottom + 1;
  for (let j = bottom; j > headRow + 2; j--) { if (runs(j) >= 2) legsRow = j; else break; }
  // neck: the row just above where the shoulders clearly widen; otherwise ~40% down the body
  let neckRow = -1;
  for (let j = headRow + 1; j < Math.min(legsRow, bottom); j++) if (width(j) >= Math.max(width(j - 1), hs.r - hs.l + 1) + 3 && j - 1 > headRow) { neckRow = j - 1; break; }
  if (neckRow < 0) neckRow = Math.min(legsRow - 2, headRow + Math.max(1, Math.round((bottom - headRow) * 0.4)));
  neckRow = Math.max(headRow, neckRow);
  const ns = spans[neckRow] ?? hs;
  const bodyTop = neckRow + 1, bodyBottom = Math.min(legsRow - 1, bottom - (legsRow > bottom ? 1 : 0));
  const feet: number[] = []; for (let i = 0; i < W; i++) if (mask[bottom]?.[i]) feet.push(i);
  const fit: Fit = { mask, spans, top, bottom, left, right, cx: (hs.l + hs.r) / 2,
    headRow, headL: hs.l, headR: hs.r, neckRow, neckL: ns.l, neckR: ns.r, bodyTop, bodyBottom, legsRow, feet };
  cache.set(rows, fit);
  return fit;
}
