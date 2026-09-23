// README screenshots with the SDK's mock wallet: camp, the expedition board, the three places, a chest, the economy panel, a phone view.
import { testGame } from "@rarefriends/friendsdk/testing";
const out = process.argv[2] ?? "./media";
const hideHint = async game => { const x = game.getByRole("button", { name: "Hide this hint" }); if (await x.count()) await x.first().click(); };

await testGame("./games/expeditions", {
  timeout: 240000,
  check: async ({ page, game }) => {
    const shot = async name => { await page.waitForTimeout(300); await page.locator("#root").screenshot({ path: `${out}/${name}.png` }); };
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    const close = () => game.getByRole("button", { name: "Close" }).click();
    const reveal = async () => { await game.getByRole("dialog").waitFor({ timeout: 90000 }); await page.waitForTimeout(800); };
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await game.getByRole("button", { name: "Turn sound off" }).click();
    await hideHint(game);
    await shot("camp");

    // forest: buy passes, run a few seconds, then let the run finish for the chest
    await game.getByRole("button", { name: /^Expeditions/ }).first().click();
    await game.getByRole("button", { name: /^Buy 3/ }).click(); await confirm();
    await game.getByText(/3 expedition passes added/).waitFor();
    await shot("board");
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    await page.waitForTimeout(1200); await hideHint(game);
    for (let i = 0; i < 14; i++) { await page.keyboard.down("Space"); await page.waitForTimeout(110); await page.keyboard.up("Space"); await page.waitForTimeout(390); }
    await shot("forest");
    for (let i = 0; i < 80 && !(await game.getByRole("dialog").count()); i++) { await page.keyboard.down("Space"); await page.waitForTimeout(110); await page.keyboard.up("Space"); await page.waitForTimeout(390); }
    await reveal();
    await shot("chest");
    await game.getByRole("button", { name: "Keep it" }).click();

    // economy panel
    await game.getByRole("button", { name: /Economy: where RF goes/ }).click();
    await game.getByText("Expected return per pass").waitFor();
    await shot("economy");
    await close();

    // cave: lantern from the Outfitter, a few seconds of the descent
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    await game.getByRole("button", { name: /Buy · 5 RF/ }).first().click();
    await close();
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Crystal Cave/ }).click();
    await game.getByRole("button", { name: "Into the cave!" }).click(); await confirm();
    await page.waitForTimeout(1200); await hideHint(game);
    for (let i = 0; i < 12; i++) { const k = i % 4 < 2 ? "KeyA" : "KeyD"; await page.keyboard.down(k); await page.waitForTimeout(250); await page.keyboard.up(k); await page.waitForTimeout(250); }
    await shot("cave");
    await reveal();
    await game.getByRole("button", { name: "Keep it" }).click();

    // ruins: map from the Outfitter (the forest chest may have been sold, so buy after the cave)
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    const map = game.getByRole("button", { name: /Buy · 8 RF/ }).first();
    if (await map.isEnabled()) {
      await map.click(); await close();
      await game.getByRole("button", { name: /Expeditions/ }).first().click();
      await game.getByRole("button", { name: /Sunken Ruins/ }).click();
      await game.getByRole("button", { name: "Enter the ruins!" }).click(); await confirm();
      await page.waitForTimeout(1200); await hideHint(game);
      for (let i = 0; i < 14; i++) { await page.keyboard.down("KeyW"); await page.waitForTimeout(90); await page.keyboard.up("KeyW"); await page.waitForTimeout(160); }
      await shot("ruins");
    } else await close();
  },
});

// phone held sideways: camp and the expedition board in the compact layout
await testGame("./games/expeditions", {
  width: 844, height: 390, timeout: 60000,
  check: async ({ page, game }) => {
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await game.getByRole("button", { name: /^Expeditions/ }).first().click();
    await page.waitForTimeout(400);
    await page.locator("#root").screenshot({ path: `${out}/phone-board.png` });
  },
});
console.log("media ok");
