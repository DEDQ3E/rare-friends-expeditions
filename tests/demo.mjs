// Records the one-minute demo video (docs/demo.webm, served by GitHub Pages) with the SDK's mock wallet:
// start guide, camp, Trail Rations, the Expedition board, a forest run, the chest, the wardrobe, the hero card
// and the Economy panel.
// testGame has no video option and forces reduced motion, so its Chromium contexts are opened with
// recordVideo and full motion instead. Usage: node tests/demo.mjs
import { chromium } from "playwright";
import { testGame } from "@rarefriends/friendsdk/testing";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const W = 1280, H = 800, dir = ".build-video";
try { rmSync(dir, { recursive: true, force: true }); } catch { /* left over from a previous run */ }
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) try { rmSync(join(dir, f)); } catch { /* still locked */ }
const launch = chromium.launch.bind(chromium);
chromium.launch = async options => {
  const browser = await launch(options), newContext = browser.newContext.bind(browser), close = browser.close.bind(browser);
  browser.newContext = o => newContext({ ...o, reducedMotion: "no-preference", recordVideo: { dir, size: { width: W, height: H } } });
  // closing the contexts first makes Playwright finish writing the video before the browser goes away
  browser.close = async () => { for (const c of browser.contexts()) await c.close(); return close(); };
  return browser;
};

await testGame("./games/expeditions", {
  width: W, height: H, timeout: 120000,
  check: async ({ page, game }) => {
    const hold = ms => page.waitForTimeout(ms);
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    const key = async (k, ms) => { await page.keyboard.down(k); await hold(ms); await page.keyboard.up(k); };
    // start guide
    await game.getByRole("heading", { name: /^Guide/ }).waitFor();
    await hold(2200); await game.getByRole("button", { name: "Next" }).click();
    await hold(2400); await game.getByRole("button", { name: "Next" }).click();
    await hold(2200); await game.getByRole("button", { name: "Let's go!" }).click();
    // pack a Trail Ration at the Outfitter
    await hold(600); await game.getByRole("button", { name: /^Outfitter/ }).click(); await hold(1400);
    await game.getByRole("button", { name: "Buy 1 · 0.2 RF" }).click(); await hold(1600);
    await game.getByRole("button", { name: "Close" }).click();
    // walk to the board and open it
    await game.locator("canvas").click({ position: { x: 640, y: 380 } });
    await key("KeyS", 300); await key("KeyA", 2400); await key("KeyW", 450);
    await game.getByText(/Press E to open Expeditions/).waitFor();
    await hold(500); await page.keyboard.press("KeyE");
    await game.getByRole("heading", { name: "Expedition board" }).waitFor();
    await hold(1500);
    await game.getByRole("button", { name: /^Buy 3/ }).click(); await hold(600); await confirm();
    await game.getByText(/3 expedition passes added/).waitFor(); await hold(800);
    await game.getByRole("button", { name: "Set out!" }).click(); await hold(600); await confirm();
    // the forest run: move ahead a little and jump over trouble until the chest
    await hold(1200); await key("KeyD", 500);
    for (let i = 0; i < 120 && !(await game.getByRole("dialog").count()); i++) {
      await key(i % 2 ? "KeyW" : "Space", 130); await hold(i % 3 === 0 ? 520 : 330);
    }
    await game.getByRole("dialog").waitFor({ timeout: 30000 });
    await hold(2600); await game.getByRole("button", { name: "Keep it" }).click();
    // the wardrobe: dress the Friend, then show it in the camp
    await hold(700); await game.getByRole("button", { name: /^Outfitter/ }).click();
    await game.getByRole("heading", { name: "Wardrobe" }).scrollIntoViewIfNeeded(); await hold(900);
    await game.locator(".xp-wear", { hasText: "Wizard Hat" }).getByRole("button").click(); await hold(900);
    await game.locator(".xp-wear", { hasText: "Red Cape" }).scrollIntoViewIfNeeded(); await hold(500);
    await game.locator(".xp-wear", { hasText: "Red Cape" }).getByRole("button").click(); await hold(1400);
    await game.getByRole("button", { name: "Close" }).click();
    await key("KeyD", 1300); await hold(300); await key("KeyS", 400); await hold(900);
    // the hero card: family, generation, perk, level
    await game.getByRole("button", { name: /^Collection/ }).click(); await hold(3000);
    await game.getByRole("button", { name: "Close" }).click(); await hold(500);
    // where every RF goes
    await game.locator(".xp-money").click(); await hold(3600);
    await game.getByRole("button", { name: "Close" }).click(); await hold(2500);
  },
});

const video = readdirSync(dir).find(f => f.endsWith(".webm"));
if (!video) throw new Error("no video was recorded");
// copy only once the file has stopped growing, so the published video is never cut short
for (let last = -1, size = statSync(join(dir, video)).size; size !== last; size = statSync(join(dir, video)).size) {
  last = size; await new Promise(r => setTimeout(r, 2000));
}
copyFileSync(join(dir, video), "docs/demo.webm");
try { rmSync(dir, { recursive: true, force: true }); } catch { /* the browser may still hold the file for a moment */ }
console.log("demo video: docs/demo.webm");
