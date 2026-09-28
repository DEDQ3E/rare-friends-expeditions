// Builds the GitHub Pages site into docs/. `friendsdk build` only writes to an empty (or its own) output
// directory, while docs/ also holds .nojekyll (recommended by the SDK for GitHub Pages) and the demo video.
// So the game is built into .build/ first, then its files replace the previous build in docs/.
// Usage: npm run build
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = join(root, ".build"), docs = join(root, "docs"), manifest = ".friendsdk-output.json";
const cli = join(root, "node_modules/@rarefriends/friendsdk/scripts/dev-game.mjs");

rmSync(tmp, { recursive: true, force: true });
execFileSync(process.execPath, [cli, "build", "games/expeditions", "--outdir", tmp], { cwd: root, stdio: "inherit" });
mkdirSync(docs, { recursive: true });
// remove the previous build's files (listed in its manifest), keep everything else (.nojekyll, demo video)
const old = join(docs, manifest);
if (existsSync(old)) for (const f of JSON.parse(readFileSync(old, "utf8")).files) rmSync(join(docs, f), { force: true });
for (const f of readdirSync(tmp)) copyFileSync(join(tmp, f), join(docs, f));
writeFileSync(join(docs, ".nojekyll"), "");
rmSync(tmp, { recursive: true, force: true });
console.log(`docs/ updated: ${JSON.parse(readFileSync(join(docs, manifest), "utf8")).files.join(", ")}`);
