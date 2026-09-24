# Rare Friends: Expeditions

![Night camp with the expedition board, Outfitter, Collection and Merchant](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/camp.png)

🕹️ **Play: https://dedq3e.github.io/rare-friends-expeditions/**

**Project name**
Rare Friends: Expeditions

**Builder / contact**
[DEDQ3E](https://github.com/DEDQ3E) · Discord `dedq3e3` · Telegram [@DEDQ3E](https://t.me/DEDQ3E)

**Category**
Economy Potential

**One sentence**
Your own Generations Friend goes on 1 RF expeditions through three mini-games and brings back finds you either sell for RF or keep for an XP bonus, while an Outfitter burns half of every RF it takes (all simulated in this preview).

## What did you build?

A night camp from which your Rare Friend sets out on short expeditions, each paid for with a 1 RF Expedition Pass and each ending at a chest with one find to keep or sell. Three places, three different mini-games: the **Whispering Forest** (a side-scrolling runner with weather and time of day), the **Crystal Cave** (a lantern-lit descent on a rope through four zones) and the **Sunken Ruins** (a top-down trap gauntlet against a 75-second hourglass). Around them: a Merchant that buys finds at fixed prices, an Outfitter that sells gear and trails as an RF sink, a collection with a hero card, an Economy panel, Friend perks, emotes, a limited Harvest Season and procedural music. Everything lives inside the SDK's 960 × 640 container, and on phones the panels switch to a compact layout.

## How does it use Rare Friends?

The selected, ownership-verified Friend is the hero of every expedition. Its canonical Generations frames are read through the SDK and drawn in the canonical look (black mask, white one-pixel halo), with its own shape and walk animation. Nothing is worn on it or drawn over it: gear only changes gameplay, the torch and the cave lantern are held beside it, trails are particles behind it, and it is redrawn after rain, darkness and light overlays so nothing tints it. Its **family** picks one of nine perks and its **generation** (one read-only `generation(tokenId)` call on the Generations contract) sets the strength, from rank V for Generation 1 to rank I for Generation 5, so different Friends play differently. The SDK runtime handles the wallet, Friend selection and the ownership gate; the game adds no wallet code.

## How RF is spent, and the economy

**Two independent RF loops**, both shown in the game's Economy panel:

| Loop | Player pays | Player gets back | Where the rest goes |
|---|---|---|---|
| Expedition Pass (SDK chance game, repeatable) | 1 RF per pass | one find, worth 0.90 RF on average at the Merchant | 10% edge stays in the game bank; every pass reserves the 10 RF top prize, so the bank can always pay |
| Outfitter (pure sink) | 3–8 RF per item, 29 RF for the full catalog | nothing: never refunded, no effect on odds | 50% burned, 50% to Friend rewards (proposed protocol split) |

**Hold or redeem.** A find is a *productive keepsake*: while the Friend keeps it, it adds XP to every expedition, and selling it at the Merchant pays its fixed RF and gives the bonus up. Common +1%, Uncommon +2%, Rare +4.5%, Epic +8%, Legendary +17%, Mythic +36%, up to +50% in total. Rarer finds give more bonus per RF they hold back (2.5% per RF for a Common, 3.6% per RF for a Mythic), so the biggest prizes are the ones most worth keeping and **their RF stays in the game as backing** instead of returning to circulation. The bonus depends on rarity only, because the SDK inventory (and, live, the ERC-1155 balances) counts finds by rarity tier: a Rare from the forest, the cave or the ruins gives the same bonus. It changes XP only, never odds, prices or finds.

**Per pass:** expected return 0.90 RF, standard deviation 1.34 RF, 23% chance of getting 1 RF or more back.

**Sessions** (exact distribution over every possible outcome from `game.json`, every find sold, no sampling; reproduce with `npm run sessions`):

| Passes | Mean back | 10th pct | Median | 90th pct | 99th pct | Sessions ending ahead |
|---:|---:|---:|---:|---:|---:|---:|
| 10 (10 RF) | 9.00 RF | 4.60 RF | 8.00 RF | 14.95 RF | 22.40 RF | 31% |
| 30 (30 RF) | 27.00 RF | 18.45 RF | 26.05 RF | 36.85 RF | 47.75 RF | 30% |

Most sessions lose a little, about three in ten end ahead, and big finds are rare but real. The edge is small enough to keep players coming back and large enough to fund the bank.

**Why players keep spending RF:** harder places behind gear (Cave Lantern 5 RF, Ruins Map 8 RF, with ×1.5 and ×2 XP), gear and trails that change the run and the look but never the odds, a Harvest Season trail sold only until Nov 30, keepsakes worth holding, and a Twig Torch crafted from 10 junk finds, so even a 0 RF chest moves progress.

## What would be on-chain?

Nothing in this build; no transaction is ever sent. Going live needs no new contract for the pass loop, only a deployment of the SDK's `ChanceGame` with this `game.json` (its RF price and outcome table are immutable):

- `buy` pays RF from the Friend's canonical NFT wallet and mints Expedition Passes into it (non-transferable consumables). Each purchase reserves the 10 RF top prize from the game's stake.
- `play` burns a pass and commits the play when the Friend sets out.
- A sponsor pays the Dice fee, the oracle records one random word, and anyone can `settle`: the find is minted as a permanent ERC-1155 reward into the canonical NFT wallet.
- `redeem` burns a find for its fixed RF, back into the same NFT wallet, with no expiry. Reserves for unused passes, pending plays and kept finds cannot be withdrawn by the developer.

RF, passes, finds, backing and every outcome would be on-chain. The keepsake bonus becomes a read of the Friend wallet's find balances, so it is verifiable from chain state. XP, levels, gear and the runs stay off-chain. The Outfitter's 50% burn / 50% rewards split needs a custom RF integration, and saved progress needs storage that FriendSDK v0.1.2 does not supply.

## How does it use randomness?

Only the find is a paid random outcome. In the preview it comes from the SDK's simulated ledger; live, it is the SDK's Dice commit-and-reveal flow: the pass is burned and the play committed before any randomness exists, one request per play, no reroll, and a slow delivery resumes the same play ("Resume expedition") without another pass. The browser never chooses the find, and the chest is delivered even if the Friend runs out of hearts: the SDK rule is one pass, one result. Obstacles, creatures, weather and pickups are browser-random gameplay with no RF value; skill and weather change XP only.

## Source code

[GitHub repository](https://github.com/DEDQ3E/rare-friends-expeditions) · reviewed build: commit [`efc2d45`](https://github.com/DEDQ3E/rare-friends-expeditions/tree/efc2d45350e5666504151f96e58100702d691d91) · FriendSDK v0.1.2 · React 19 · TypeScript · [Game rules](https://github.com/DEDQ3E/rare-friends-expeditions/blob/main/games/expeditions/README.md) · [Economy (`game.json`)](https://github.com/DEDQ3E/rare-friends-expeditions/blob/main/games/expeditions/game.json)

## Playable demo / how to run

**Play: https://dedq3e.github.io/rare-friends-expeditions/** (GitHub Pages, built with `friendsdk build`). You need a browser wallet holding a hardwired Rare Friends Generations NFT (generation 1 or higher) on Robinhood mainnet (chain 4663). No RF funding or transaction signature is needed. On a phone, open the link in your wallet app's built-in browser (for example MetaMask → Browser) and hold the phone sideways: regular mobile browsers have no wallet extension.

To run locally with Node.js 22+ on Linux, Windows with WSL2 (both supported by FriendSDK) or native Windows (verified on Windows 11 with Node.js 24):

```sh
git clone https://github.com/DEDQ3E/rare-friends-expeditions.git
cd rare-friends-expeditions
npm ci
npm run dev        # http://localhost:4173
```

Step-by-step notes for each platform: [Run locally](https://github.com/DEDQ3E/rare-friends-expeditions#run-locally).

## How do you play?

1. **Camp:** walk with W A S D or the arrows (on touch, the on-screen pad) and press **E** at a place, or tap its label. At the **Expeditions** board buy passes, pick a place and press **Set out!** The find is committed at this moment.
2. **Whispering Forest (~25 s):** jump with W / Space / ↑ or a tap (Spring Boots add a double jump), move with A / D, drop with S. Collect sparks; roots, rocks, slimes, hedgehogs, bees and bats cost a heart. Each expedition rolls its own time of day and rain, shown as a forecast on the board; rain pays a little more XP (×1.1 / ×1.2 / ×1.3).
3. **Crystal Cave (Cave Lantern, 5 RF):** the Friend is lowered on a rope: steer with A / D, hold W / Space / tap to slow down, S to dive. Four zones: ledges and spiders, drafts, bats and falling rocks with a warning, narrow gates and swinging slabs, then everything at once. Crystals give XP ×1.5.
4. **Sunken Ruins (Ruins Map, 8 RF):** top-down, tile by tile to the altar before the sand runs out: spike plates in waves, dart traps, rolling boulders, crumbling floor over pits and fire vents, in three ever harder halls. Relic shards give XP ×2.
5. **Chest:** the find is revealed. **Keep it** for its keepsake bonus, or **sell** it.
6. **Merchant:** buys finds at fixed prices with no expiry and shows each find's keepsake bonus.
7. **Outfitter:** Spring Boots (double jump, 3 RF), Trail Backpack (+1 heart, 4 RF), Cave Lantern (5 RF), Ruins Map (8 RF), Spark Trail (4 RF) and the Harvest Season Falling Leaves trail (5 RF, until Nov 30). The workbench turns 10 junk finds into a Twig Torch that glows at night.
8. **Collection:** a hero card (portrait, family, generation, perk, level, keepsake bonus, best find) and the finds of all three places. **Economy panel:** tap the RF balance to see where every RF goes.

Pickups give 1 XP each plus a bonus for reaching the chest (doubled without a hit), multiplied by the place, the Friend's perk and its keepsakes. XP raises the level and title over ten levels up to 2,500 XP, from Novice to Legend. Settings: sound (on by default, starts with the first click or key), music, volume and reduce motion; the game honors the runtime's `paused` state. Keyboard and touch are both supported.

## Costs and rewards

**Everything is simulated.** You start with 20 RF; each pass costs 1 RF and gives exactly one find. All three places share one table; the place only changes how a find looks.

| Find (forest) | Rarity | Chance | Merchant pays | Keepsake bonus |
|---|---|---:|---:|---:|
| Dry Twig | Junk | 20% | 0 RF | — |
| Acorn | Common | 35% | 0.4 RF | +1% XP |
| Porcini | Uncommon | 22% | 0.75 RF | +2% XP |
| Owl Feather | Rare | 13% | 1.5 RF | +4.5% XP |
| Amber Beetle | Epic | 6% | 2.5 RF | +8% XP |
| Golden Scarab | Legendary | 3% | 5 RF | +17% XP |
| Heart of the Forest | Mythic | 1% | 10 RF | +36% XP |

Expected reward **0.90 RF per pass** (10% game edge, price curve as in the SDK fishing reference). Each purchased pass reserves the 10 RF top prize; kept finds retain backing and have no redemption expiry. **Outfitter purchases are never refunded**: 50% is burned and 50% goes to Friend rewards (proposed split, simulated on top of the SDK ledger because FriendSDK v0.1.2 has no upgrade API). Nothing in the Outfitter changes RF odds.

## What have you tested?

All pass: `npm run typecheck`; `npm run check` (game validation: expected reward 0.9 RF, maximum 10 RF); `npm test` (SDK browser fixture at 960 px); `npm run economy` (exact odds across all 10,000 rolls, expected return, reserve, the keepsake curve, and every published odds and session table checked against `game.json` and `npm run sessions`); `npm run playthrough` (a Playwright playthrough of the whole loop: camp walking, buying passes, the forest run, chest, selling, Outfitter, collection, economy panel, the Crystal Cave and the Sunken Ruins); `npm run compliance` (the SDK container stays at most 960 × 640 at 3:2 on five screen sizes, the sandbox is `allow-scripts`, the toolbar is not cut off); and `npm run mobile` (the camp and every panel at 390 × 844, 844 × 390 and 740 × 360, plus a run and the chest sideways). A fresh clone builds with `npm ci`, and the published `docs/` matches a fresh build. Browser tests use the SDK's mock wallet and simulated RPC.

The public preview was played by hand with a real wallet on Robinhood mainnet holding a Generations NFT, including on a phone in a wallet browser (wallet connection, Friend selection, ownership gate and the full expedition loop). It was repeated on the build with the keepsake bonus.

## Known limitations

The SDK sandbox has no storage, so XP, level and Outfitter items reset when the session ends. The Outfitter burn / rewards split needs a custom RF integration before live use. Which cave and ruins finds you hold is remembered per session, because the SDK inventory counts rarity tiers. Live mode has never run against a deployed contract. No funds are at risk in the preview: it never asks for a transaction, a signature or an RF approval; the wallet is only used to connect, switch to Robinhood mainnet and prove ownership. No live token spending, trading, wearable NFTs or creator fees are included.

**Roadmap (not in this MVP):** passes on the SDK's live `ChanceGame`; finds as tradable assets paired with $RAREFRIENDS, where the fixed Merchant price is a built-in price floor and a creator fee on trades flows to the game bank and Friend rewards; a new limited Outfitter item and themed finds every season; persistent XP, levels and gear once the SDK offers storage.

## Credits

All camp, forest, cave, ruins, find, chest and UI artwork is drawn in code for this project; music, ambience and effects are synthesized with Web Audio. The game ships no image, font or audio files and no third-party assets. The Friend uses the canonical Rare Friends Generations sprites and the SDK sound kit under the [FriendSDK NOTICE](https://github.com/spokesz/friendsdk/blob/main/NOTICE.md).

| | | |
|---|---|---|
| ![Expedition board with odds and prices](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/board.png) | ![Economy panel](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/economy.png) | ![Expedition board on a phone](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/phone-board.png) |
| ![Whispering Forest](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/forest.png) | ![Crystal Cave](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/cave.png) | ![Sunken Ruins](https://raw.githubusercontent.com/DEDQ3E/rare-friends-expeditions/main/media/ruins.png) |
