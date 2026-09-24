# Rare Friends: Expeditions

FriendSDK **v0.1.2** game. Your selected Rare Friend rests at a night camp and sets out on short
expeditions: a side-scrolling forest run, a rope descent into the Crystal Cave or a top-down crossing of the
Sunken Ruins. Each expedition costs one **Expedition Pass** (1 RF) and always ends at a chest with one find,
which can be kept in the collection or sold back to the merchant for RF.

The wallet connection, Friend selection and fresh NFT ownership check are provided by the SDK runtime.
A connected wallet on Robinhood mainnet (4663) holding a **hardwired Generations NFT (generation ≥ 1)**
is required, including for previews. **All balances, purchases, finds and sales are simulated.**

## Controls

| Action | Keyboard | Touch / mouse |
| --- | --- | --- |
| Camp: walk in any direction | W A S D or arrow keys | On-screen pad |
| Camp: open the place you stand at | E | Tap its label, or the E button |
| Forest: jump / double jump with Spring Boots | W, Space or ↑ (release early for a short hop) | Tap anywhere, or the JUMP button |
| Forest: move forward / back | D / A or → / ← | On-screen ◀ ▶ |
| Forest: drop faster | S or ↓ | — |
| Close a panel | Esc | ✕ |

In the camp the Friend walks freely with depth (behind or in front of the tent, fire and stalls).
The forest is a single side-scrolling lane.

Settings: sound on/off (on by default, starts with the first click or key), music, volume, reduce motion (also follows the system preference).
The game input stops whenever the runtime pauses it.

## Game loop

1. **Expedition board:** buy passes (`client.buy`) and press **Set out!** (`client.play`).
   The find is committed here, before the run starts.
2. **Forest run (~25 s):** jump over roots and slimes, time bees, collect sparks.
   Sparks and a flawless or finished run give **XP only**. Running well never changes the odds.
   If the hearts run out, the run ends early and the chest is still delivered (see "Why the chest always comes").
3. **Chest:** `client.settle(playId)` reveals the find. In chain mode a pending result shows
   "Open chest" again instead of consuming another pass.
4. **Merchant:** sell finds at fixed prices with no expiry (`client.redeem`).
5. **Outfitter:** RF sink for gear and cosmetics (see below).
6. **Collection:** a hero card (portrait, family, generation, perk, level, expeditions, pickups, best find)
   and the seven finds of each place with counts.

## Forest life

- **Trees:** oaks (some with apples), layered pines and white birches, a distant tree line, bushes with
  berries and flowers, and small ground details (grass tufts, flowers, mushrooms, pebbles).
- **Obstacles:** roots, mossy rocks, poisonous mushrooms and, deeper in, fallen logs.
- **Creatures:** slimes in three colours (green hop, purple crawl, blue rush), hedgehogs, bees and wasps
  by day, bats at night, and frogs that only come out in the rain.

## Weather

- Every expedition rolls its own **time of day** (morning, day, evening, night) and **rain**
  (clear 50%, light rain 22%, heavy rain 16%, thunderstorm 12%). The board shows the forecast for the
  next expedition before you set out.
- Rain darkens the forest, adds streaks, splashes and puddles; thunderstorms add lightning and thunder.
  Night brings stars, the moon and fireflies.
- **Rain pays a little more XP**: light ×1.1, heavy ×1.2, thunderstorm ×1.3 (still below the cave). Weather never changes RF odds or finds.
- The camp weather changes by itself every 35–80 seconds: rain clouds hide the moon, puddles form and
  the campfire shrinks and smokes in heavy rain.
- Reduce motion lowers rain density and softens lightning flashes.

## Crystal Cave (a different mini-game)

Buy a **Cave Lantern** (5 RF, Outfitter) and pick the Crystal Cave on the board. Instead of running and
jumping, the Friend is **lowered down a dark, winding shaft on a rope** (~30 s):

- **A / D** steer between the walls, **hold W / Space / tap** to grip the rope and slow down,
  **S** lets the rope run to dive faster. On touch screens: ◀ ▶ to steer, ▼ to dive, HOLD to slow down.
- It is dark: the lantern lights the way down; crystals, glowing mushrooms, glowworms and creatures' eyes
  show what is ahead. The Twig Torch widens the light.
- **Harder than the forest, zone by zone** (a banner announces each zone; the rope also runs faster the deeper it goes):
  1. **Upper Shaft:** rock ledges with a gap on one side and spiders bobbing on threads.
  2. **Windy Hollow:** drafts that push the Friend sideways (streaks and wall chevrons show the direction),
     cave bats sweeping across, crystal beetles on ledges and **falling rocks**: the ceiling rumbles, a red
     warning marks where the rock will drop, then it falls past the Friend.
  3. **Crystal Depths:** **narrow gates** (two ledges with a 38–46 px gap and a bonus crystal inside) and
     **stone slabs swinging on chains** across the shaft.
  4. **The Deep Dark:** everything at once, closer together: spiders guarding ledge openings, pairs of bats.
  One challenge at a time, always with a way past it.
- **Crystals** give XP; the cave pays **XP ×1.5**. If the hearts run out, the rope lets the Friend
  slide safely to the grotto and the chest is still there.
- Perks work here too: Heavy Stomp smashes ledges, slabs and beetles while diving, Hover grips the rope harder,
  Wild Step steers faster, Spirit Sight pulls crystals in.
- **Cave finds** use the same odds and prices as the forest: Plain Pebble, Quartz Shard, Glowworm Jar,
  Amethyst, Moon Crystal, Heart of the Cave, Dragon Egg. The Merchant pays the same for the same rarity.
- The cave has its own music, water drips and a low wind, plus a rumble before rocks fall and a whoosh in drafts.
- The board shows each place with a pixel-art picture (the forest one follows the forecast) and a difficulty rating: forest ■□□, cave ■■□, ruins ■■■.

## Sunken Ruins (third mini-game, the hardest)

Buy a **Ruins Map** (8 RF, Outfitter) and pick the Sunken Ruins on the board. This time the view is
**top-down** and the Friend crosses an ancient temple **tile by tile** (W A S D / arrows, hold to keep
walking at a measured pace; on touch screens ▲ ◀ ▶ ▼) from the entrance to the altar **before the sand in the hourglass
runs out (75 s)**. Every row of the hall is a trap, and you have to read their timing:

- **Spike plates** rise in waves across the row. About 0.8 s before they strike, the plate warns: it starts
  to shake harder and harder, cracks spread, grit jumps out of the holes and sand trickles off its edges
  (with a grinding sound next to the Friend); the tips peek out just before they come up.
- **Dart traps:** a serpent head in the wall glows red, then fires darts across its groove.
- **Rolling boulders** travel along grooves in the floor, one or two per row.
- **Crumbling floor** collapses half a second after you step on it; **pits** send the Friend back to the
  last safe row with a lost heart.
- **Fire vents** burn in groups of three, with a puff of smoke first.
- Three halls, each harder: **Outer Courtyard** (spikes, darts, pits) → **Hall of Boulders** (boulders,
  crumbling floor, longer trap runs) → **Inner Sanctum** (fire vents, faster traps, two or three trap rows
  in a row). The last ten seconds tick. Tuned to be fair: traps run at 80% speed, spikes stay down longer.
- **Relic shards** give XP; the ruins pay **XP ×2**. If hearts or sand run out, the guardians let the
  Friend take the find and go: the chest is still delivered.
- Perks: Hover floats over pits and crumbling floor, Heavy Stomp shatters boulders, Wild Step walks faster,
  Spirit Sight picks up shards from the next tile, shields and extra hearts work as usual.
- **Ruins finds** (same odds and prices): Pottery Shard, Copper Coin, Glass Bead, Silver Ring,
  Ancient Mask, Sun Crown, Idol of the First Friend.
- Its own music (a warm, exotic scale with light percussion), trickling sand, distant birds, dart twangs
  and crumbling stone.

## Friend artwork (preserved)

Contest rule: *preserve the selected Friend's original character artwork*. The Friend is always drawn from
its canonical Generations frames in the canonical look (black mask, white one-pixel halo), with its own shape
and walk animation. Nothing is worn on it or drawn over it: gear only changes how the expedition plays, the
torch and the cave lantern are held beside the Friend, and trails are particles behind it. The engine redraws
the Friend after rain, night, darkness and light overlays so nothing tints it.

## Harvest Season (limited cosmetic)

Until **Nov 30** the Outfitter sells the **Falling Leaves** trail (5 RF). It follows the same 50% burn / 50%
Friend rewards split, is cosmetic only, and can no longer be bought when the season ends (owned ones stay).
Pumpkins appear around the camp during the season.

## Friend perks

Your Friend's **family** (read from its canonical sprite) picks the perk; its **generation**
(`readGenerationEligibility`, read-only) sets the strength. Generation 1 gets rank V and
Generation 5 gets rank I. Generation 6, or an unreadable generation, plays without a perk.
Perks only change the runs (forest, cave and ruins) and XP. They never change RF prices, odds or finds, and they never
gate play: every hardwired Friend plays the full game.

| Family | Perk | Rank I → V |
|---|---|---|
| Skeleton | Bone Guard | ignores 1 → 2 hits per run, longer safety after a hit |
| Mask | Spirit Sight | sparks drift in from 8 → 26 px |
| Family | Kindred | +5% → +30% XP |
| Cellular | Mitosis | +1 → +2 starting hearts |
| Asymmetry | Wild Step | moves 10% → 50% faster |
| Hoverer | Hover | falls 10% → 42% slower |
| Colossus | Heavy Stomp | landing defeats slimes, hedgehogs and frogs; +1 heart from rank IV |
| Sparkling | Glitter | +10% → +50% XP, spark pull from rank II |
| Hollow | Phase | +0.3 → +1.2 s safety after a hit; ignores the first hit from rank IV |

## Emotes and celebration

The Friend reacts with small speech bubbles drawn next to it: it dozes (zzz) when left idle in camp,
hums or shows a heart by the fire, gets dizzy when hit and holds its find over its head when the chest
opens (confetti for Rare and better, a sweat drop for a Dry Twig). The canonical sprite artwork itself is
never redrawn or altered.

## Workbench

At the Outfitter's workbench, **10 junk finds of any place** (Dry Twigs, Plain Pebbles or Pottery Shards) craft a **Twig Torch**: a cosmetic the Friend carries that
glows at dusk and at night. Junk finds have no RF value, so crafting is free (simulated; resets on reload).

## Sparks, crystals and relic shards

Pickups in the forest (sparks), cave (crystals) and ruins (relic shards) give **XP**: 1 XP each, plus a bonus for
reaching the chest, multiplied by the place, the Friend's perk and its keepsakes. The harder the place, the more XP:

| Place | Difficulty | XP multiplier | Chest bonus (no hit) | Pickups on the way | Full clear, no hit |
| --- | --- | ---: | ---: | ---: | ---: |
| Whispering Forest | ■□□ | ×1 (rain ×1.1 / ×1.2 / ×1.3) | +5 (+10) | ~30 sparks | ~40 XP (storm ~52) |
| Crystal Cave | ■■□ | ×1.5 | +10 (+20) | ~38 crystals | ~87 XP |
| Sunken Ruins | ■■■ | ×2 | +15 (+30) | ~24 relic shards | ~108 XP |

Levels: 0 → 25 → 75 → 160 → 300 → 500 → 800 → 1,200 → 1,800 → 2,500 XP. XP raises the level and title (Novice → Tracker → Seeker → Scout → Pathfinder → Ranger → Explorer → Wayfinder → Trailblazer → Legend). They are
not RF and never change finds. Settings explains this in the game.

## Keepsakes: hold or redeem

Every find the Friend keeps instead of selling adds XP to every expedition while it is held; selling it at
the Merchant pays its fixed RF and gives that bonus up. The bonus is read from the SDK inventory, so it always
matches the ledger, and it is capped at **+50% XP** in total (`keepsakes.ts`).

| Rarity | Merchant pays | Keepsake bonus | Bonus per RF held |
| --- | ---: | ---: | ---: |
| Junk | 0 RF | — | — |
| Common | 0.4 RF | +1% XP | 2.5% |
| Uncommon | 0.75 RF | +2% XP | 2.7% |
| Rare | 1.5 RF | +4.5% XP | 3% |
| Epic | 2.5 RF | +8% XP | 3.2% |
| Legendary | 5 RF | +17% XP | 3.4% |
| Mythic | 10 RF | +36% XP | 3.6% |

Rarer finds give more bonus per RF they hold back, so the biggest prizes are the ones most worth keeping and
their RF stays in the game as backing. The bonus depends on rarity only: the SDK inventory (and, live, the
ERC-1155 reward balances) counts finds by rarity tier, so a Rare from the forest, the cave or the ruins gives
the same bonus. Harder places still pay more, because the bonus multiplies their larger XP. Keepsakes change XP only, never odds, prices or finds. The chest
screen, the Merchant, the hero card and the Economy panel show the bonus.

## Economy panel

Tap the RF balance (or the **RF** button) to see where every RF goes: passes go to the game bank that
pays the Merchant; Outfitter purchases split 50% burned / 50% Friend rewards. It also lists the
expected return (0.90 RF), the edge (10%), the 23% chance of 1 RF or more, the 10 RF reserve, the current
keepsake bonus and this session's totals.

## Economy (`game.json`)

| Find | Rarity | Chance | Merchant pays | EV |
| --- | --- | ---: | ---: | ---: |
| Dry Twig | Junk | 20% (2,000 bps) | 0 RF | 0.000 |
| Acorn | Common | 35% (3,500 bps) | 0.4 RF | 0.140 |
| Porcini | Uncommon | 22% (2,200 bps) | 0.75 RF | 0.165 |
| Owl Feather | Rare | 13% (1,300 bps) | 1.5 RF | 0.195 |
| Amber Beetle | Epic | 6% (600 bps) | 2.5 RF | 0.150 |
| Golden Scarab | Legendary | 3% (300 bps) | 5 RF | 0.150 |
| Heart of the Forest | Mythic | 1% (100 bps) | 10 RF | 0.100 |
| **Total** | | **100%** | | **0.900 RF** |

- Pass price: 1 RF (`1000000000000000000` base units). One pass = one expedition = exactly one find.
- Expected return 0.90 RF per pass (10% game edge, as in the SDK reference). 23% chance to get 1 RF or more.
- The price curve follows the SDK fishing reference (0.75 / 1.5 / 2.5 / 5 / 10 RF): small finds return part of
  the pass, and the rare ones are worth chasing (Epic 2.5×, Legendary 5×, Mythic 10×).
- Maximum prize 10 RF: every purchased pass reserves 10 RF of game backing (SDK chance-game rules).
- Outcome names in `game.json` are rarity tiers; each location only changes how a tier looks.
  The Crystal Cave and Sunken Ruins reuse the same table and contract; only the finds look different.

### Why the chest always comes

An Expedition Pass is the SDK's chance-game consumable: `client.play` fixes the find when the Friend sets out,
and the SDK rule is "one bait always creates one result" (the reference fishing game: reeling "does not change
the RF odds"). Paid outcomes are decided by the contract, not by the player's skill, and a paid result must
always be revealable (`settle`, "Resume expedition"). So losing all hearts ends the run early and costs the
chest bonus XP, but the find is still delivered. Skill pays in XP only.

### Outfitter (RF sink, simulated)

| Item | Price | Effect |
| --- | ---: | --- |
| Spring Boots | 3 RF | double jump in the forest |
| Trail Backpack | 4 RF | +1 heart per expedition, in every place |
| Cave Lantern | 5 RF | opens the Crystal Cave |
| Ruins Map | 8 RF | opens the Sunken Ruins |
| Spark Trail | 4 RF | cosmetic trail behind the Friend |
| Harvest Season: Falling Leaves | 5 RF | cosmetic trail, until Nov 30 |

Outfitter purchases are never refunded. The proposed split mirrors the Rare Friends protocol rule:
**50% burned, 50% to Friend rewards**. FriendSDK v0.1.2 has no upgrade/cosmetic API, so these
purchases are simulated on top of the SDK ledger and last for the session. None of them change RF odds.

## Page layout (`host.css`)

The trusted runtime page centres the standard 960 × 640 frame (smaller only on small screens) inside a
wooden pixel frame (no title or header outside the container), on a night-forest backdrop: gradient sky, stars, a hill ridge and
three rows of pixel pines. The SDK toolbar and menus keep their positions and use the game's night palette.
On phones and short screens the frame gets thinner.

## Known limitations

- The SDK sandbox has no storage: XP, level, owned gear and cosmetics reset on reload.
- Outfitter purchases need a custom RF integration (burn + rewards split) before live use.
- Which cave and ruins finds you hold is remembered for the session only; the SDK inventory counts finds by rarity tier.

## Sound

Sound is on by default and starts with the player's first click, tap or key press (browsers do not allow audio before that); ♪ mutes it. Everything is synthesized
in code with Web Audio (`audio.ts`): no recordings or samples.

- **Music:** a calm tune by the campfire; in the forest the tune follows the time of day
  (bright morning and day, warm evening, soft night).
- **Ambience:** campfire crackle and crickets in the camp; birds by day and crickets at night in the forest.
- **Rain follows its strength:** light rain is a quiet patter, heavy rain a dense downpour, and a
  thunderstorm adds low rumble and a thunder clap with every lightning flash. Music gets quieter as the
  rain gets heavier; the campfire hisses less in heavy rain.
- **Effects:** footsteps (grass or path), jump and double jump, landing, sparks (pitch rises with a
  streak), hits, hearts, Heavy Stomp and Bone Guard shield. Chest reveals, purchases and sales use the
  SDK sound kit.
- **Settings:** sound on/off, music on/off and a volume slider. Audio pauses when the game is paused or
  the tab is hidden.

## Artwork and audio

All pixel art (camp, forest, finds, chest, UI) is drawn in code for this project. The Friend uses the
canonical Rare Friends Generations sprites from the SDK (see the SDK NOTICE). UI and reveal sounds use the SDK's
procedural `createFriendSoundKit`; music, ambience and run effects are synthesized in `audio.ts`.

## Run

```sh
npm install
npx friendsdk dev games/expeditions
npx friendsdk check games/expeditions
```
