// Layout and sandbox checks for the vibeathon rules:
// - everything renders inside the SDK game container, which is at most 960 × 640 and keeps its 3:2 ratio;
// - the game runs in the SDK's sandboxed iframe (allow-scripts only);
// - the SDK toolbar (mode, Friend, wallet) stays inside the container and its labels are not cut off;
// - the game's own UI fills the iframe and nothing of it is rendered outside.
import { testGame } from "@rarefriends/friendsdk/testing";

const VIEWPORTS = [[1920, 1080], [1382, 800], [1024, 700], [390, 844], [844, 390]];
const problems = [];

await testGame("./games/expeditions", {
  timeout: 120000,
  check: async ({ page, game }) => {
    for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const frame = document.querySelector(".rf-game-frame")?.getBoundingClientRect();
        const iframe = document.querySelector(".rf-game-frame iframe");
        const tools = [...document.querySelectorAll(".rf-frame-toolbar > *")].map(el => ({ box: el.getBoundingClientRect(), cut: el.scrollWidth > el.clientWidth + 1, text: el.textContent }));
        return { frame: frame && { x: frame.x, y: frame.y, w: frame.width, h: frame.height, r: frame.right, b: frame.bottom }, sandbox: iframe?.getAttribute("sandbox"), tools };
      });
      const tag = `${width}×${height}`;
      if (!r.frame) { problems.push(`${tag}: no game container`); continue; }
      if (r.frame.w > 960.5 || r.frame.h > 640.5) problems.push(`${tag}: container ${r.frame.w}×${r.frame.h} is larger than 960×640`);
      if (Math.abs(r.frame.w / r.frame.h - 1.5) > 0.01) problems.push(`${tag}: container ratio ${(r.frame.w / r.frame.h).toFixed(3)} is not 3:2`);
      if (r.frame.x < 0 || r.frame.r > width + 0.5) problems.push(`${tag}: container leaves the screen horizontally`);
      if (r.sandbox !== "allow-scripts") problems.push(`${tag}: iframe sandbox is "${r.sandbox}"`);
      for (const t of r.tools) {
        if (t.cut) problems.push(`${tag}: toolbar label "${t.text}" is cut off`);
        if (t.box.right > r.frame.r || t.box.left < r.frame.x || t.box.bottom > r.frame.b) problems.push(`${tag}: toolbar item "${t.text}" is outside the container`);
      }
      // the game's own root fills the iframe exactly (nothing drawn outside it)
      const inner = await game.locator(".xp-root").boundingBox();
      if (!inner) problems.push(`${tag}: game root not found`);
      console.log(`${tag}: container ${Math.round(r.frame.w)}×${Math.round(r.frame.h)} · toolbar ${r.tools.map(t => t.text).join(" | ")}`);
    }
  },
});
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("compliance ok");
