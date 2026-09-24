// Phone-sized layout check with the SDK's mock wallet: camp and every camp panel in portrait and landscape;
// on a landscape phone, a run in each place checks the chest and that the run banner hides after 5 s.
import { testGame } from "@rarefriends/friendsdk/testing";
const out = process.argv[2] ?? "/tmp";
const sizes = [[390, 844, "portrait"], [844, 390, "landscape"], [740, 360, "landscape-small"]];
for (const [width, height, name] of sizes) {
  await testGame("./games/expeditions", {
    width, height, timeout: name === "landscape" ? 240000 : 60000,
    check: async ({ page, game }) => {
      const shot = async tag => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${name}-${tag}.png` }); };
      await game.getByRole("button", { name: "Turn sound off" }).waitFor();
      await shot("camp");
      // portrait phones show a closable "turn sideways" hint over the HUD
      const rotate = game.locator(".xp-rotate button");
      if (await rotate.count()) await rotate.click();
      const panel = async (button, tag) => {
        await game.getByRole("button", { name: button }).first().click();
        await game.getByRole("button", { name: "Close" }).waitFor();
        await shot(tag);
        await game.getByRole("button", { name: "Close" }).click();
      };
      await panel(/^Expeditions/, "board");
      await panel(/^Merchant/, "merchant");
      await panel(/^Outfitter/, "outfitter");
      await panel(/^Collection/, "collection");
      await game.locator(".xp-money").click(); await game.getByRole("button", { name: "Close" }).waitFor(); await shot("economy"); await game.getByRole("button", { name: "Close" }).click();
      await panel(/^Settings/, "settings");
      if (name !== "landscape") return;
      const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
      const banner = () => game.locator(".xp-weather-run").evaluate(el => getComputedStyle(el).visibility).catch(() => "absent");
      // the place / weather banner must not cover the HUD: shown at the start of a run, hidden after 5 s
      const bannerFades = async place => {
        await page.waitForTimeout(1500);
        if (await banner() !== "visible") throw new Error(`${place}: the run banner should show at the start`);
        await shot(`run-${place}`);
        await page.waitForTimeout(5000);
        if (await banner() !== "hidden") throw new Error(`${place}: the run banner should hide after 5 s`);
      };
      // passes, then the Cave Lantern and the Ruins Map
      await game.getByRole("button", { name: /^Expeditions/ }).first().click();
      await game.getByRole("button", { name: /^Buy 3/ }).click(); await confirm();
      await game.getByText(/3 expedition passes added/).waitFor();
      await game.getByRole("button", { name: "Close" }).click();
      await game.getByRole("button", { name: /^Outfitter/ }).click();
      await game.getByRole("button", { name: /Buy · 5 RF/ }).first().click();
      await game.getByRole("button", { name: /Buy · 8 RF/ }).first().click();
      await game.getByRole("button", { name: "Close" }).click();
      // forest: banner, then the chest reveal must fit the frame
      await game.getByRole("button", { name: /^Expeditions/ }).first().click();
      await game.getByRole("button", { name: /Whispering Forest/ }).click();
      await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
      await bannerFades("forest");
      await game.getByRole("dialog").waitFor({ timeout: 45000 });
      await shot("reveal");
      await game.getByRole("button", { name: "Keep it" }).click();
      // cave
      await game.getByRole("button", { name: /^Expeditions/ }).first().click();
      await game.getByRole("button", { name: /Crystal Cave/ }).click();
      await game.getByRole("button", { name: "Into the cave!" }).click(); await confirm();
      await bannerFades("cave");
      await game.getByRole("dialog").waitFor({ timeout: 60000 });
      await game.getByRole("button", { name: "Keep it" }).click();
      // ruins with reduce motion: the banner hides without the fade
      await page.emulateMedia({ reducedMotion: "reduce" });
      await game.getByRole("button", { name: /^Expeditions/ }).first().click();
      await game.getByRole("button", { name: /Sunken Ruins/ }).click();
      await game.getByRole("button", { name: "Enter the ruins!" }).click(); await confirm();
      await bannerFades("ruins-reduced-motion");
    },
  });
  console.log(`${name} ${width}×${height}: ok`);
}
