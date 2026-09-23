"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { maximumPrize, type GamePlay, type GameSnapshot } from "@rarefriends/friendsdk/game";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import { createFriendSoundKit, type FriendSoundCue, type FriendSoundKit } from "@rarefriends/friendsdk/sounds";
import { GENERATION_SPRITE_MANIFEST, createFriendReader, spriteFrame } from "@rarefriends/friendsdk/sprites";
import { GENERATION_ELIGIBILITY_ABI } from "@rarefriends/friendsdk/identity";
import { createFriendPublicClient } from "@rarefriends/friendsdk/wallet";
import { WEATHER_ICONS, FINDS, LOCATIONS, LOCATION_NAME, PASS, RARITIES, RARITY_COLOR, RARITY_LABEL, HEART, SPARK, CRYSTAL, drawHero, pixmapUrl, type HeroLook, type Location } from "./art.js";
import { RAIN_LABEL, TIME_LABEL, XP_MULT, rollWeather, type Rain, type Weather } from "./weather.js";
import { RANK_LABEL, perkFor } from "./perks.js";
import { createSoundscape, type Soundscape } from "./audio.js";
import { CAVE_ZONES } from "./cave.js";
import { RELIC, RUINS_ZONES } from "./ruins.js";
import { caveCard, forestCard, ruinsCard } from "./cards.js";
import { CAMP_SPOTS, H, W, createEngine, type CampSpot, type Engine, type HeroSprites, type RunEvent, type RunResult } from "./engine.js";
import "./style.css";

const RF_UNIT = 10n ** 18n;
const rfText = (value: bigint) => `${formatGameAmount(value, 18)} RF`;
const LEVELS = [0, 25, 75, 160, 300] as const;
const TITLES = ["Novice", "Tracker", "Seeker", "Pathfinder", "Legend"] as const;
const levelOf = (xp: number) => { let l = 0; for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i; return l; };

type StoreItem = Readonly<{ id: string; name: string; price: number; effect: string; kind: "gear" | "trail" | "season" }>;
const STORE: readonly StoreItem[] = [
  { id: "backpack", name: "Trail Backpack", price: 4, effect: "+1 heart on every expedition", kind: "gear" },
  { id: "boots", name: "Spring Boots", price: 3, effect: "Double jump in the forest", kind: "gear" },
  { id: "lantern", name: "Cave Lantern", price: 5, effect: "Opens the Crystal Cave", kind: "gear" },
  { id: "ruinsmap", name: "Ruins Map", price: 8, effect: "Opens the Sunken Ruins", kind: "gear" },
  // trails are particles behind the Friend; nothing is worn on it (its original artwork is preserved)
  { id: "trail", name: "Spark Trail", price: 4, effect: "Sparkles behind your Friend on expeditions", kind: "trail" },
  { id: "leaves", name: "Falling Leaves", price: 5, effect: "Autumn leaves drift behind your Friend", kind: "season" },
];
/** Items that share a slot: using one puts the other away. */
const SLOT: Readonly<Record<string, string>> = { trail: "trail", leaves: "trail", torch: "hand" };
/** Limited-time Harvest Season: its cosmetics can only be bought until the season ends (owned ones stay). */
const SEASON = { name: "Harvest Season", start: new Date(2026, 8, 22), end: new Date(2026, 10, 30, 23, 59, 59), endLabel: "Nov 30" } as const;
const seasonActive = () => { const now = Date.now(); return now >= SEASON.start.getTime() && now <= SEASON.end.getTime(); };
/** XP grows with difficulty: forest ×1 (rain up to ×1.3), cave ×1.5, ruins ×2; reaching the chest pays a
 * bonus that also grows by place (doubled without a hit). XP never changes odds, prices or finds. */
const CAVE_XP = 1.5, RUINS_XP = 2;
const FINISH_XP: Readonly<Record<"forest" | "cave" | "ruins", number>> = { forest: 5, cave: 10, ruins: 15 };
/** Which Outfitter item opens each place. */
const KEY_ITEM: Readonly<Record<Location, string | null>> = { forest: null, cave: "lantern", ruins: "ruinsmap" };
const SPOT_LABEL: Readonly<Record<CampSpot, string>> = { board: "Expeditions", outfitter: "Outfitter", merchant: "Merchant", collection: "Collection" };
type Panel = CampSpot | "settings" | "economy" | null;
const TORCH_JUNK = 10; // Dry Twigs, Plain Pebbles and Pottery Shards all count (the junk tier of every place)
type Phase = "camp" | "run" | "chest" | "reveal";
const cueForRarity = (index: number): FriendSoundCue => index >= 5 ? "reveal-legendary" : index >= 3 ? "reveal-rare" : "reveal-common";

/** Difficulty pips (1–3) on a location card. */
function Pips({ n, label }: { n: number; label: string }) {
  return <span className="xp-pips" role="img" aria-label={label} title={label}>{[0, 1, 2].map(i => <i key={i} className={i < n ? "on" : ""} />)}</span>;
}

export default function Expeditions({ friendId, client, paused }: GameComponentProps) {
  const definition = client.definition;
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [sprites, setSprites] = useState<HeroSprites | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("camp");
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false); // sound on by default; it starts on the player's first click, tap or key
  const [soundTouched, setSoundTouched] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [volume, setVolume] = useState(80);
  const [reducedMotion, setReducedMotion] = useState(false);
  // session progress (the SDK sandbox has no storage: a reload starts fresh)
  const [xp, setXp] = useState(0);
  const [expeditions, setExpeditions] = useState(0);
  const [bestFind, setBestFind] = useState<{ loc: Location; i: number } | null>(null);
  const [everFound, setEverFound] = useState<Readonly<Record<Location, readonly boolean[]>>>(() => ({ forest: FINDS.forest.map(() => false), cave: FINDS.cave.map(() => false), ruins: FINDS.ruins.map(() => false) }));
  // SDK inventory counts finds by rarity tier; the session remembers which of them came from the cave (display only)
  const [extraHeld, setExtraHeld] = useState<Readonly<Record<"cave" | "ruins", readonly number[]>>>(() => ({ cave: FINDS.cave.map(() => 0), ruins: FINDS.ruins.map(() => 0) }));
  const [boardLoc, setBoardLoc] = useState<Location>("forest");
  const [runLoc, setRunLoc] = useState<Location>("forest");
  const [collectionTab, setCollectionTab] = useState<Location>("forest");
  const [zoneBanner, setZoneBanner] = useState<number | null>(null);
  const zoneTimer = useRef(0);
  const [storeSpent, setStoreSpent] = useState(0n);
  const [owned, setOwned] = useState<ReadonlySet<string>>(() => new Set());
  const [equipped, setEquipped] = useState<ReadonlySet<string>>(() => new Set());
  // current expedition
  const [playId, setPlayId] = useState<bigint | null>(null);
  const [runStats, setRunStats] = useState({ sparks: 0, hearts: 3 });
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [reveal, setReveal] = useState<GamePlay | null>(null);
  const [gainedXp, setGainedXp] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [walkHintClosed, setWalkHintClosed] = useState(false);
  const [runHintClosed, setRunHintClosed] = useState(false);
  // touch screen held upright: the 3:2 frame is tiny, so suggest turning the phone sideways
  const [portraitPhone, setPortraitPhone] = useState(false);
  const [rotateHintClosed, setRotateHintClosed] = useState(false);
  const [forecast, setForecast] = useState<Weather>(() => rollWeather());
  const [runWeather, setRunWeather] = useState<Weather>({ time: "day", rain: "none" });
  const [campRain, setCampRain] = useState<Rain>("none");
  const [near, setNear] = useState<CampSpot | null>(null);
  // Friend identity: sprite family picks the perk, generation sets its strength (read-only, never gates play)
  const [family, setFamily] = useState<string | null>(null);
  const [generation, setGeneration] = useState<number | null | undefined>(undefined);
  // crafting and economy stats (session only, simulated)
  const [junkUsed, setJunkUsed] = useState(0);
  const [totalSparks, setTotalSparks] = useState(0);
  const [passSpent, setPassSpent] = useState(0n);
  const [salesEarned, setSalesEarned] = useState(0n);
  const nearRef = useRef<CampSpot | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engine = useRef<Engine | null>(null);
  const sound = useRef<FriendSoundKit | null>(null);
  const scape = useRef<Soundscape | null>(null);
  const locked = useRef(false);
  const epoch = useRef(0);
  const settleRef = useRef<(id: bigint) => void>(() => {});
  const mutedRef = useRef(false);

  const torchOn = equipped.has("torch");
  const look: HeroLook = useMemo(() => ({ torch: torchOn }), [torchOn]);
  const trail = equipped.has("leaves") ? "leaves" as const : equipped.has("trail") ? "spark" as const : null;
  /** Use an item (putting away whatever else shares its slot), or put it away. */
  const toggleWear = (id: string, force?: boolean) => setEquipped(e => {
    const n = new Set(e); const on = force ?? !n.has(id);
    if (on) { for (const other of Object.keys(SLOT)) if (other !== id && SLOT[other] === SLOT[id]) n.delete(other); n.add(id); } else n.delete(id);
    return n;
  });
  const perk = perkFor(family, generation ?? null);
  const level = levelOf(xp);
  const balance = snapshot ? snapshot.rfBalance - storeSpent : 0n;
  const maxPrize = maximumPrize(definition);
  // pass odds, computed from game.json so the texts always match the table
  const evText = rfText(definition.outcomes.reduce((t, o) => t + BigInt(o.chanceBps) * o.reward, 0n) / 10000n);
  const winPct = definition.outcomes.reduce((t, o) => t + (o.reward >= definition.price ? o.chanceBps : 0), 0) / 100;

  const play = useCallback((cue: FriendSoundCue, volume = 1) => { if (!mutedRef.current) sound.current?.play(cue, { volume }); }, []);

  /* ---------- session setup ---------- */
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const check = () => setPortraitPhone(coarse.matches && window.screen.height > window.screen.width);
    check(); window.addEventListener("resize", check); window.screen.orientation?.addEventListener("change", check);
    return () => { window.removeEventListener("resize", check); window.screen.orientation?.removeEventListener("change", check); };
  }, []);

  useEffect(() => {
    const version = ++epoch.current;
    sound.current = createFriendSoundKit({ muted: true });
    scape.current = createSoundscape(); scape.current.setMuted(mutedRef.current);
    if (!mutedRef.current) sound.current.setMuted(false);
    setSnapshot(null); setPhase("camp"); setPanel(null); setError(""); setNotice(""); setBusy(false); locked.current = false;
    void client.read().then(value => { if (version === epoch.current) setSnapshot(value); })
      .catch(cause => { if (version === epoch.current) setLoadError(cause instanceof Error ? cause.message : "Could not load the game."); });
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches); update(); query.addEventListener("change", update);
    // browsers only allow audio after a gesture: start it on the first click, tap or key press in the game
    const firstGesture = () => { if (!mutedRef.current) { void sound.current?.unlock(); void scape.current?.unlock(); } window.removeEventListener("pointerdown", firstGesture, true); window.removeEventListener("keydown", firstGesture, true); };
    window.addEventListener("pointerdown", firstGesture, true); window.addEventListener("keydown", firstGesture, true);
    return () => { window.removeEventListener("pointerdown", firstGesture, true); window.removeEventListener("keydown", firstGesture, true); epoch.current++; sound.current?.dispose(); sound.current = null; scape.current?.dispose(); scape.current = null; query.removeEventListener("change", update); };
  }, [client, friendId]);

  useEffect(() => {
    let alive = true; setSprites(null); setLoadError("");
    createFriendReader().read(friendId).then(art => {
      if (!alive) return;
      setFamily(art.familyName);
      const clip = (facing: "right" | "left" | "up" | "down", walking: boolean) => Array.from({ length: 8 }, (_, i) => spriteFrame(art, facing, walking, i, "right").frame.rows);
      setSprites({ walk: { right: clip("right", true), left: clip("left", true), up: clip("up", true), down: clip("down", true) }, idle: clip("down", false) });
    }).catch(cause => { if (alive) setLoadError(cause instanceof Error ? cause.message : "Could not load your Friend's artwork."); });
    return () => { alive = false; };
  }, [friendId, loadAttempt]);

  useEffect(() => {
    let alive = true; setGeneration(undefined);
    // Perk strength only: a public, read-only lookup of this Friend's generation attribute (like the sprite
    // reader's family lookup). It is not an ownership or eligibility check: the SDK runtime alone verifies
    // ownership before the game starts, and the game never gates play on it.
    createFriendPublicClient().readContract({ address: GENERATION_SPRITE_MANIFEST.generations, abi: GENERATION_ELIGIBILITY_ABI, functionName: "generation", args: [friendId] })
      .then(g => { if (alive) setGeneration(Number(g)); })
      .catch(() => { if (alive) setGeneration(null); });
    return () => { alive = false; };
  }, [friendId]);

  /* ---------- engine ---------- */
  const onEngineEvent = useCallback((event: RunEvent) => {
    const sfx = scape.current;
    if (event.type === "spark") { setRunStats(s => ({ ...s, sparks: event.sparks })); sfx?.sfx("spark"); }
    else if (event.type === "hit") { setRunStats(s => ({ ...s, hearts: event.hearts })); sfx?.sfx("hit"); }
    else if (event.type === "heart") { setRunStats(s => ({ ...s, hearts: event.hearts })); sfx?.sfx("heart"); }
    else if (event.type === "jump") sfx?.sfx(event.air ? "jump-air" : "jump");
    else if (event.type === "land") sfx?.sfx("land");
    else if (event.type === "step") sfx?.sfx(event.surface === "path" ? "step-path" : event.surface === "stone" ? "step-stone" : "step-grass");
    else if (event.type === "finish") { setRunResult(event.result); setPhase("chest"); }
    else if (event.type === "near") { nearRef.current = event.spot; setNear(event.spot); }
    else if (event.type === "thunder") sfx?.thunder();
    else if (event.type === "campWeather") setCampRain(event.rain);
    else if (event.type === "stomp") sfx?.sfx("stomp");
    else if (event.type === "shield") sfx?.sfx("shield");
    else if (event.type === "rumble") sfx?.sfx("rumble");
    else if (event.type === "whoosh") sfx?.sfx("whoosh");
    else if (event.type === "arrow") sfx?.sfx("arrow");
    else if (event.type === "crumble") sfx?.sfx("crumble");
    else if (event.type === "tick") sfx?.sfx("tick");
    else if (event.type === "spikewarn") sfx?.sfx("spikewarn");
    else if (event.type === "zone") { sfx?.sfx("zone"); setZoneBanner(event.index); window.clearTimeout(zoneTimer.current); zoneTimer.current = window.setTimeout(() => setZoneBanner(null), 2600); }
  }, [play]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !sprites || !snapshot) return;
    try { engine.current = createEngine(canvas, event => onEngineEvent(event)); } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Could not start the game."); return; }
    return () => { engine.current?.destroy(); engine.current = null; };
  }, [sprites, snapshot === null, onEngineEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sprites) engine.current?.setSprites(sprites); }, [sprites, snapshot === null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { engine.current?.setLook(look); }, [look, sprites, snapshot === null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { engine.current?.setPaused(paused); }, [paused, sprites, snapshot === null]); // eslint-disable-line react-hooks/exhaustive-deps
  // soundscape follows the scene: camp (always night) or the expedition's time of day, plus the current rain
  useEffect(() => { scape.current?.setPaused(paused); }, [paused]);
  useEffect(() => { scape.current?.setMusic(musicOn); }, [musicOn]);
  useEffect(() => { scape.current?.setVolume(volume / 100); sound.current?.setVolume(0.65 * volume / 80); }, [volume]);
  useEffect(() => {
    scape.current?.setScene(phase === "camp" ? { mode: "camp", rain: campRain, time: "night" } : runLoc === "cave" ? { mode: "cave", rain: "none", time: "night" } : runLoc === "ruins" ? { mode: "ruins", rain: "none", time: "day" } : { mode: "run", rain: runWeather.rain, time: runWeather.time });
  }, [phase, campRain, runWeather, runLoc]);
  useEffect(() => { engine.current?.setSeason(seasonActive()); }, [sprites, snapshot === null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { engine.current?.setReducedMotion(reducedMotion); }, [reducedMotion, sprites, snapshot === null]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- SDK actions ---------- */
  async function act<T>(work: () => Promise<T>): Promise<T | undefined> {
    if (locked.current || paused) return undefined;
    const version = epoch.current; locked.current = true; setBusy(true); setError(""); setNotice("");
    if (!mutedRef.current) void sound.current?.unlock();
    try {
      const value = await work();
      const next = await client.read();
      if (version === epoch.current) setSnapshot(next);
      return value;
    } catch (cause) {
      if (version === epoch.current) { setError(cause instanceof Error ? cause.message : "The action failed."); try { setSnapshot(await client.read()); } catch { /* keep last */ } }
      return undefined;
    } finally { if (version === epoch.current) { locked.current = false; setBusy(false); } }
  }

  const pending = snapshot?.plays.find(p => p.outcomeId === null) ?? null;
  const passes = snapshot?.consumables ?? 0n;
  const canAfford = (qty: bigint) => !!snapshot && balance >= definition.price * qty && snapshot.freeStake >= maxPrize && snapshot.freeStake + definition.price * qty >= maxPrize * qty;

  async function buyPasses(qty: bigint) {
    if (!canAfford(qty)) { setError(balance < definition.price * qty ? "Not enough RF (simulated)." : "The expedition fund is full right now. Try again after selling finds."); return; }
    const ok = await act(async () => { await client.buy(qty); return true; });
    if (ok) { play("purchase"); setPassSpent(v => v + definition.price * qty); setNotice(`${qty.toString()} expedition pass${qty > 1n ? "es" : ""} added.`); }
  }

  const unlocked = (loc: Location) => { const key = KEY_ITEM[loc]; return key === null || owned.has(key); };
  const locXp = (loc: Location) => (loc === "cave" ? CAVE_XP : loc === "ruins" ? RUINS_XP : XP_MULT[runWeather.rain]);
  async function startExpedition() {
    if (!engine.current) return;
    const loc: Location = unlocked(boardLoc) ? boardLoc : "forest";
    const committed = await act(async () => pending ?? (await client.play(1n))[0]);
    if (!committed) return;
    const hearts = 3 + (owned.has("backpack") ? 1 : 0) + perk.effects.extraHearts;
    setPlayId(committed.id); setRunResult(null); setReveal(null); setRunStats({ sparks: 0, hearts }); setPanel(null); setShowHint(true);
    setRunLoc(loc);
    const seed = Math.floor(Math.random() * 1e9);
    if (loc === "cave") engine.current.startCave({ hearts, seed, trail, perk: perk.effects });
    else if (loc === "ruins") engine.current.startRuins({ hearts, seed, trail, perk: perk.effects });
    else {
      const weather = forecast; setRunWeather(weather); setForecast(rollWeather());
      engine.current.startRun({ hearts, doubleJump: owned.has("boots"), seed, trail, weather, perk: perk.effects });
    }
    setPhase("run"); play("action-start");
    window.setTimeout(() => setShowHint(false), 3500);
  }

  async function settle(id: bigint) {
    play("anticipation", 0.6);
    const settled = await act(() => client.settle(id));
    if (!settled) return;
    if (settled.outcomeId === null) { setNotice("The chest is still opening on-chain. Try again in a moment."); return; }
    const index = settled.outcomeId - 1;
    engine.current?.openChest(); setPlayId(null);
    const loc = runLoc;
    setEverFound(f => ({ ...f, [loc]: f[loc].map((v, i) => v || i === index) }));
    if (loc !== "forest") setExtraHeld(h => ({ ...h, [loc]: h[loc].map((v, i) => (i === index ? v + 1 : v)) }));
    setBestFind(b => (b && b.i >= index ? b : { loc, i: index })); setExpeditions(n => n + 1);
    play(cueForRarity(index));
    // the Friend holds its find up (or droops over a twig) before the reveal card
    engine.current?.celebrate(FINDS[loc][index].art, index === 0 ? "sad" : index >= 3 ? "great" : "happy");
    const version = epoch.current;
    window.setTimeout(() => { if (version === epoch.current) { setReveal(settled); setPhase("reveal"); } }, reducedMotion ? 300 : 1500);
  }
  settleRef.current = id => void settle(id);

  // when a run ends: award XP, then open the chest
  useEffect(() => {
    if (phase !== "chest" || !runResult || playId === null) return;
    const bonus = runResult.completed ? FINISH_XP[runLoc] * (runResult.hits === 0 ? 2 : 1) : 0;
    const gained = Math.round((runResult.sparks + bonus) * locXp(runLoc) * perk.effects.xpMult); setGainedXp(gained); setXp(v => v + gained);
    setTotalSparks(v => v + runResult.sparks);
    const id = playId; const timer = window.setTimeout(() => settleRef.current(id), reducedMotion ? 150 : 900);
    return () => window.clearTimeout(timer);
  }, [phase, runResult]); // eslint-disable-line react-hooks/exhaustive-deps

  function backToCamp() { engine.current?.showCamp(); setPhase("camp"); setReveal(null); setRunResult(null); }

  async function sell(outcomeId: number, qty: bigint, loc: Location = "forest") {
    const ok = await act(async () => { await client.redeem(outcomeId, qty); return true; });
    if (ok && loc !== "forest") setExtraHeld(h => ({ ...h, [loc]: h[loc].map((v, i) => (i === outcomeId - 1 ? Math.max(0, v - Number(qty)) : v)) }));
    if (ok) { const got = definition.outcomes[outcomeId - 1].reward * qty; play("reward"); setSalesEarned(v => v + got); setNotice(`Sold for ${rfText(got)}.`); }
    return ok;
  }

  function buyStore(key: string, price: number, then: () => void) {
    const cost = BigInt(price) * RF_UNIT;
    if (balance < cost) { setError("Not enough RF (simulated)."); return; }
    setStoreSpent(s => s + cost); setOwned(o => new Set([...o, key])); then(); play("purchase"); setError("");
    setNotice(`${formatGameAmount(cost / 2n, 18)} RF burned · ${formatGameAmount(cost / 2n, 18)} RF to Friend rewards (simulated).`);
  }

  /** 10 junk finds of any place → Twig Torch. Forest twigs are used first, then pebbles, then pottery shards. */
  function craftTorch(have: Readonly<Record<Location, bigint>>) {
    const total = have.forest + have.cave + have.ruins;
    if (total < BigInt(TORCH_JUNK) || owned.has("torch")) return;
    let need = BigInt(TORCH_JUNK) - (have.forest < BigInt(TORCH_JUNK) ? have.forest : BigInt(TORCH_JUNK));
    const fromCave = need < have.cave ? need : have.cave; need -= fromCave;
    const fromRuins = need;
    setExtraHeld(h => ({ cave: h.cave.map((v, i) => (i === 0 ? Math.max(0, v - Number(fromCave)) : v)), ruins: h.ruins.map((v, i) => (i === 0 ? Math.max(0, v - Number(fromRuins)) : v)) }));
    setJunkUsed(v => v + TORCH_JUNK); setOwned(o => new Set([...o, "torch"])); toggleWear("torch", true);
    play("reward"); setError(""); setNotice(`${TORCH_JUNK} junk finds bound into a Twig Torch!`);
    engine.current?.emote("wow", 1.4);
  }

  /* ---------- input ---------- */
  function openSpot(spot: CampSpot | "economy") { setPanel(spot); setError(""); setNotice(""); play("select", 0.4); }
  const openSpotRef = useRef(openSpot); openSpotRef.current = openSpot;
  // held directions from keyboard and the on-screen pad
  const held = useRef(new Set<"L" | "R" | "U" | "D">());
  const pushMove = useCallback(() => {
    const h = held.current;
    engine.current?.setMove((h.has("L") ? -1 : 0) + (h.has("R") ? 1 : 0), (h.has("U") ? -1 : 0) + (h.has("D") ? 1 : 0));
  }, []);
  const runLocRef = useRef<Location>("forest"); runLocRef.current = runLoc;
  const moveActive = (phase === "run" || (phase === "camp" && panel === null)) && !paused;
  useEffect(() => {
    if (!moveActive) { held.current.clear(); pushMove(); return; }
    const KEYS: Record<string, "L" | "R" | "U" | "D"> = { KeyA: "L", ArrowLeft: "L", KeyD: "R", ArrowRight: "R", KeyW: "U", ArrowUp: "U", KeyS: "D", ArrowDown: "D" };
    const typing = (e: KeyboardEvent) => { const el = e.target as HTMLElement | null; return !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName); };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const c = e.code;
      const ruinsRun = phase === "run" && runLocRef.current === "ruins"; // the ruins use all four directions, no jump
      if (phase === "run" && !ruinsRun && (c === "Space" || c === "KeyW" || c === "ArrowUp")) { e.preventDefault(); if (!e.repeat) engine.current?.jump(); return; }
      if (phase === "run" && runLocRef.current === "forest" && (c === "KeyS" || c === "ArrowDown")) { e.preventDefault(); engine.current?.drop(); return; }
      const dir = KEYS[c];
      if (dir) { e.preventDefault(); held.current.add(dir); pushMove(); return; }
      if (phase === "run" && c === "Space") { e.preventDefault(); if (!e.repeat) engine.current?.jump(); }
      else if (phase === "camp" && e.code === "KeyE" && nearRef.current && !e.repeat) { e.preventDefault(); openSpotRef.current(nearRef.current); }
    };
    const up = (e: KeyboardEvent) => {
      const c = e.code;
      if (phase === "run" && runLocRef.current !== "ruins" && (c === "Space" || c === "KeyW" || c === "ArrowUp")) { engine.current?.release(); return; }
      const dir = KEYS[c];
      if (dir) { held.current.delete(dir); pushMove(); }
    };
    const stop = () => { held.current.clear(); pushMove(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    window.addEventListener("blur", stop); document.addEventListener("visibilitychange", stop);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop); held.current.clear(); pushMove(); };
  }, [moveActive, phase, pushMove]);
  const padProps = (dir: "L" | "R" | "U" | "D") => ({
    onPointerDown: (e: ReactPointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); held.current.add(dir); pushMove(); },
    onPointerUp: (e: ReactPointerEvent) => { e.stopPropagation(); held.current.delete(dir); pushMove(); },
    onPointerCancel: () => { held.current.delete(dir); pushMove(); },
    onLostPointerCapture: () => { held.current.delete(dir); pushMove(); },
  });
  useEffect(() => {
    if (panel === null) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setPanel(null); };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [panel, busy]);

  function toggleSound() {
    const next = !muted; setMuted(next); mutedRef.current = next; setSoundTouched(true);
    sound.current?.setMuted(next); scape.current?.setMuted(next);
    if (!next) { void sound.current?.unlock(); void scape.current?.unlock(); sound.current?.play("select", { volume: 0.4 }); }
  }

  /* ---------- icons (data URLs, cached) ---------- */
  const icons = useMemo(() => ({
    finds: FINDS.forest.map(f => pixmapUrl(f.art, 5)), unknown: FINDS.forest.map(f => pixmapUrl(f.art, 5, true)),
    byLoc: Object.fromEntries(LOCATIONS.map(l => [l, { known: FINDS[l].map(f => pixmapUrl(f.art, 5)), unknown: FINDS[l].map(f => pixmapUrl(f.art, 5, true)) }])) as Record<Location, { known: string[]; unknown: string[] }>,
    crystal: pixmapUrl(CRYSTAL, 3), relic: pixmapUrl(RELIC, 3),
    pass: pixmapUrl(PASS, 3), heart: pixmapUrl(HEART, 3), spark: pixmapUrl(SPARK, 3),
    weather: Object.fromEntries(Object.entries(WEATHER_ICONS).map(([k, v]) => [k, pixmapUrl(v, 3)])) as Record<keyof typeof WEATHER_ICONS, string>,
  }), []);
  const weatherIcon = (w: Weather) => icons.weather[w.rain !== "none" ? w.rain : w.time === "night" ? "moon" : w.time === "evening" ? "dusk" : "sun"];
  const heroPortrait = useMemo(() => {
    if (!sprites) return "";
    const c = document.createElement("canvas"); c.width = 24; c.height = 30; const g = c.getContext("2d"); if (!g) return "";
    drawHero(g, sprites.idle[0], 4, 12, look, "down"); return c.toDataURL();
  }, [sprites, look]);

  /* ---------- render ---------- */
  if (loadError) return <div className="xp-root xp-center" role="alert">
    <p>{loadError}</p>
    <button type="button" className="xp-btn" onClick={() => { setLoadError(""); setLoadAttempt(n => n + 1); void client.read().then(setSnapshot).catch(() => {}); }}>Retry</button>
  </div>;
  if (!snapshot || !sprites) return <div className="xp-root xp-center" role="status"><div className="xp-loader" aria-hidden="true" /><p>Packing the backpack…</p></div>;
  if (snapshot.friendId !== friendId) return <div className="xp-root xp-center" role="alert">This session does not match the selected Friend.</div>;

  const revealIndex = reveal?.outcomeId ? reveal.outcomeId - 1 : -1;
  const revealOutcome = revealIndex >= 0 ? definition.outcomes[revealIndex] : null;
  const invCount = snapshot.inventory.reduce((a, n, i) => definition.outcomes[i].reward > 0n ? a + n : a, 0n);
  const invValue = snapshot.inventory.reduce((a, n, i) => a + n * definition.outcomes[i].reward, 0n);
  const nextLevel = LEVELS[Math.min(level + 1, LEVELS.length - 1)];
  const levelFloor = LEVELS[level];
  const xpPct = level === LEVELS.length - 1 ? 100 : Math.round(((xp - levelFloor) / (nextLevel - levelFloor)) * 100);
  const mode = client.mode === "preview" ? "simulated" : "on-chain";
  const clampN = (n: bigint, max: bigint) => (n < max ? n : max < 0n ? 0n : max);
  const heldAt = (loc: Location, i: number) => {
    const inv = snapshot.inventory[i] - (i === 0 ? BigInt(junkUsed) : 0n), cave = clampN(BigInt(extraHeld.cave[i]), inv), ruins = clampN(BigInt(extraHeld.ruins[i]), inv - cave);
    return loc === "cave" ? cave : loc === "ruins" ? ruins : inv - cave - ruins;
  };
  const junk = { forest: heldAt("forest", 0), cave: heldAt("cave", 0), ruins: heldAt("ruins", 0) };
  const junkTotal = junk.forest + junk.cave + junk.ruins;
  const findIcon = (loc: Location, i: number, known = true) => (known ? icons.byLoc[loc].known : icons.byLoc[loc].unknown)[i];
  const inCave = runLoc === "cave", inRuins = runLoc === "ruins";
  const shownLoc: Location = unlocked(boardLoc) ? boardLoc : "forest";
  const runWord = inCave ? "Descent" : inRuins ? "Gauntlet" : "Run", pickWord = inCave ? "crystals" : inRuins ? "relic shards" : "sparks";
  const season = seasonActive();
  const TrailItem = ({ item, seasonal = false }: { item: StoreItem; seasonal?: boolean }) => {
    const has = owned.has(item.id), on = equipped.has(item.id);
    return <div className={`xp-item${seasonal ? " xp-season" : ""}`}>
      <span><strong>{item.name}</strong><small>{item.effect}</small></span>
      {has
        ? <button type="button" className="xp-btn" aria-pressed={on} onClick={() => toggleWear(item.id)}>{on ? "Turn off" : "Turn on"}</button>
        : <button type="button" className="xp-btn" disabled={busy || (seasonal && !season)} onClick={() => buyStore(item.id, item.price, () => toggleWear(item.id, true))}>{seasonal && !season ? "Gone until next autumn" : `Buy · ${item.price} RF`}</button>}
    </div>;
  };
  const perkLabel = perk.perk ? `${perk.perk.name}${perk.rank > 0 ? ` ${RANK_LABEL[perk.rank]}` : ""}` : "";
  const genLabel = generation === undefined ? "reading…" : generation === null ? "unknown" : `Generation ${generation}`;

  return <section className="xp-root" aria-label={definition.name} aria-busy={busy}
    onPointerDown={e => { if (phase === "run" && !(e.target as HTMLElement).closest("button")) { e.preventDefault(); engine.current?.jump(); } }}
    onPointerUp={() => { if (phase === "run") engine.current?.release(); }}>
    <canvas ref={canvasRef} className="xp-canvas" width={W} height={H} role="img"
      aria-label={phase === "camp" ? "Your Friend resting at the camp by the fire" : "Your Friend running through the forest"} />

    {phase === "camp" && <>
      <div className="xp-hud">
        <div className="xp-card xp-id">
          {heroPortrait && <img src={heroPortrait} alt="" width={40} height={50} />}
          <span><strong>Friend #{friendId.toString()}</strong><small>Lv {level + 1} · {TITLES[level]}{family ? ` · ${family}` : ""}</small>
            <span className="xp-bar" aria-label={`Experience ${xp}`}><span style={{ width: `${xpPct}%` }} /></span></span>
        </div>
        <button type="button" className="xp-card xp-money" title={`Balances are ${mode} · open Economy`} onClick={() => openSpot("economy")}>
          <span><strong>{rfText(balance)}</strong><small>{mode} · economy</small></span>
          <span className="xp-pass"><img src={icons.pass} alt="" width={30} height={21} /> {passes.toString()}</span>
        </button>
        <div className={`xp-card xp-weather xp-rain-${campRain}`} role="status" aria-label={`Camp weather: ${RAIN_LABEL[campRain]}`}>
          <img className="xp-wicon" src={weatherIcon({ time: "night", rain: campRain })} alt="" width={27} height={27} />
          <span><strong>{campRain === "none" ? "Clear night" : RAIN_LABEL[campRain]}</strong><small>camp weather</small></span>
        </div>
        <div className="xp-tools">
          <button type="button" className={`xp-icon${muted && !soundTouched ? " xp-icon-hint" : ""}`} title={muted ? "Turn sound on: music, rain and fire" : "Turn sound off"} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={toggleSound}>{muted ? <span className="xp-strike">♪</span> : "♪"}</button>
          <button type="button" className="xp-icon xp-icon-eco" aria-label="Economy: where RF goes" title="Economy" onClick={() => openSpot("economy")}>RF</button>
          <button type="button" className="xp-icon" aria-label="Settings" onClick={() => setPanel("settings")}>⚙</button>
        </div>
      </div>
      {(Object.keys(CAMP_SPOTS) as CampSpot[]).map(spot => <button key={spot} type="button" className={`xp-spot xp-spot-${spot}${near === spot ? " xp-spot-near" : ""}`}
        style={{ left: `${(CAMP_SPOTS[spot].x / W) * 100}%`, top: `${(CAMP_SPOTS[spot].y / H) * 100}%` }}
        onClick={() => openSpot(spot)}>
        {SPOT_LABEL[spot]}{spot === "board" && passes > 0n ? ` · ${passes.toString()}` : ""}{spot === "merchant" && invCount > 0n ? ` · ${invCount.toString()}` : ""}
      </button>)}
      {!panel && portraitPhone && !rotateHintClosed && <p className="xp-tip xp-tip-closable xp-rotate" role="status">
        <span>Turn your phone sideways for a bigger view</span>
        <button type="button" className="xp-tip-x" aria-label="Hide this hint" onClick={() => setRotateHintClosed(true)}>✕</button></p>}
      {!panel && near && <p className="xp-tip">Press <b>E</b> to open <b>{SPOT_LABEL[near]}</b></p>}
      {!panel && !near && !walkHintClosed && <p className="xp-tip xp-tip-closable">
        <span>{expeditions === 0
          ? <>Walk with <b>W A S D</b> or arrows to the <b>Expeditions</b> board and press <b>E</b> · or tap a label</>
          : <>Walk with <b>W A S D</b> · press <b>E</b> at a place · or tap a label</>}</span>
        <button type="button" className="xp-tip-x" aria-label="Hide this hint" onClick={() => setWalkHintClosed(true)}>✕</button></p>}
    </>}

    {phase === "run" && inRuins && <p className="xp-weather-run xp-ruins-run" aria-live="polite">Sunken Ruins · beat the hourglass · XP ×{RUINS_XP}{perk.rank > 0 ? ` · ${perkLabel}` : ""}</p>}
    {phase === "run" && !inRuins && (inCave
      ? <p className="xp-weather-run xp-cave-run" aria-live="polite"><img src={icons.crystal} alt="" width={15} height={18} /> Crystal Cave · lantern light · XP ×{CAVE_XP}{perk.rank > 0 ? ` · ${perkLabel}` : ""}</p>
      : <p className="xp-weather-run" aria-live="polite"><img src={weatherIcon(runWeather)} alt="" width={18} height={18} /> {TIME_LABEL[runWeather.time]} · {RAIN_LABEL[runWeather.rain]}{XP_MULT[runWeather.rain] > 1 ? ` · XP ×${XP_MULT[runWeather.rain]}` : ""}{perk.rank > 0 ? ` · ${perkLabel}` : ""}</p>)}
    {phase === "run" && (inCave || inRuins) && zoneBanner !== null && (() => { const Z = inRuins ? RUINS_ZONES : CAVE_ZONES, z = Z[Math.min(zoneBanner, Z.length - 1)]; return <p className={`xp-zone${inRuins ? " xp-zone-ruins" : ""}`} role="status"><small>{inRuins ? "Hall" : "Zone"} {Math.min(zoneBanner, Z.length - 1) + 1} of {Z.length}</small><b>{z.name}</b><small>{z.note}</small></p>; })()}
    {phase === "run" && showHint && !runHintClosed && <p className="xp-tip xp-tip-run xp-tip-closable"><span>{inRuins
      ? <>W A S D / arrows: step tile by tile (hold to keep walking) · reach the altar before the sand runs out · spikes rise in waves, darts fly, boulders roll, the floor crumbles</>
      : inCave
      ? <>A / D: steer · hold W / Space / tap: grip the rope (slower) · S: dive · collect crystals, avoid ledges, spiders, bats and beetles</>
      : <>W / Space / ↑ or tap: jump{owned.has("boots") ? " (twice with boots)" : ""} · A / D: move · S: drop · collect sparks, dodge roots, slimes and bees</>}</span>
      <button type="button" className="xp-tip-x" aria-label="Hide this hint" onPointerDown={e => e.stopPropagation()} onClick={() => setRunHintClosed(true)}>✕</button></p>}

    {phase === "chest" && <p className="xp-tip xp-tip-run" role="status">{busy ? "Opening the chest…" : runResult?.completed === false ? (inCave ? "Out of hearts! The rope lets your Friend slide safely to the grotto." : inRuins ? "The ruins rumble! The guardians let your Friend take the find and go." : "Out of hearts! Your Friend heads home with the find.") : "The chest!"}
      {!busy && playId !== null && error && <button type="button" className="xp-btn" onClick={() => void settle(playId)}>Try again</button>}
      {!busy && playId !== null && notice && <button type="button" className="xp-btn" onClick={() => void settle(playId)}>Open chest</button>}</p>}

    {(phase === "run" || (phase === "camp" && !panel)) && <div className="xp-pad" aria-hidden="true">
      <div className="xp-dpad">
        {(phase === "camp" || inRuins) && <button type="button" tabIndex={-1} className="xp-d xp-d-u" {...padProps("U")}>▲</button>}
        <button type="button" tabIndex={-1} className="xp-d xp-d-l" {...padProps("L")}>◀</button>
        <button type="button" tabIndex={-1} className="xp-d xp-d-r" {...padProps("R")}>▶</button>
        {(phase === "camp" || inCave || inRuins) && <button type="button" tabIndex={-1} className="xp-d xp-d-d" {...padProps("D")}>▼</button>}
      </div>
      {phase === "run"
        ? !inRuins && <button type="button" tabIndex={-1} className="xp-jump" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); engine.current?.jump(); }} onPointerUp={e => { e.stopPropagation(); engine.current?.release(); }}>{inCave ? "HOLD" : "JUMP"}</button>
        : near && <button type="button" tabIndex={-1} className="xp-jump" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); openSpot(near); }}>E</button>}
    </div>}

    {phase === "reveal" && revealOutcome && <div className="xp-modal" role="dialog" aria-modal="true" aria-labelledby="xp-reveal-title">
      <div className="xp-panel xp-reveal" style={{ ["--rarity" as string]: RARITY_COLOR[RARITIES[revealIndex]] }}>
        <p className="xp-rarity">{RARITY_LABEL[RARITIES[revealIndex]]} find · {revealOutcome.chanceBps / 100}% chance</p>
        <img className={reducedMotion ? "" : "xp-pop"} src={findIcon(runLoc, revealIndex)} alt="" width={100} height={100} />
        <h2 id="xp-reveal-title">{FINDS[runLoc][revealIndex].name}</h2>
        <p className="xp-blurb">{FINDS[runLoc][revealIndex].blurb}</p>
        <p className="xp-small">{revealOutcome.reward > 0n ? `Merchant pays ${rfText(revealOutcome.reward)} · no expiry` : "No RF value · a keepsake for the collection"}</p>
        <p className="xp-small">{runWord}: <img src={inCave ? icons.crystal : icons.spark} alt="" width={15} height={15} /> {runResult?.sparks ?? 0} {pickWord} · +{gainedXp} XP{inCave ? ` (cave ×${CAVE_XP})` : inRuins ? ` (ruins ×${RUINS_XP})` : XP_MULT[runWeather.rain] > 1 ? ` (${RAIN_LABEL[runWeather.rain].toLowerCase()} ×${XP_MULT[runWeather.rain]})` : ""}{perk.effects.xpMult > 1 ? ` (${perkLabel} ×${perk.effects.xpMult.toFixed(2).replace(/0$/, "")})` : ""}{runResult?.completed && runResult.hits === 0 ? " · flawless!" : ""}</p>
        <div className="xp-row">
          <button type="button" className="xp-btn" disabled={busy} onClick={backToCamp}>Keep it</button>
          {revealOutcome.reward > 0n && <button type="button" className="xp-btn xp-primary" disabled={busy || paused}
            onClick={() => void sell(revealIndex + 1, 1n, runLoc).then(ok => { if (ok) backToCamp(); })}>Sell · {rfText(revealOutcome.reward)}</button>}
        </div>
        {error && <p role="alert" className="xp-error">{error}</p>}
      </div>
    </div>}

    {phase === "camp" && panel && <div className="xp-modal" role="dialog" aria-modal="true" aria-labelledby="xp-panel-title" onPointerDown={e => { if (e.target === e.currentTarget && !busy) setPanel(null); }}>
      <div className="xp-panel">
        <header><h2 id="xp-panel-title">{panel === "settings" ? "Settings" : panel === "economy" ? "Economy · where RF goes" : panel === "board" ? "Expedition board" : SPOT_LABEL[panel]}</h2>
          <button type="button" className="xp-close" aria-label="Close" disabled={busy} onClick={() => setPanel(null)}>✕</button></header>
        <div className="xp-panel-body">
          {panel === "board" && <>
            <div className="xp-locations">
              <button type="button" aria-pressed={shownLoc === "forest"} className="xp-loc xp-loc-art" style={{ backgroundImage: `url(${forestCard(forecast)})` }} onClick={() => setBoardLoc("forest")}>
                <strong>Whispering Forest <Pips n={1} label="Difficulty: normal" /></strong><small>Runner · jump and dodge · ~25 s</small>
                <small className="xp-forecast"><img src={weatherIcon(forecast)} alt="" width={18} height={18} /> Forecast: {TIME_LABEL[forecast.time]} · {RAIN_LABEL[forecast.rain]}{XP_MULT[forecast.rain] > 1 ? ` · XP ×${XP_MULT[forecast.rain]}` : ""}</small></button>
              <button type="button" aria-pressed={shownLoc === "cave"} disabled={!unlocked("cave")} className={`xp-loc xp-loc-art xp-loc-cave${unlocked("cave") ? "" : " xp-loc-dark"}`} style={{ backgroundImage: `url(${caveCard()})` }} onClick={() => setBoardLoc("cave")}>
                <strong>Crystal Cave <Pips n={2} label="Difficulty: hard" /></strong>
                <small>{unlocked("cave") ? `Descent on a rope · XP ×${CAVE_XP}` : "Locked · Cave Lantern, 5 RF"}</small></button>
              <button type="button" aria-pressed={shownLoc === "ruins"} disabled={!unlocked("ruins")} className={`xp-loc xp-loc-art xp-loc-ruins${unlocked("ruins") ? "" : " xp-loc-dark"}`} style={{ backgroundImage: `url(${ruinsCard()})` }} onClick={() => setBoardLoc("ruins")}>
                <strong>Sunken Ruins <Pips n={3} label="Difficulty: very hard" /></strong>
                <small>{unlocked("ruins") ? `Trap gauntlet vs. the hourglass · XP ×${RUINS_XP}` : "Locked · Ruins Map, 8 RF"}</small></button>
            </div>
            <p>An <b>Expedition Pass</b> costs <b>{rfText(definition.price)}</b>. You have <b>{passes.toString()}</b>{pending ? " (and one expedition already paid for)" : ""}.</p>
            <div className="xp-row">
              <button type="button" className="xp-btn" disabled={busy || paused || !canAfford(1n)} onClick={() => void buyPasses(1n)}>Buy 1 pass · {rfText(definition.price)}</button>
              <button type="button" className="xp-btn" disabled={busy || paused || !canAfford(3n)} onClick={() => void buyPasses(3n)}>Buy 3 · {rfText(definition.price * 3n)}</button>
              <button type="button" className="xp-btn xp-primary" disabled={busy || paused || (!pending && passes === 0n)} onClick={() => void startExpedition()}>{pending ? "Resume expedition" : shownLoc === "cave" ? "Into the cave!" : shownLoc === "ruins" ? "Enter the ruins!" : "Set out!"}</button>
            </div>
            <table className="xp-odds"><caption>What your Friend can bring back</caption>
              <thead><tr><th>Find</th><th>Chance</th><th>Merchant pays</th></tr></thead>
              <tbody>{definition.outcomes.map((o, i) => <tr key={o.name}>
                <td><img src={findIcon(shownLoc, i)} alt="" width={20} height={20} /> <span style={{ color: RARITY_COLOR[RARITIES[i]] }}>{FINDS[shownLoc][i].name}</span> <small>{RARITY_LABEL[RARITIES[i]]}</small></td>
                <td>{o.chanceBps / 100}%</td><td>{o.reward > 0n ? rfText(o.reward) : "—"}</td></tr>)}</tbody>
            </table>
            <p className="xp-small">Expected return {evText} per pass · {winPct}% chance of 1 RF or more. The find is locked in when your Friend sets out; running well earns XP, never different odds. All three places share the same odds and prices; only the finds look different. Harder places pay more XP.</p>
          </>}

          {panel === "merchant" && <>
            <p>“Fair prices, forever. I never change them.” · Your finds are worth <b>{rfText(invValue)}</b>.</p>
            {LOCATIONS.flatMap(loc => definition.outcomes.map((o, i) => {
              const n = heldAt(loc, i);
              if (o.reward === 0n || (loc !== "forest" && n === 0n)) return null;
              return <div className="xp-item" key={`${loc}-${o.name}`}>
                <img src={findIcon(loc, i)} alt="" width={30} height={30} />
                <span><strong style={{ color: RARITY_COLOR[RARITIES[i]] }}>{FINDS[loc][i].name}</strong><small>{n.toString()} owned · {rfText(o.reward)} each</small></span>
                <button type="button" className="xp-btn" disabled={busy || paused || n === 0n} onClick={() => void sell(i + 1, 1n, loc)}>Sell 1</button>
                <button type="button" className="xp-btn" disabled={busy || paused || n < 2n} onClick={() => void sell(i + 1, n, loc)}>Sell all</button>
              </div>;
            }))}
            <p className="xp-small">Dry Twigs, Plain Pebbles and Pottery Shards have no RF value and stay in your collection. Cave finds pay the same as forest finds of the same rarity.</p>
          </>}

          {panel === "outfitter" && <>
            <p>Everything here is paid in RF and <b>never refunded</b>: 50% is burned, 50% goes to Rare Friends rewards (proposed split, simulated in this preview). Items last for this session.</p>
            <p className="xp-small">Spent this session: <b>{rfText(storeSpent)}</b> · burned: <b>{rfText(storeSpent / 2n)}</b></p>
            <h3>Gear</h3>
            {STORE.filter(s => s.kind === "gear").map(s => <div className="xp-item" key={s.id}>
              <span><strong>{s.name}</strong><small>{s.effect}</small></span>
              {owned.has(s.id) ? <span className="xp-owned">Owned</span> : <button type="button" className="xp-btn" disabled={busy} onClick={() => buyStore(s.id, s.price, () => {})}>Buy · {s.price} RF</button>}
            </div>)}
            <h3>Trails</h3>
            <p className="xp-small">A trail follows your Friend on expeditions. Your Friend keeps its original look: nothing is worn on it.</p>
            {STORE.filter(s => s.kind === "trail").map(s => <TrailItem key={s.id} item={s} />)}
            <h3 className="xp-season-title">{SEASON.name} <span className="xp-season-badge">{season ? `limited · until ${SEASON.endLabel}` : "season over"}</span></h3>
            <p className="xp-small">An autumn trail sold only this season. Pumpkins appear around the camp while it lasts.</p>
            {STORE.filter(s => s.kind === "season").map(s => <TrailItem key={s.id} item={s} seasonal />)}
            <h3>Workbench</h3>
            <div className="xp-item">
              <img src={icons.finds[0]} alt="" width={30} height={30} />
              <span><strong>Twig Torch</strong><small>Craft from any {TORCH_JUNK} junk finds: Dry Twigs, Plain Pebbles or Pottery Shards · cosmetic · glows at dusk and night, widens the lantern light in the cave</small>
                <small>You have {junkTotal.toString()} · {junk.forest.toString()} twigs · {junk.cave.toString()} pebbles · {junk.ruins.toString()} shards</small>
                <span className="xp-bar xp-bar-craft" aria-label={`${junkTotal.toString()} of ${TORCH_JUNK} junk finds`}><span style={{ width: `${Math.min(100, Number(junkTotal) * 100 / TORCH_JUNK)}%` }} /></span></span>
              {owned.has("torch")
                ? <button type="button" className="xp-btn" aria-pressed={equipped.has("torch")} onClick={() => toggleWear("torch")}>{equipped.has("torch") ? "Put away" : "Carry"}</button>
                : <button type="button" className="xp-btn" disabled={busy || junkTotal < BigInt(TORCH_JUNK)} onClick={() => craftTorch(junk)}>Craft</button>}
            </div>
          </>}

          {panel === "collection" && <>
            <div className="xp-hero-card">
              {heroPortrait && <img className="xp-hero-portrait" src={heroPortrait} alt={`Friend #${friendId.toString()}`} width={96} height={120} />}
              <div className="xp-hero-info">
                <h3>Friend #{friendId.toString()}</h3>
                <p className="xp-small">{family ?? "Unknown family"} · {genLabel}</p>
                <div className={`xp-perk${perk.rank > 0 ? "" : " xp-perk-none"}`}>
                  <strong>{perk.perk ? perk.perk.name : "No perk"}{perk.rank > 0 ? <span className="xp-rank">{RANK_LABEL[perk.rank]}</span> : null}</strong>
                  <small>{perk.rank > 0 ? perk.text : generation === undefined ? "Reading the Friend's generation…" : "Generation 6 Friends play the full game without a perk. Older generations (5 → 1) unlock a stronger family perk."}</small>
                </div>
                <div className="xp-stats">
                  <span>Level <b>{level + 1}</b> · {TITLES[level]}</span><span>XP <b>{xp}</b>{level < LEVELS.length - 1 ? ` / ${nextLevel}` : ""}</span>
                  <span>Expeditions <b>{expeditions}</b></span><span title="Sparks, crystals and relic shards picked up · each gives 1 XP">Collected <b>{totalSparks}</b></span>
                  <span className="xp-stat-wide">Best find <b style={bestFind ? { color: RARITY_COLOR[RARITIES[bestFind.i]] } : undefined}>{bestFind ? FINDS[bestFind.loc][bestFind.i].name : "—"}</b></span>
                </div>
              </div>
            </div>
            <div className="xp-tabs" role="tablist">{LOCATIONS.map(loc => <button key={loc} type="button" role="tab" aria-selected={collectionTab === loc} className="xp-tab" onClick={() => setCollectionTab(loc)}>{LOCATION_NAME[loc]} · {everFound[loc].filter(Boolean).length}/{FINDS[loc].length}</button>)}</div>
            <div className="xp-grid">{FINDS[collectionTab].map((f, i) => { const known = everFound[collectionTab][i]; return <div key={f.name} className={`xp-slot ${known ? "" : "xp-slot-unknown"}`} style={{ ["--rarity" as string]: RARITY_COLOR[RARITIES[i]] }}>
              <img src={findIcon(collectionTab, i, known)} alt="" width={50} height={50} />
              <strong>{known ? f.name : "???"}</strong><small>{RARITY_LABEL[RARITIES[i]]} · ×{heldAt(collectionTab, i).toString()}</small>
            </div>; })}</div>
            <p className="xp-small">{collectionTab === "cave" && !unlocked("cave") ? "Buy a Cave Lantern at the Outfitter to explore the Crystal Cave. " : collectionTab === "ruins" && !unlocked("ruins") ? "Buy a Ruins Map at the Outfitter to explore the Sunken Ruins. " : ""}Kept finds keep their merchant price forever.</p>
          </>}

          {panel === "economy" && <>
            <div className="xp-flow" role="list">
              <div className="xp-flow-row" role="listitem"><span className="xp-flow-box">Expedition Pass<small>{rfText(definition.price)}</small></span><span className="xp-flow-arrow" aria-hidden="true">→</span><span className="xp-flow-box">Game bank<small>holds pass RF</small></span><span className="xp-flow-arrow" aria-hidden="true">→</span><span className="xp-flow-box">Merchant<small>pays finds</small></span></div>
              <div className="xp-flow-row" role="listitem"><span className="xp-flow-box">Outfitter<small>gear &amp; style</small></span><span className="xp-flow-arrow" aria-hidden="true">→</span><span className="xp-flow-box xp-burn">50% burned<small>gone for good</small></span><span className="xp-flow-box xp-reward">50% rewards<small>Friend holders</small></span></div>
            </div>
            <table className="xp-odds"><caption>The numbers</caption><tbody>
              <tr><td>Expected return per pass</td><td><b>{evText}</b></td></tr>
              <tr><td>House edge (stays in the game bank)</td><td><b>10%</b></td></tr>
              <tr><td>Chance of 1 RF or more back</td><td><b>{winPct}%</b></td></tr>
              <tr><td>Biggest find (bank keeps this in reserve)</td><td><b>{rfText(maxPrize)}</b></td></tr>
              <tr><td>Outfitter purchases</td><td><b>never refunded</b></td></tr>
            </tbody></table>
            <h3>This session</h3>
            <div className="xp-stats">
              <span>Passes bought <b>{rfText(passSpent)}</b></span><span>Finds sold <b>{rfText(salesEarned)}</b></span>
              <span>Outfitter <b>{rfText(storeSpent)}</b></span><span>Burned <b>{rfText(storeSpent / 2n)}</b></span>
              <span className="xp-stat-wide">Finds kept, worth <b>{rfText(invValue)}</b></span>
            </div>
            <p className="xp-small">Pass purchases, finds and sales are {mode} through FriendSDK. The Outfitter split (50% burn / 50% Friend rewards) is a proposal simulated in this preview: FriendSDK v0.1.2 has no upgrade API. Perks and weather change XP and the run, never odds or prices.</p>
          </>}

          {panel === "settings" && <>
            <div className="xp-row"><button type="button" className="xp-btn" aria-pressed={!muted} onClick={toggleSound}>{muted ? "Sound: off" : "Sound: on"}</button>
              <button type="button" className="xp-btn" aria-pressed={musicOn} disabled={muted} onClick={() => setMusicOn(m => !m)}>{musicOn ? "Music: on" : "Music: off"}</button>
              <label className="xp-check">Volume <input type="range" min={0} max={100} step={5} value={volume} disabled={muted} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume" /></label>
              <label className="xp-check"><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduce motion</label></div>
            <h3>How to play</h3>
            <p>Walk with W A S D or the arrow keys (on touch screens, use the on-screen pad). In the camp, press E at a place or tap its label. Buy an Expedition Pass at the board and send your Friend out. In the forest, jump with W, Space or ↑ (or tap / the Jump button), move forward and back with A / D and drop faster with S. Sparks give XP; roots, slimes and bees cost a heart. Every expedition has its own time of day and weather, shown as a forecast on the board: rain pays a little more XP (light ×1.1, heavy ×1.2, thunderstorm ×1.3) but never changes what you find. The camp weather changes on its own. Every expedition ends at a chest, even when the hearts run out: the pass already decided the find when your Friend set out.</p>
            <h3>Sparks, crystals and relic shards</h3>
            <div className="xp-pickups">
              <span><img src={icons.spark} alt="" width={15} height={15} /> <b>Sparks</b> in the Whispering Forest</span>
              <span><img src={icons.crystal} alt="" width={15} height={18} /> <b>Crystals</b> in the Crystal Cave</span>
              <span><img src={icons.relic} alt="" width={21} height={21} /> <b>Relic shards</b> in the Sunken Ruins</span>
            </div>
            <p>Everything you pick up on an expedition turns into <b>experience (XP)</b>: 1 XP each, plus a bonus for reaching the chest: forest +{FINISH_XP.forest}, cave +{FINISH_XP.cave}, ruins +{FINISH_XP.ruins} (doubled without a single hit). The total is multiplied by the place (forest ×1, up to ×1.3 in the rain; cave ×{CAVE_XP}; ruins ×{RUINS_XP}): the harder the place, the more XP and by your Friend's perk. XP raises your Friend's <b>level and title</b>: {TITLES.join(" → ")}. Your progress is shown on the hero card in the Collection. Sparks, crystals and shards are not RF and never change what you find.</p>
            <h3>Friend perks</h3>
            <p>Your Friend's family picks its perk; its generation sets the strength: Generation 1 gets rank V, Generation 5 rank I, Generation 6 plays without a perk. Perks help in the forest run and with XP only. Every hardwired Friend plays the full game with the same odds.</p>
            <table className="xp-odds"><tbody>{["Skeleton", "Mask", "Family", "Cellular", "Asymmetry", "Hoverer", "Colossus", "Sparkling", "Hollow"].map(f => { const p = perkFor(f, 1); return <tr key={f}><td>{f}</td><td><b>{p.perk?.name}</b> <small>{p.text} (at V)</small></td></tr>; })}</tbody></table>
            <p className="xp-small">Balances, purchases, finds and sales are {mode}. Outfitter purchases are simulated on top of the SDK (FriendSDK v0.1.2 has no upgrade API). Progress resets when the page reloads. Wallet connection and NFT ownership checks are provided by the Rare Friends runtime.</p>
          </>}
        </div>
        <p className={`xp-status${error || notice || busy ? "" : " xp-status-empty"}`} role={error ? "alert" : "status"}>{error || notice || (busy ? "Waiting for confirmation…" : " ")}</p>
      </div>
    </div>}
  </section>;
}
