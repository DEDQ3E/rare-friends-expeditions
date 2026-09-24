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
