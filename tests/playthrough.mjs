// Automated playthrough with the SDK's mock wallet: read the start guide, buy a pass, run the forest, open the chest,
// wear its trophy, sell it (the trophy goes), shop, then the cave and the ruins.
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
    // the first chest is a Rare find: the SDK's preview ledger draws its roll in this (trusted, test) page with
    // crypto.getRandomValues on one Uint32Array word, so the next such draw returns roll 8000 (Rare: rolls 7700-8999)
    await page.evaluate(() => {
      const real = crypto.getRandomValues.bind(crypto);
      window.__rareOnce = true;
      crypto.getRandomValues = a => { if (window.__rareOnce && a instanceof Uint32Array && a.length === 1) { window.__rareOnce = false; a[0] = 8000; return a; } return real(a); };
    });
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    await page.waitForTimeout(1800);
    // jump rhythmically
    await page.keyboard.down("KeyD"); await page.waitForTimeout(600); await page.keyboard.up("KeyD");
    for (let i = 0; i < 40; i++) { if (i % 5 === 2) await page.keyboard.press("KeyS"); await page.keyboard.down(i % 2 ? "KeyW" : "Space"); await page.waitForTimeout(120); await page.keyboard.up(i % 2 ? "KeyW" : "Space"); await page.waitForTimeout(380); if (i === 6) await shot("03-run"); if (await game.getByRole("dialog").count()) break; }
    await game.getByRole("dialog").waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
    await shot("04-reveal");
    // Rare → the Feather Pin: keep it and the Friend wears it; selling the last Rare find takes it away
    await game.getByText(/^Rare find · 13% chance/).waitFor();
    await game.getByText("Selling removes your Feather Pin: it stays on your Friend only while you keep a Rare find.").waitFor();
    await game.getByRole("button", { name: "Keep it to wear the Feather Pin" }).click();
    await game.getByRole("button", { name: /^Collection/ }).click();
    await game.getByText("Feather Pin · worn").waitFor();
    await shot("04b-trophy-worn");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    const pin = game.locator(".xp-wear", { hasText: "Feather Pin" }).getByRole("button");
    if ((await pin.textContent()) !== "Take off" || (await pin.getAttribute("aria-pressed")) !== "true") throw new Error("the Feather Pin should be worn");
    if (!(await game.locator(".xp-wear", { hasText: "Scarab Brooch" }).getByRole("button").isDisabled())) throw new Error("the Scarab Brooch needs a Legendary find");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /^Merchant/ }).click();
    const sellPin = game.getByRole("button", { name: /^Sell 1\s*Selling removes your Feather Pin$/ });
    await sellPin.waitFor();
    await shot("04c-merchant-trophy");
    await sellPin.click(); await confirm();
    await game.getByText("Sold for 1.5 RF.").waitFor();
    if (await game.getByText(/Selling removes your Feather Pin/).count()) throw new Error("the trophy warning should go with the last Rare find");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /^Collection/ }).click();
    await game.getByText("none yet · keep a Rare or better find to wear its trophy").waitFor();
    await game.getByRole("button", { name: "Close" }).click();
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
    // prestige clothes stay locked below their level; Trail Rations are a repeatable supply
    const crown = game.locator(".xp-wear", { hasText: "Golden Crown" }).getByRole("button");
    if ((await crown.textContent()) !== "Unlocks at Lv 6" || !(await crown.isDisabled())) throw new Error("the Golden Crown should be locked until Lv 6");
    await game.getByRole("button", { name: "Buy 1 · 0.2 RF" }).click();
    await game.getByText(/used up when your Friend sets out · you have 1/).waitFor();
    await shot("08-outfitter-season");
    await game.getByRole("button", { name: "Close" }).click();
    await game.getByRole("button", { name: /Expeditions/ }).first().click();
    await game.getByRole("button", { name: /Crystal Cave/ }).click();
    await game.getByText("Pack a Trail Ration: +1 heart on this expedition (1 left)").waitFor();
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
    await game.getByText(/used up when your Friend sets out · you have 0/).waitFor(); // the ration went into the cave
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
