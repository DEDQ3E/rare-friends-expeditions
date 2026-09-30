// README screenshots with the SDK's mock wallet: camp, the expedition board, the three places, the economy panel, the wardrobe,
// a phone view and a Friend wearing a trophy. Usage: node tests/media.mjs [outDir] [trophy] (with "trophy": only that shot).
import { testGame } from "@rarefriends/friendsdk/testing";
const out = process.argv[2] ?? "./media", only = process.argv[3];
const skipGuide = async game => { await game.getByRole("heading", { name: /^Guide/ }).waitFor(); await game.getByRole("button", { name: "Close" }).click(); };
const hideHint = async game => { const x = game.getByRole("button", { name: "Hide this hint" }); if (await x.count()) await x.first().click(); };

if (!only) await testGame("./games/expeditions", {
  timeout: 240000,
  check: async ({ page, game }) => {
    const shot = async name => { await page.waitForTimeout(300); await page.locator("#root").screenshot({ path: `${out}/${name}.png` }); };
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    const close = () => game.getByRole("button", { name: "Close" }).click();
    const reveal = async () => { await game.getByRole("dialog").waitFor({ timeout: 90000 }); await page.waitForTimeout(800); };
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await game.getByRole("button", { name: "Next" }).click(); await shot("guide");
    await game.getByRole("button", { name: "Next" }).click(); await game.getByRole("button", { name: "Let's go!" }).click();
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

    // ruins: map from the Outfitter, bought after the cave
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

// wardrobe: dress the Friend (wizard hat, scarf, cape), then the Outfitter wardrobe and the camp
if (!only) await testGame("./games/expeditions", {
  timeout: 90000,
  check: async ({ page, game }) => {
    const shot = async name => { await page.waitForTimeout(300); await page.locator("#root").screenshot({ path: `${out}/${name}.png` }); };
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await skipGuide(game);
    await game.getByRole("button", { name: "Turn sound off" }).click();
    await hideHint(game);
    await game.getByRole("button", { name: /^Outfitter/ }).click();
    for (const name of ["Wizard Hat", "Knit Scarf", "Red Cape"]) await game.locator(".xp-wear", { hasText: name }).getByRole("button").click();
    await game.getByRole("heading", { name: "Wardrobe" }).scrollIntoViewIfNeeded();
    await game.locator(".xp-wear", { hasText: "Wizard Hat" }).scrollIntoViewIfNeeded();
    await shot("wardrobe");
    await game.getByRole("button", { name: "Close" }).click();
    await shot("camp-dressed");
  },
});

// phone held sideways: camp and the expedition board in the compact layout
if (!only) await testGame("./games/expeditions", {
  width: 844, height: 390, timeout: 60000,
  check: async ({ page, game }) => {
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await skipGuide(game);
    await game.getByRole("button", { name: /^Expeditions/ }).first().click();
    await page.waitForTimeout(400);
    await page.locator("#root").screenshot({ path: `${out}/phone-board.png` });
  },
});
// trophy: a Legendary find kept, so the Friend wears the Scarab Brooch (and the gold keepsake glow) in the camp. The SDK's
// preview ledger draws its roll in this test page with crypto.getRandomValues on one Uint32Array word: the next such
// draw returns roll 9700 (Legendary: rolls 9600-9899).
if (!only || only === "trophy") await testGame("./games/expeditions", {
  timeout: 120000,
  check: async ({ page, game }) => {
    const confirm = () => page.getByRole("button", { name: "Confirm preview" }).click();
    await game.getByRole("button", { name: "Turn sound off" }).waitFor();
    await skipGuide(game);
    await game.getByRole("button", { name: "Turn sound off" }).click();
    await hideHint(game);
    await page.evaluate(() => {
      const real = crypto.getRandomValues.bind(crypto);
      window.__legendaryOnce = true;
      crypto.getRandomValues = a => { if (window.__legendaryOnce && a instanceof Uint32Array && a.length === 1) { window.__legendaryOnce = false; a[0] = 9700; return a; } return real(a); };
    });
    await game.getByRole("button", { name: /^Expeditions/ }).first().click();
    await game.getByRole("button", { name: /^Buy 1 pass/ }).click(); await confirm();
    await game.getByRole("button", { name: "Set out!" }).click(); await confirm();
    await game.getByRole("dialog").waitFor({ timeout: 90000 });
    await game.getByRole("button", { name: "Keep it to wear the Scarab Brooch" }).click();
    await hideHint(game);
    await page.waitForTimeout(1500);
    await page.locator("#root").screenshot({ path: `${out}/trophy.png` });
  },
});
console.log("media ok");
