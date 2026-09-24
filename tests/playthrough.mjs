// Automated playthrough with the SDK's mock wallet: read the start guide, buy a pass, run the forest, open the chest, sell, shop.
import { testGame } from "@rarefriends/friendsdk/testing";
const out = process.argv[2] ?? "/tmp";
await testGame("./games/expeditions", {
  timeout: 120000,
  check: async ({ page, game }) => {
    const shot = name => page.screenshot({ path: `${out}/${name}.png` });
    const confirm = async () => { await page.getByRole("button", { name: "Confirm preview" }).click(); };
    // WASD in the camp: walk left to the board, then press E
    await game.getByRole("button", { name: "Turn sound off" }).waitFor(); // sound is on by default
    // the three-page start guide opens on its own; page through it (Next, Back, Next) and close it
    for (const [n, title] of ["Welcome to the camp", "Three places to explore", "What to buy first"].entries()) {
      await game.getByRole("heading", { name: `Guide · ${title}` }).waitFor();
      await shot(`00-guide-${n + 1}`);
      if (n === 1) { await game.getByRole("button", { name: "Back" }).click(); await game.getByRole("heading", { name: /Welcome to the camp/ }).waitFor(); await game.getByRole("button", { name: "Next" }).click(); }
      if (n < 2) await game.getByRole("button", { name: "Next" }).click();
    }
    await game.getByRole("button", { name: "Let's go!" }).click();
    await game.getByRole("dialog").waitFor({ state: "detached" });
    await game.locator("canvas").click({ position: { x: 480, y: 300 } });
    await page.keyboard.down("KeyS"); await page.waitForTimeout(300); await page.keyboard.up("KeyS");
    await page.keyboard.down("KeyA"); await page.waitForTimeout(2400); await page.keyboard.up("KeyA");
    await page.keyboard.down("KeyW"); await page.waitForTimeout(450); await page.keyboard.up("KeyW");
    await game.getByText(/Press E to open Expeditions/).waitFor({ timeout: 5000 });
    await shot("01b-walk-near");
    await page.keyboard.press("KeyE");
    await game.getByRole("heading", { name: "Expedition board" }).waitFor();
    await shot("02-board");
    await game.getByRole("button", { name: /^Buy 3/ }).click(); await confirm();
    await game.getByText(/3 expedition passes added/).waitFor();
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    await page.waitForTimeout(1800);
    // jump rhythmically
    await page.keyboard.down("KeyD"); await page.waitForTimeout(600); await page.keyboard.up("KeyD");
    for (let i = 0; i < 40; i++) { if (i % 5 === 2) await page.keyboard.press("KeyS"); await page.keyboard.down(i % 2 ? "KeyW" : "Space"); await page.waitForTimeout(120); await page.keyboard.up(i % 2 ? "KeyW" : "Space"); await page.waitForTimeout(380); if (i === 6) await shot("03-run"); if (await game.getByRole("dialog").count()) break; }
    await game.getByRole("dialog").waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
    await shot("04-reveal");
    const sell = game.getByRole("button", { name: /^Sell ·/ });
    if (await sell.count()) { await sell.click(); await confirm(); } else await game.getByRole("button", { name: "Keep it" }).click();
    await game.getByRole("button", { name: /^Outfitter/ }).waitFor();
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    await game.getByRole("button", { name: /Buy · 3 RF/ }).first().click();
    await game.getByText("Owned").first().waitFor();
    await shot("05-outfitter");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /^Collection/ }).click();
    await game.getByRole("heading", { name: /^Friend #/ }).waitFor();
    await shot("06-collection");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /Economy: where RF goes/ }).click();
    await game.getByText("Expected return per pass").waitFor();
    await shot("06b-economy");
    await game.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(400);
    await shot("07-camp-after");
    // Crystal Cave: buy the lantern, pick the cave on the board and descend
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    await game.getByRole("button", { name: /Buy · 5 RF/ }).first().click();
    await game.getByText(/Harvest Season/).first().waitFor();
    await shot("08-outfitter-season");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Crystal Cave/ }).click();
    await shot("09-board-cave");
    await game.getByRole("button", { name: "Into the cave!" }).click(); await confirm();
    await page.waitForTimeout(2500);
    await page.keyboard.down("KeyD"); await page.waitForTimeout(500); await page.keyboard.up("KeyD");
    await shot("10-cave");
    for (let i = 0; i < 60; i++) { await page.keyboard.down(i % 4 < 2 ? "KeyA" : "KeyD"); await page.waitForTimeout(250); await page.keyboard.up(i % 4 < 2 ? "KeyA" : "KeyD"); if (i === 5) { await page.keyboard.down("KeyS"); await page.waitForTimeout(600); await page.keyboard.up("KeyS"); } if (await game.getByRole("dialog").count()) break; await page.waitForTimeout(250); }
    await game.getByRole("dialog").waitFor({ timeout: 40000 });
    await page.waitForTimeout(600);
    await shot("11-cave-reveal");
    await game.getByRole("button", { name: "Keep it" }).click();
    await game.getByRole("button", { name: /^Collection/ }).click();
    await game.getByRole("tab", { name: /Crystal Cave/ }).click();
    await shot("12-collection-cave");
    await game.getByRole("button", { name: "Close" }).click();
    // Sunken Ruins: buy the map, pick the ruins and cross the trap gauntlet
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    await game.getByRole("button", { name: /Buy · 8 RF/ }).first().click();
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Sunken Ruins/ }).click();
    await shot("13-board-ruins");
    await game.getByRole("button", { name: "Enter the ruins!" }).click(); await confirm();
    await page.waitForTimeout(1500);
    await shot("14-ruins");
    for (let i = 0; i < 400; i++) {
      const k = i % 12 === 5 ? "KeyD" : i % 12 === 11 ? "KeyA" : "KeyW";
      await page.keyboard.down(k); await page.waitForTimeout(90); await page.keyboard.up(k); await page.waitForTimeout(110);
      if (i === 60) await shot("15-ruins-deeper");
      if (await game.getByRole("dialog").count()) break;
    }
    await game.getByRole("dialog").waitFor({ timeout: 70000 });
    await page.waitForTimeout(600);
    await shot("16-ruins-reveal");
    await game.getByRole("button", { name: "Keep it" }).click();
  },
});
console.log("playthrough ok");
