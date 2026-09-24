// Wardrobe fit test: every piece on every body type and on the SDK's recorded Friends #7730 and #3412, facing
// front and sideways. Fails when a piece is invisible, drifts away from the Friend, or a hat covers the Friend.
// Writes the fit sheet to <out>/wardrobe-fit.png. Usage: node tests/wardrobe.mjs [outDir]
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "/tmp";
mkdirSync(out, { recursive: true });
const entry = `
import { checkFits, renderSheet } from "./tests/wardrobe-sheet.ts";
import { sampleFriendSprites } from "@rarefriends/friendsdk/examples/fishing/sample-sprites.ts";
import { spriteFrame } from "@rarefriends/friendsdk/sprites";
const real = {};
for (const id of [7730n, 3412n]) {
  const art = sampleFriendSprites(id);
  if (art) real["#" + id] = { down: spriteFrame(art, "down", false, 0, "right").frame.rows, right: spriteFrame(art, "right", true, 1, "right").frame.rows };
}
window.fitProblems = checkFits(real);
window.realCount = Object.keys(real).length;
renderSheet(document.getElementById("sheet"), real);
window.done = true;`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", logLevel: "silent",
  alias: { "@rarefriends/friendsdk/examples": "./node_modules/@rarefriends/friendsdk/examples" } });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<body style="margin:0;background:#171a36"><canvas id="sheet" style="image-rendering:pixelated"></canvas></body>`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.done === true);
  const problems = await page.evaluate(() => window.fitProblems), real = await page.evaluate(() => window.realCount);
  await page.locator("#sheet").screenshot({ path: `${out}/wardrobe-fit.png` });
  if (real < 2) throw new Error("the SDK's recorded sample Friends were not loaded");
  if (problems.length) throw new Error(`wardrobe fit problems:\n  ${problems.join("\n  ")}`);
  console.log(`wardrobe: every piece fits ${8 + real} bodies (front and side); sheet ${out}/wardrobe-fit.png`);
} finally { await browser.close(); }
