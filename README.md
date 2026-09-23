# Rare Friends: Expeditions

Send your Rare Friend from a cozy night camp on short expeditions: a forest runner, a dark cave descent and a trap-filled ruins maze.
Every expedition costs one Expedition Pass (1 RF) and ends at a chest with a find that you keep
or sell back for RF. An outfitter sells gear and cosmetics as a pure RF sink (50% burn / 50% rewards).

**Play the preview:** https://dedq3e.github.io/rare-friends-expeditions/
(needs a browser wallet on Robinhood mainnet, chain 4663, holding a hardwired Rare Friends Generations NFT, generation ≥ 1)

Built with **FriendSDK v0.1.2** for the Rare Friends Vibeathon (September 2026).
All balances, purchases, finds and sales are **simulated**.

## Run locally

Node.js 22+ on Linux or Ubuntu/WSL2:

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
npm run build                           # static build into docs/ (GitHub Pages)
```

## Layout

| Path | What |
| --- | --- |
| `games/expeditions/index.tsx` | Game component: camp UI, panels, SDK actions |
| `games/expeditions/engine.ts` | Canvas scenes: camp and forest runner (240×160, pixel-scaled) |
| `games/expeditions/art.ts` | Pixel art drawn in code: Friend sprite, scenery, finds, trails |
| `games/expeditions/game.json` | Economy: pass price, outcome weights, merchant prices |
| `games/expeditions/README.md` | Controls, exact rules and economy |
| `docs/` | Static build served by GitHub Pages |

Game rules and the full economy table: [games/expeditions/README.md](games/expeditions/README.md).

## License and credits

Code: Apache-2.0. The Friend character uses canonical Rare Friends Generations sprites and the SDK
sound kit, used under the FriendSDK [NOTICE](https://github.com/spokesz/friendsdk/blob/main/NOTICE.md).
All other artwork (camp, forest, finds, chest, UI) was drawn in code for this project.
