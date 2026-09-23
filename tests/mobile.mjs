// Phone-sized layout check with the SDK's mock wallet: camp and every camp panel in portrait and landscape.
import { testGame } from "@rarefriends/friendsdk/testing";
const out = process.argv[2] ?? "/tmp";
const sizes = [[390, 844, "portrait"], [844, 390, "landscape"], [740, 360, "landscape-small"]];
for (const [width, height, name] of sizes) {
  await testGame("./games/expeditions", {
    width, height, timeout: 60000,
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
      // one forest run on a landscape phone: buy, set out, and check the chest reveal fits
      await game.getByRole("button", { name: /^Expeditions/ }).first().click();
      await game.getByRole("button", { name: /^Buy 1/ }).click();
      await page.getByRole("button", { name: "Confirm preview" }).click();
      await game.getByRole("button", { name: "Set out!" }).click();
      await page.getByRole("button", { name: "Confirm preview" }).click();
      await page.waitForTimeout(3000);
      await shot("run");
      await game.getByRole("dialog").waitFor({ timeout: 45000 });
      await shot("reveal");
    },
  });
  console.log(`${name} ${width}×${height}: ok`);
}
