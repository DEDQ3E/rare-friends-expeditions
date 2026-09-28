/** Keepsake bonus: hold or redeem.
 * Every find the Friend keeps (not sold at the Merchant) adds XP to every expedition while it is held.
 * Selling a find pays its fixed RF and gives its bonus up. Rarer finds give more bonus per RF they hold
 * back, so the biggest prizes are the ones most worth keeping and their RF stays in the game as backing.
 * The bonus changes XP only: never odds, prices, finds or access. Tiers follow `game.json` outcome order. */

/** Bonus per kept find, in basis points of XP (100 = +1%): Junk, Common, Uncommon, Rare, Epic, Legendary, Mythic. */
export const KEEP_XP_BPS = [0, 100, 200, 450, 800, 1700, 3600] as const;
/** The total keepsake bonus is capped at +50% XP, so stacked multipliers do not race through the levels. */
export const KEEP_CAP_BPS = 5000;

/** Total bonus in basis points for SDK inventory counts by rarity tier. */
export function keepsakeBps(inventory: readonly bigint[]): number {
  let total = 0;
  for (let i = 0; i < KEEP_XP_BPS.length && i < inventory.length; i++) total += Number(inventory[i]) * KEEP_XP_BPS[i];
  return Math.min(total, KEEP_CAP_BPS);
}

/** "+5%" style label for basis points. */
export const keepText = (bps: number) => `+${Number((bps / 100).toFixed(1))}%`;

/** Keepsake glow: the rarest kept find from Rare up (tier 3–6 in `game.json` order) shows as a glow under the
 * Friend; 0 = no glow. Read from the same SDK inventory counts as the bonus, so selling the last find of a
 * tier dims the glow to the next rarest one or puts it out. Cosmetic only. */
export const GLOW_MIN_TIER = 3;
export function glowTier(inventory: readonly bigint[]): number {
  for (let i = inventory.length - 1; i >= GLOW_MIN_TIER; i--) if (inventory[i] > 0n) return i;
  return 0;
}
/** The glow tier after selling `qty` finds of `tier`. */
export function glowAfterSelling(inventory: readonly bigint[], tier: number, qty: bigint): number {
  return glowTier(inventory.map((n, i) => (i === tier ? (n > qty ? n - qty : 0n) : n)));
}
/** Glow colour names by tier, for labels. */
export const GLOW_NAME: Readonly<Record<number, string>> = { 3: "blue", 4: "purple", 5: "gold", 6: "rainbow" };
