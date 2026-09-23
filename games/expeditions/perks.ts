/** Friend perks for Rare Friends: Expeditions.
 * The Friend's sprite family decides WHAT its perk does; its Generation decides HOW STRONG it is.
 * Generation 6 (cheapest to hardwire) gets no perk, Generation 1 (most expensive) gets the strongest.
 * Perks only change the forest run and XP. They never change RF prices, odds or finds, and they never
 * restrict who can play: every hardwired Friend (generation 1–6) plays the full game. */

export type PerkEffects = Readonly<{
  extraHearts: number;   // starting hearts on top of the base 3
  shield: number;        // hits ignored per run
  magnet: number;        // spark pull radius (art pixels)
  moveMult: number;      // forward/back speed multiplier
  fallMult: number;      // gravity multiplier while falling (<1 = hover)
  stomp: boolean;        // landing on slimes, hedgehogs and frogs defeats them
  invulnBonus: number;   // extra seconds of invulnerability after a hit
  xpMult: number;        // XP multiplier for the run
}>;

const NONE: PerkEffects = { extraHearts: 0, shield: 0, magnet: 0, moveMult: 1, fallMult: 1, stomp: false, invulnBonus: 0, xpMult: 1 };

export type Perk = Readonly<{ family: string; name: string; describe: (rank: number) => string; effects: (rank: number) => PerkEffects }>;

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** rank 0..5 → [none, 1..5] step values */
const at = (rank: number, steps: readonly number[]) => (rank <= 0 ? 0 : steps[Math.min(rank, steps.length) - 1]);

export const PERKS: Readonly<Record<string, Perk>> = {
  Skeleton: { family: "Skeleton", name: "Bone Guard", describe: r => `Shrugs off ${at(r, [1, 1, 1, 2, 2])} hit${at(r, [1, 1, 1, 2, 2]) > 1 ? "s" : ""} per expedition${r >= 3 ? " and stays safe longer after one" : ""}`,
    effects: r => ({ ...NONE, shield: at(r, [1, 1, 1, 2, 2]), invulnBonus: at(r, [0, 0, 0.3, 0.3, 0.5]) }) },
  Mask: { family: "Mask", name: "Spirit Sight", describe: r => `Sparks drift toward the Friend from ${at(r, [8, 12, 16, 20, 26])} px away`,
    effects: r => ({ ...NONE, magnet: at(r, [8, 12, 16, 20, 26]) }) },
  Family: { family: "Family", name: "Kindred", describe: r => `+${pct(at(r, [0.05, 0.1, 0.15, 0.2, 0.3]))} XP from every expedition`,
    effects: r => ({ ...NONE, xpMult: 1 + at(r, [0.05, 0.1, 0.15, 0.2, 0.3]) }) },
  Cellular: { family: "Cellular", name: "Mitosis", describe: r => `+${at(r, [1, 1, 1, 2, 2])} starting heart${at(r, [1, 1, 1, 2, 2]) > 1 ? "s" : ""}${r >= 3 ? " and longer recovery" : ""}`,
    effects: r => ({ ...NONE, extraHearts: at(r, [1, 1, 1, 2, 2]), invulnBonus: at(r, [0, 0, 0.2, 0.2, 0.4]) }) },
  Asymmetry: { family: "Asymmetry", name: "Wild Step", describe: r => `Moves ${pct(at(r, [0.1, 0.2, 0.3, 0.4, 0.5]))} faster along the path`,
    effects: r => ({ ...NONE, moveMult: 1 + at(r, [0.1, 0.2, 0.3, 0.4, 0.5]) }) },
  Hoverer: { family: "Hoverer", name: "Hover", describe: r => `Falls ${pct(at(r, [0.1, 0.18, 0.26, 0.34, 0.42]))} slower, floating over trouble`,
    effects: r => ({ ...NONE, fallMult: 1 - at(r, [0.1, 0.18, 0.26, 0.34, 0.42]) }) },
  Colossus: { family: "Colossus", name: "Heavy Stomp", describe: r => r >= 1 ? `Landing on slimes, hedgehogs and frogs defeats them${r >= 4 ? " · +1 heart" : ""}` : "",
    effects: r => ({ ...NONE, stomp: r >= 1, extraHearts: r >= 4 ? 1 : 0 }) },
  Sparkling: { family: "Sparkling", name: "Glitter", describe: r => `Sparks give +${pct(at(r, [0.1, 0.2, 0.3, 0.4, 0.5]))} XP and pull in from ${at(r, [0, 6, 8, 10, 12])} px`,
    effects: r => ({ ...NONE, xpMult: 1 + at(r, [0.1, 0.2, 0.3, 0.4, 0.5]), magnet: at(r, [0, 6, 8, 10, 12]) }) },
  Hollow: { family: "Hollow", name: "Phase", describe: r => `Stays untouchable ${at(r, [0.3, 0.5, 0.7, 0.9, 1.2])} s longer after a hit${r >= 4 ? " and ignores the first one" : ""}`,
    effects: r => ({ ...NONE, invulnBonus: at(r, [0.3, 0.5, 0.7, 0.9, 1.2]), shield: r >= 4 ? 1 : 0 }) },
};

/** Generation 1 → rank 5 (strongest), Generation 5 → rank 1, Generation 6 (or unknown) → rank 0 (no perk). */
export function rankOf(generation: number | null): number { return generation && generation >= 1 && generation <= 5 ? 6 - generation : 0; }
export const RANK_LABEL = ["—", "I", "II", "III", "IV", "V"] as const;

export function perkFor(family: string | null, generation: number | null) {
  const perk = family ? PERKS[family] : undefined, rank = rankOf(generation);
  return { perk: perk ?? null, rank, effects: perk && rank > 0 ? perk.effects(rank) : NONE, text: perk && rank > 0 ? perk.describe(rank) : "" };
}
