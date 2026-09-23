# Rare Friends: Expeditions

Send your Rare Friend from a cozy night camp on short expeditions: a forest runner, a dark cave descent and a trap-filled ruins maze.
Every expedition costs one Expedition Pass (1 RF) and ends at a chest with a find that you keep
or sell back for RF. An outfitter sells gear and cosmetics as a pure RF sink (50% burn / 50% rewards).

**Play the preview:** https://dedq3e.github.io/rare-friends-expeditions/
(needs a browser wallet on Robinhood mainnet, chain 4663, holding a hardwired Rare Friends Generations NFT, generation ≥ 1)

On a phone, open the link in your wallet app's built-in browser (MetaMask → Browser, Trust Wallet → Browser) and hold the phone sideways.

| | | |
|---|---|---|
| ![Night camp](media/camp.png) | ![Expedition board with odds and prices](media/board.png) | ![Economy panel](media/economy.png) |
| ![Whispering Forest](media/forest.png) | ![Crystal Cave](media/cave.png) | ![Sunken Ruins](media/ruins.png) |

On a phone held sideways the panels switch to a compact layout:

![Expedition board on a phone](media/phone-board.png)

Economy design, simulations and the roadmap: [submission/README.md](submission/README.md#economy-design).

Built with **FriendSDK v0.1.2** for the Rare Friends Vibeathon (September 2026).
All balances, purchases, finds and sales are **simulated**.

## Run locally

Node.js 22+ on Linux, WSL2 or Windows:

```sh
git clone https://github.com/DEDQ3E/rare-friends-expeditions.git
cd rare-friends-expeditions
npm install
npm run dev        # http://localhost:4173
```

Windows without Node: double-click `play.bat`. It serves the prebuilt `docs/` folder on
`http://localhost:4173` with built-in PowerShell.

## Checks

```sh
npm run typecheck                       # TypeScript
npm run check                           # friendsdk game + economy validation
npm install -D playwright && npx playwright install chromium
npm test                                # SDK browser smoke test (mock wallet)
npm run playthrough                     # buy → expedition → chest → sell → outfitter → collection
npm run mobile                          # phone sizes: camp and every panel; a run and the chest sideways
npm run build                           # static build into docs/ (GitHub Pages)
```

## Layout

| Path | What |
| --- | --- |
| `games/expeditions/index.tsx` | Game component: camp UI, panels, SDK actions |
| `games/expeditions/engine.ts` | Canvas engine (240×160, pixel-scaled): camp, forest runner, hosts the cave and ruins scenes |
| `games/expeditions/cave.ts`, `ruins.ts` | Crystal Cave rope descent and Sunken Ruins trap gauntlet |
| `games/expeditions/audio.ts` | Music, ambience and effects synthesized with Web Audio |
| `games/expeditions/art.ts` | Pixel art drawn in code: Friend sprite, scenery, finds, trails |
| `games/expeditions/game.json` | Economy: pass price, outcome weights, merchant prices |
| `games/expeditions/README.md` | Controls, exact rules and economy |
| `docs/` | Static build served by GitHub Pages |
| `tests/` | Playthrough, container compliance, phone layout and README screenshot scripts |
| `media/` | Screenshots used in the READMEs (`node tests/media.mjs media`) |

Game rules and the full economy table: [games/expeditions/README.md](games/expeditions/README.md).

## License and credits

Code: Apache-2.0. The Friend character uses canonical Rare Friends Generations sprites and the SDK
sound kit, used under the FriendSDK [NOTICE](https://github.com/spokesz/friendsdk/blob/main/NOTICE.md).
All other artwork (camp, forest, cave, ruins, finds, chest, UI) was drawn in code for this project.
