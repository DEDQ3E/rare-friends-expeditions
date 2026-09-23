# Rare Friends: Expeditions

Send your Rare Friend from a night camp on short expeditions (a forest runner, a lantern-lit cave descent and a top-down ruins trap gauntlet): buy a 1 RF pass, play the run, and bring back a chest with a find you keep or sell for RF.

**Builder:** [DEDQ3E](https://github.com/DEDQ3E) · **Contact:** Discord `dedq3e3`, Telegram [@DEDQ3E](https://t.me/DEDQ3E) · **Category:** Economy Potential · **SDK:** FriendSDK v0.1.2

Your selected Generations NFT is the hero of every expedition, and $RAREFRIENDS powers two independent spend loops: repeatable Expedition Passes (SDK chance game) and an Outfitter RF sink (50% burn / 50% Friend rewards). [Source code](https://github.com/DEDQ3E/rare-friends-expeditions) · [Game rules](https://github.com/DEDQ3E/rare-friends-expeditions/blob/main/games/expeditions/README.md) · [Economy](https://github.com/DEDQ3E/rare-friends-expeditions/blob/main/games/expeditions/game.json)

## Play it

**Public preview:** https://dedq3e.github.io/rare-friends-expeditions/

Requires a browser wallet on **Robinhood mainnet (4663)** holding a **hardwired Rare Friends Generations NFT (generation ≥ 1)**. The SDK runtime connects the wallet, lists your Friends and verifies ownership before play. No RF funding or transaction signature is needed: everything is simulated.

Run locally (Node.js 22+, Linux or Ubuntu/WSL2):

```sh
git clone https://github.com/DEDQ3E/rare-friends-expeditions.git
cd rare-friends-expeditions
npm install
npm run dev
```

## How to play

1. **Camp:** your Friend rests by the fire. Walk around with W A S D and press E at a place (or tap its label). Open the **Expeditions** board, buy passes (1 RF) and press **Set out!** The find is committed at this moment (`client.play`).
2. **Forest run (~25 s):** a side-scrolling lane: jump with W / Space / ↑ or a tap (Spring Boots add a double jump), move with A / D, drop with S. Collect sparks for XP; roots, slimes and bees cost a heart. Running well gives XP only and never changes the odds. If hearts run out, the run ends and the chest is still delivered without the finish XP bonus: the pass fixed the find at the start (SDK rule: one pass, one result).
3. **Chest:** the find is revealed (`client.settle`). Keep it or sell it.
4. **Merchant:** sell finds at fixed prices with no expiry (`client.redeem`).
5. **Outfitter:** gear: Spring Boots (double jump, 3 RF), Trail Backpack (+1 heart, 4 RF), Cave Lantern (opens the Crystal Cave, 5 RF), Ruins Map (opens the Sunken Ruins, 8 RF); Spark Trail (4 RF), sparkles behind the Friend.
6. **Collection:** a hero card for your Friend (portrait, family, generation, perk, level, expeditions, pickups, best find) and the finds of all three places.
7. **Forest life:** oaks, pines and birches; roots, rocks, poisonous mushrooms and fallen logs; slimes in three colours with different moves, hedgehogs, bees and wasps by day, bats at night and frogs in the rain.
8. **Weather:** each expedition has its own time of day (morning, day, evening, night) and rain (clear, light, heavy, thunderstorm), shown as a forecast on the board. Rain pays a little more XP (×1.1 / ×1.2 / ×1.3) but never changes the odds. The camp weather changes on its own.

9. **Friend perks:** the Friend's family picks a perk (Bone Guard, Spirit Sight, Kindred, Mitosis, Wild Step, Hover, Heavy Stomp, Glitter, Phase); its generation sets the strength, from rank V (Generation 1) to rank I (Generation 5). Generation 6 plays without a perk. Perks affect the run and XP only, never odds, prices or access.
10. **Emotes:** speech bubbles and a celebration where the Friend holds its find up, drawn next to the Friend.
11. **Workbench:** any 10 junk finds (Dry Twigs, Plain Pebbles or Pottery Shards) craft a cosmetic Twig Torch that glows at night.
12. **Economy panel:** tap the RF balance to see where RF goes (game bank, Merchant, Outfitter 50% burn / 50% rewards), with the 0.90 RF expected return, 10% edge and session totals.
13. **Sound (on by default, starts with the first click or key; ♪ mutes):** calm camp music, forest tunes by time of day, campfire and crickets, birds, rain that sounds different when light, heavy or stormy (with thunder), plus footsteps, jumps, hits and pickups. All synthesized in code.
14. **Crystal Cave (second mini-game):** with a Cave Lantern (5 RF) the Friend is lowered down a dark shaft on a rope instead of running: steer with A / D, hold W / Space / tap to slow down, S to dive. Lantern light, glowing crystals and creatures' eyes. Harder than the forest, in four zones: ledges and spiders, then drafts, cave bats, crystal beetles and falling rocks with a warning, then narrow gates and swinging slabs, then everything at once; the rope runs faster the deeper it goes. Crystals give XP (×1.5, chest bonus +10). Same odds and prices, cave-themed finds.
15. **Harvest Season (until Nov 30):** a limited Falling Leaves trail in the Outfitter (5 RF), same 50% burn / 50% rewards split; pumpkins decorate the camp.
16. **Sunken Ruins (third mini-game, hardest):** with a Ruins Map (8 RF) the view turns top-down and the Friend crosses a temple tile by tile to the altar before a 75-second hourglass runs out: spike plates rising in waves, dart traps, rolling boulders, crumbling floor over pits and fire vents, in three ever harder halls. Relic shards give XP (×2, chest bonus +15), the most of the three places. Same odds and prices, ruins-themed finds.

Settings include sound on/off (on by default, starting with the first click or key), music on/off, volume, reduce motion and an explanation of sparks, crystals and relic shards (XP). Keyboard (W A S D / arrows, Space, E, Esc) and touch (on-screen pad and action button) are supported; the game honors the runtime's `paused` state and stops held movement on blur.

**Friend artwork (preserved):** the selected Friend is always drawn from its canonical Generations sprite frames in the canonical look (black mask, white one-pixel halo), with its own shape and walk animation. Nothing is worn on it or drawn over it: gear only changes gameplay, the torch and the cave lantern are held beside it, trails are particles behind it, and it is redrawn after weather, darkness and light overlays so nothing tints it.

**Game container:** all game content and menus render inside the SDK's 960 × 640 container (3:2, smaller only on small screens). The optional `host.css` only centers that container on a themed page with a decorative frame and restyles the SDK toolbar colors; the wallet, Friend selection and confirmations stay the SDK's own controls in their own positions.

## Rules and rewards

**All balances, purchases, finds and sales are simulated.** One Expedition Pass costs 1 RF and produces exactly one find.

| Find | Rarity | Chance | Merchant pays |
|---|---|---:|---:|
| Dry Twig | Junk | 20% | 0 RF |
| Acorn | Common | 35% | 0.4 RF |
| Porcini | Uncommon | 22% | 0.75 RF |
| Owl Feather | Rare | 13% | 1.5 RF |
| Amber Beetle | Epic | 6% | 2.5 RF |
| Golden Scarab | Legendary | 3% | 5 RF |
| Heart of the Forest | Mythic | 1% | 10 RF |

Expected reward: **0.90 RF per pass** (10% game edge, price curve as in the SDK fishing reference); 23% chance of 1 RF or more. Each purchased pass reserves the maximum 10 RF prize; kept finds retain backing and have no redemption expiry. Outcome names in `game.json` are rarity tiers, so the Crystal Cave and Sunken Ruins reuse the same table and only change how finds look.

**Outfitter purchases are never refunded.** The proposed split mirrors the Rare Friends protocol rule: 50% of each purchase is burned and 50% goes to Friend rewards. FriendSDK v0.1.2 has no upgrade or cosmetic API, so these purchases are simulated on top of the SDK ledger. None of them change RF odds.

## Checks, credits and limitations

Checks run: `npm run typecheck` (pass), `npx friendsdk check games/expeditions` (valid; expected reward 0.9 RF, maximum 10 RF), `npx friendsdk test games/expeditions` (automated fixture at 960 px, pass), `npm run playthrough` — a scripted Playwright playthrough with the SDK mock wallet covering camp walking, buying passes, the forest run, chest, selling, Outfitter, collection, economy panel, the Crystal Cave descent and the Sunken Ruins gauntlet (pass), and `npm run compliance` — the SDK container stays at most 960 × 640 with a 3:2 ratio at 1920×1080, 1382×800, 1024×700, 390×844 and 844×390, the game runs in the SDK iframe with `sandbox="allow-scripts"`, and the SDK toolbar labels stay inside the container and are not cut off (pass). Browser tests use mocked wallets and RPC; a real-wallet playthrough on phone and computer is still outstanding.

All camp, forest, cave, ruins, find, chest and UI artwork was drawn in code for this project; music and sound effects are synthesized in code. The Friend uses the canonical Rare Friends Generations sprites and the SDK sound kit under the FriendSDK NOTICE. No trading, wearable NFTs, creator fees or live contracts are included. Known limits: the SDK sandbox has no storage, so XP, level and Outfitter items reset on reload; Outfitter burn/rewards needs a custom RF integration before live use; which cave and ruins finds you hold is remembered per session (the SDK inventory counts rarity tiers). Production publication needs separate Rare Friends review.
