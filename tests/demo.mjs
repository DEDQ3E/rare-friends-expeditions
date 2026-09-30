// Records the one-minute gameplay demo WITH SOUND (docs/demo.mp4, H.264 + AAC) with the SDK's mock wallet: the camp
// and the Expedition board, a forest run, the chest, a Crystal Cave descent and a Sunken Ruins crossing, each ending
// at its chest. Shopping (Trail Backpack, Cave Lantern, Ruins Map) happens off camera.
// The tab is captured as it plays, picture and sound together (tab capture in headless Microsoft Edge); ffmpeg
// then cuts the recording to the gameplay, crops it to the game container and adds short sound fades between scenes.
// testGame forces reduced motion and a muted browser, so its launch and contexts are adjusted here.
// Needs Microsoft Edge, Playwright and ffmpeg: `npm install --no-save playwright ffmpeg-static`
// (or set FFMPEG to an ffmpeg binary). Usage: node tests/demo.mjs
import { chromium } from "playwright";
import { testGame } from "@rarefriends/friendsdk/testing";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const W = 1280, H = 800, dir = ".build-video", out = "docs/demo.mp4", raw = join(dir, "raw.webm");
const ffmpeg = process.env.FFMPEG || (await import("ffmpeg-static")).default;
try { rmSync(dir, { recursive: true, force: true }); } catch { /* left over from a previous run */ }
mkdirSync(dir, { recursive: true });

const launch = chromium.launch.bind(chromium);
chromium.launch = async options => {
  const browser = await launch({ ...options, channel: "msedge", ignoreDefaultArgs: ["--mute-audio"],
    args: [...(options?.args ?? []), "--auto-accept-this-tab-capture", "--autoplay-policy=no-user-gesture-required"] });
  const newContext = browser.newContext.bind(browser);
  browser.newContext = o => newContext({ ...o, reducedMotion: "no-preference", acceptDownloads: true });
  return browser;
};

const marks = {};
let frame;
await testGame("./games/expeditions", {
  width: W, height: H, timeout: 240000,
  check: async ({ page, game }) => {
    const hold = ms => page.waitForTimeout(ms);
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    const key = async (k, ms) => { await page.keyboard.down(k); await hold(ms); await page.keyboard.up(k); };

    frame = await page.evaluate(() => { const r = document.querySelector(".rf-game-frame").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    // a recorder button outside the game (tab capture needs a real click); it removes itself once recording
    await page.evaluate(() => {
      const b = document.createElement("button"); b.id = "rec"; b.textContent = "rec";
      b.style.cssText = "position:fixed;left:0;top:0;opacity:.01;z-index:9"; document.body.append(b);
      b.onclick = async () => {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true, preferCurrentTab: true });
        const r = new MediaRecorder(s, { mimeType: "video/webm;codecs=vp8,opus", videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 160_000 }), parts = [];
        r.ondataavailable = e => parts.push(e.data); r.start(1000); window.__t0 = performance.now(); b.remove();
        window.__stop = () => new Promise(res => { r.onstop = () => {
          s.getTracks().forEach(t => t.stop());
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(parts, { type: "video/webm" })); a.download = "raw.webm";
          document.body.append(a); a.click(); res(true);
        }; r.stop(); });
      };
    });
    await page.click("#rec"); await page.waitForFunction(() => !!window.__stop);
    const mark = async name => { marks[name] = await page.evaluate(() => (performance.now() - window.__t0) / 1000); };
    const chest = async n => { await game.getByRole("dialog").waitFor({ timeout: 90000 }); await mark(`chest${n}`); };

    // off camera: close the start guide and buy gear for all three places (4 + 5 + 8 RF of the 20 RF start)
    await game.getByRole("heading", { name: /^Guide/ }).waitFor(); await hold(1500);
    for (let i = 0; i < 10 && await game.getByRole("heading", { name: /^Guide/ }).count(); i++) {
      await game.getByRole("button", { name: "Close" }).click().catch(() => {}); await hold(700);
    }
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    for (const price of [4, 5, 8]) await game.getByRole("button", { name: new RegExp(`Buy · ${price} RF`) }).first().click();
    await game.getByRole("button", { name: "Close" }).click(); await hold(1500);

    // camp → board → forest run → chest
    await mark("camp");
    await game.locator("canvas").click({ position: { x: 640, y: 380 } });
    await key("KeyS", 300); await key("KeyA", 2400); await key("KeyW", 450);
    await game.getByText(/Press E to open Expeditions/).waitFor();
    await hold(300); await page.keyboard.press("KeyE");
    await game.getByRole("heading", { name: "Expedition board" }).waitFor(); await hold(900);
    await game.getByRole("button", { name: /^Buy 3/ }).click(); await confirm();
    await game.getByText(/3 expedition passes added/).waitFor(); await hold(500);
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    await mark("forest");
    await hold(1200); await key("KeyD", 500);
    for (let i = 0; i < 120 && !(await game.getByRole("dialog").count()); i++) {
      await key(i % 2 ? "KeyW" : "Space", 130); await hold(i % 3 === 0 ? 520 : 330);
    }
    await chest(1); await hold(2600); await game.getByRole("button", { name: "Keep it" }).click(); await hold(600);

    // Crystal Cave
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Crystal Cave/ }).click(); await mark("caveBoard"); await hold(1200);
    await game.getByRole("button", { name: "Into the cave!" }).click(); await confirm();
    await mark("cave");
    await hold(2500); await key("KeyD", 500);
    for (let i = 0; i < 90 && !(await game.getByRole("dialog").count()); i++) {
      await key(i % 4 < 2 ? "KeyA" : "KeyD", 250); if (i % 9 === 5) await key("KeyS", 500); await hold(250);
    }
    await chest(2); await hold(2600); await game.getByRole("button", { name: "Keep it" }).click(); await hold(600);

    // Sunken Ruins
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Sunken Ruins/ }).click(); await mark("ruinsBoard"); await hold(1200);
    await game.getByRole("button", { name: "Enter the ruins!" }).click(); await confirm();
    await mark("ruins");
    await hold(1500);
    for (let i = 0; i < 500 && !(await game.getByRole("dialog").count()); i++) {
      const k = i % 12 === 5 ? "KeyD" : i % 12 === 11 ? "KeyA" : "KeyW";
      await key(k, 90); await hold(110);
    }
    await chest(3); await hold(2800); await game.getByRole("button", { name: "Keep it" }).click(); await hold(1500);
    await mark("end");

    const download = page.waitForEvent("download");
    await page.evaluate(() => window.__stop());
    await (await download).saveAs(raw);
  },
});
if (!statSync(raw).size) throw new Error("no video was recorded");

// about 60 s of gameplay: each run is shown from its start, then cut to its chest
const { camp, forest, caveBoard, cave, ruinsBoard, ruins, chest1, chest2, chest3, end } = marks;
const cuts = [
  [camp, Math.min(forest + 14, chest1 - 0.5)], [chest1 - 0.5, chest1 + 3],
  [caveBoard, Math.min(cave + 13, chest2 - 0.5)], [chest2 - 0.5, chest2 + 3],
  [ruinsBoard, Math.min(ruins + 13, chest3 - 0.5)], [chest3 - 0.5, end],
];
const fade = 0.2;
const filter = cuts.map(([a, b], i) =>
  `[0:v]trim=start=${a.toFixed(2)}:end=${b.toFixed(2)},setpts=PTS-STARTPTS[v${i}];`
  + `[0:a]atrim=start=${a.toFixed(2)}:end=${b.toFixed(2)},asetpts=PTS-STARTPTS,`
  + `afade=t=in:d=${fade},afade=t=out:st=${(b - a - fade).toFixed(2)}:d=${fade}[a${i}]`).join(";")
  + `;${cuts.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${cuts.length}:v=1:a=1[vc][a]`
  // the whole tab is captured (cropping the capture track stops clicks reaching the game); crop to the container here
  + `;[vc]crop=iw*${frame.w / W}:ih*${frame.h / H}:iw*${frame.x / W}:ih*${frame.y / H},scale=960:640,fps=30,format=yuv420p[v]`;
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", raw, "-filter_complex", filter, "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], { stdio: "inherit" });
try { rmSync(dir, { recursive: true, force: true }); } catch { /* the browser may still hold the file for a moment */ }
const length = cuts.reduce((t, [a, b]) => t + b - a, 0);
console.log(`demo video: ${out}, ${length.toFixed(1)} s, ${(statSync(out).size / 1e6).toFixed(1)} MB`);
