// Records the one-minute gameplay demo (docs/demo.mp4, H.264) with the SDK's mock wallet: the camp and the
// Expedition board, a forest run, the chest, a Crystal Cave descent and a Sunken Ruins crossing, each ending at
// its chest. Shopping (Trail Backpack, Cave Lantern, Ruins Map) happens off camera; the recording is cut to the
// gameplay and cropped to the game container.
// testGame has no video option and forces reduced motion, so its Chromium contexts are opened with recordVideo
// and full motion instead. Needs Playwright and ffmpeg: `npm install --no-save playwright ffmpeg-static`
// (or set FFMPEG to an ffmpeg binary). Usage: node tests/demo.mjs
import { chromium } from "playwright";
import { testGame } from "@rarefriends/friendsdk/testing";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const W = 1280, H = 800, dir = ".build-video", out = "docs/demo.mp4";
const ffmpeg = process.env.FFMPEG || (await import("ffmpeg-static")).default;
try { rmSync(dir, { recursive: true, force: true }); } catch { /* left over from a previous run */ }
mkdirSync(dir, { recursive: true });

let t0 = 0; // when the recorded page was created: the video starts here
const launch = chromium.launch.bind(chromium);
chromium.launch = async options => {
  const browser = await launch(options), newContext = browser.newContext.bind(browser), close = browser.close.bind(browser);
  browser.newContext = async o => {
    const context = await newContext({ ...o, reducedMotion: "no-preference", recordVideo: { dir, size: { width: W, height: H } } });
    const newPage = context.newPage.bind(context);
    context.newPage = async () => { const page = await newPage(); t0 = Date.now(); return page; };
    return context;
  };
  // closing the contexts first makes Playwright finish writing the video before the browser goes away
  browser.close = async () => { for (const c of browser.contexts()) await c.close(); return close(); };
  return browser;
};

const marks = {};
let frame;
await testGame("./games/expeditions", {
  width: W, height: H, timeout: 240000,
  check: async ({ page, game }) => {
    const hold = ms => page.waitForTimeout(ms);
    const mark = name => { marks[name] = (Date.now() - t0) / 1000; };
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    const key = async (k, ms) => { await page.keyboard.down(k); await hold(ms); await page.keyboard.up(k); };
    const chest = async () => { await game.getByRole("dialog").waitFor({ timeout: 90000 }); mark(`chest${Object.keys(marks).length}`); };
    frame = await page.evaluate(() => { const r = document.querySelector(".rf-game-frame").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });

    // off camera: close the start guide and buy gear for all three places (4 + 5 + 8 RF of the 20 RF start)
    await game.getByRole("heading", { name: /^Guide/ }).waitFor();
    for (const name of ["Next", "Next", "Let's go!"]) await game.getByRole("button", { name }).click();
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    for (const price of [4, 5, 8]) await game.getByRole("button", { name: new RegExp(`Buy · ${price} RF`) }).first().click();
    await game.getByRole("button", { name: "Close" }).click(); await hold(800);

    // camp → board → forest run → chest
    mark("camp");
    await game.locator("canvas").click({ position: { x: 640, y: 380 } });
    await key("KeyS", 300); await key("KeyA", 2400); await key("KeyW", 450);
    await game.getByText(/Press E to open Expeditions/).waitFor();
    await hold(300); await page.keyboard.press("KeyE");
    await game.getByRole("heading", { name: "Expedition board" }).waitFor(); await hold(900);
    await game.getByRole("button", { name: /^Buy 3/ }).click(); await confirm();
    await game.getByText(/3 expedition passes added/).waitFor(); await hold(500);
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    mark("forest");
    await hold(1200); await key("KeyD", 500);
    for (let i = 0; i < 120 && !(await game.getByRole("dialog").count()); i++) {
      await key(i % 2 ? "KeyW" : "Space", 130); await hold(i % 3 === 0 ? 520 : 330);
    }
    await chest(); await hold(2600); await game.getByRole("button", { name: "Keep it" }).click(); await hold(600);

    // Crystal Cave
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Crystal Cave/ }).click(); mark("caveBoard"); await hold(1200);
    await game.getByRole("button", { name: "Into the cave!" }).click(); await confirm();
    mark("cave");
    await hold(2500); await key("KeyD", 500);
    for (let i = 0; i < 90 && !(await game.getByRole("dialog").count()); i++) {
      await key(i % 4 < 2 ? "KeyA" : "KeyD", 250); if (i % 9 === 5) await key("KeyS", 500); await hold(250);
    }
    await chest(); await hold(2600); await game.getByRole("button", { name: "Keep it" }).click(); await hold(600);

    // Sunken Ruins
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Sunken Ruins/ }).click(); mark("ruinsBoard"); await hold(1200);
    await game.getByRole("button", { name: "Enter the ruins!" }).click(); await confirm();
    mark("ruins");
    await hold(1500);
    for (let i = 0; i < 500 && !(await game.getByRole("dialog").count()); i++) {
      const k = i % 12 === 5 ? "KeyD" : i % 12 === 11 ? "KeyA" : "KeyW";
      await key(k, 90); await hold(110);
    }
    await chest(); await hold(2800); await game.getByRole("button", { name: "Keep it" }).click(); await hold(1500);
    mark("end");
  },
});

const video = readdirSync(dir).find(f => f.endsWith(".webm"));
if (!video) throw new Error("no video was recorded");
const src = join(dir, video);
for (let last = -1, size = statSync(src).size; size !== last; size = statSync(src).size) {
  last = size; await new Promise(r => setTimeout(r, 2000));
}

// about 60 s of gameplay: each run is shown from its start, then cut to its chest
const [c1, c2, c3] = Object.keys(marks).filter(k => k.startsWith("chest")).map(k => marks[k]);
const cuts = [
  [marks.camp, Math.min(marks.forest + 14, c1 - 0.5)], [c1 - 0.5, c1 + 3],
  [marks.caveBoard, Math.min(marks.cave + 13, c2 - 0.5)], [c2 - 0.5, c2 + 3],
  [marks.ruinsBoard, Math.min(marks.ruins + 13, c3 - 0.5)], [c3 - 0.5, marks.end],
];
const even = n => Math.round(n / 2) * 2;
const crop = `crop=${even(frame.w)}:${even(frame.h)}:${even(frame.x)}:${even(frame.y)}`;
const filter = cuts.map(([a, b], i) => `[0:v]trim=start=${a.toFixed(2)}:end=${b.toFixed(2)},setpts=PTS-STARTPTS[s${i}]`).join(";")
  + `;${cuts.map((_, i) => `[s${i}]`).join("")}concat=n=${cuts.length}:v=1:a=0,${crop},fps=30,format=yuv420p[v]`;
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", src, "-filter_complex", filter, "-map", "[v]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-movflags", "+faststart", out], { stdio: "inherit" });
try { rmSync(dir, { recursive: true, force: true }); } catch { /* the browser may still hold the file for a moment */ }
const length = cuts.reduce((t, [a, b]) => t + b - a, 0);
console.log(`demo video: ${out}, ${length.toFixed(1)} s, ${(statSync(out).size / 1e6).toFixed(1)} MB`);
