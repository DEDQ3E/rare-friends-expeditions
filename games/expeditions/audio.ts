/** Procedural soundscape for Rare Friends: Expeditions (Web Audio, synthesized in code: no recordings or samples).
 *
 * - Music: a calm camp tune by the fire and livelier forest tunes that follow the time of day.
 * - Ambience: campfire crackle, crickets at night, birds by day, and rain whose sound follows its strength
 *   (light patter, heavy downpour, thunderstorm with low rumble and thunder claps).
 * - Effects: footsteps, jump, landing, sparks, hits, hearts, stomp and shield.
 *
 * Nothing plays until unlock() is called from a player gesture. Muted, paused or hidden → the audio
 * context is suspended, so no sound is queued for later. */

import type { Rain, TimeOfDay } from "./weather.js";

export type SoundScene = Readonly<{ mode: "camp" | "run" | "cave" | "ruins"; rain: Rain; time: TimeOfDay }>;
export type Sfx = "step-grass" | "step-path" | "jump" | "jump-air" | "land" | "spark" | "hit" | "heart" | "stomp" | "shield" | "rumble" | "whoosh" | "zone" | "step-stone" | "arrow" | "crumble" | "tick" | "spikewarn";

type Track = Readonly<{ bpm: number; chords: readonly (readonly number[])[]; beatsPerChord: number; arp: readonly number[]; arpChance: number;
  melody: readonly number[]; melodyChance: number; bass: readonly number[]; hat: boolean; pad: number; pluck: number }>;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Chords are MIDI notes (low → high). Arp indexes walk the chord one octave up.
const TRACKS: Readonly<Record<string, Track>> = {
  camp: { bpm: 64, beatsPerChord: 8, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 64]],
    arp: [0, 2, 1, 3, 2, 1, 3, 2], arpChance: 0.55, melody: [69, 72, 74, 76, 79, 81], melodyChance: 0.18, bass: [0], hat: false, pad: 0.026, pluck: 0.05 },
  morning: { bpm: 96, beatsPerChord: 8, chords: [[48, 52, 55, 60], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]],
    arp: [0, 1, 2, 3, 2, 1, 2, 3], arpChance: 0.85, melody: [72, 74, 76, 79, 81, 84], melodyChance: 0.22, bass: [0, 4], hat: true, pad: 0.014, pluck: 0.05 },
  day: { bpm: 108, beatsPerChord: 8, chords: [[48, 52, 55, 60], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]],
    arp: [0, 2, 1, 3, 0, 2, 1, 3], arpChance: 0.95, melody: [72, 74, 76, 79, 81, 84], melodyChance: 0.28, bass: [0, 4], hat: true, pad: 0.012, pluck: 0.055 },
  evening: { bpm: 92, beatsPerChord: 8, chords: [[48, 52, 55, 59], [45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62]],
    arp: [0, 1, 2, 3, 1, 2, 3, 2], arpChance: 0.8, melody: [69, 72, 74, 76, 79], melodyChance: 0.2, bass: [0, 4], hat: true, pad: 0.018, pluck: 0.048 },
  cave: { bpm: 66, beatsPerChord: 8, chords: [[45, 52, 57, 59], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]],
    arp: [0, 3, 2, 1, 3, 2, 0, 2], arpChance: 0.42, melody: [69, 71, 72, 76, 77, 81], melodyChance: 0.14, bass: [0], hat: false, pad: 0.03, pluck: 0.045 },
  ruins: { bpm: 100, beatsPerChord: 8, chords: [[52, 56, 59, 64], [53, 57, 60, 65], [52, 56, 59, 62], [50, 53, 57, 60]],
    arp: [0, 1, 2, 1, 3, 2, 1, 2], arpChance: 0.8, melody: [64, 65, 68, 69, 71, 72, 76], melodyChance: 0.3, bass: [0, 3, 4, 6], hat: true, pad: 0.018, pluck: 0.05 },
  night: { bpm: 84, beatsPerChord: 8, chords: [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]],
    arp: [0, 2, 3, 2, 1, 2, 3, 1], arpChance: 0.7, melody: [69, 72, 74, 76, 79], melodyChance: 0.16, bass: [0], hat: false, pad: 0.022, pluck: 0.045 },
};
const trackFor = (s: SoundScene) => (s.mode === "camp" ? "camp" : s.mode === "cave" ? "cave" : s.mode === "ruins" ? "ruins" : s.time);

const RAIN_MIX: Readonly<Record<Rain, { hiss: number; lp: number; drops: number; rumble: number; duck: number }>> = {
  none: { hiss: 0, lp: 2500, drops: 0, rumble: 0, duck: 1 },
  light: { hiss: 0.05, lp: 2600, drops: 7, rumble: 0, duck: 0.92 },
  heavy: { hiss: 0.13, lp: 4800, drops: 22, rumble: 0.03, duck: 0.75 },
  storm: { hiss: 0.18, lp: 6000, drops: 30, rumble: 0.09, duck: 0.6 },
};

export function createSoundscape() {
  let ctx: AudioContext | null = null;
  let master: GainNode, musicBus: GainNode, ambBus: GainNode, sfxBus: GainNode, reverb: ConvolverNode, reverbSend: GainNode;
  let white: AudioBuffer, brown: AudioBuffer;
  let rainGain: GainNode, rainLp: BiquadFilterNode, rumbleGain: GainNode, fireGain: GainNode, windGain: GainNode;
  let muted = true, paused = false, hidden = false, musicOn = true, volume = 0.8;
  let scene: SoundScene = { mode: "camp", rain: "none", time: "night" };
  let timer = 0, lastTick = 0;
  type Playing = { key: string; track: Track; gain: GainNode; nextBeat: number; beat: number; dying: boolean };
  let playing: Playing[] = [];
  let sparkStreak = 0, lastSpark = 0;

  /* ---------- building blocks ---------- */
  function noiseBuffer(c: AudioContext, kind: "white" | "brown") {
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === "white") d[i] = w; else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } }
    return buf;
  }
  function impulse(c: AudioContext, seconds: number) {
    const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return buf;
  }
  function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tone(t: number, freq: number, dur: number, peak: number, out: AudioNode, type: OscillatorType = "sine", toFreq?: number, attack = 0.008) {
    const c = ctx!; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    env(g, t, peak, attack, dur); o.connect(g).connect(out); o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function burst(t: number, dur: number, peak: number, out: AudioNode, filter: BiquadFilterType, freq: number, q = 1, buffer = white, rate = 1) {
    const c = ctx!; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buffer; s.playbackRate.value = rate; f.type = filter; f.frequency.value = freq; f.Q.value = q;
    env(g, t, peak, 0.004, dur); s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function loop(buffer: AudioBuffer, out: AudioNode) { const s = ctx!.createBufferSource(); s.buffer = buffer; s.loop = true; s.connect(out); s.start(); return s; }

  /* ---------- music ---------- */
  function pluck(t: number, note: number, peak: number, out: AudioNode, len = 1.1) {
    tone(t, midi(note), len, peak, out, "triangle");
    tone(t, midi(note + 12), len * 0.5, peak * 0.35, out, "sine");
  }
  function pad(t: number, notes: readonly number[], dur: number, peak: number, out: AudioNode) {
    const c = ctx!; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(out);
    for (const n of notes.slice(0, 3)) for (const det of [-6, 6]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; o.frequency.value = midi(n); o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(1.6, dur * 0.3));
      g.gain.setValueAtTime(peak, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.4);
      o.connect(g).connect(lp); o.start(t); o.stop(t + dur + 1.5);
    }
  }
  function scheduleMusic(until: number) {
    for (const p of playing) {
      const tr = p.track, spb = 60 / tr.bpm;
      while (p.nextBeat < until) {
        const t = p.nextBeat, beatInChord = p.beat % tr.beatsPerChord, chord = tr.chords[Math.floor(p.beat / tr.beatsPerChord) % tr.chords.length];
        if (beatInChord === 0) pad(t, chord, spb * tr.beatsPerChord, tr.pad, p.gain);
        if (tr.bass.includes(beatInChord)) tone(t, midi(chord[0] - 12), spb * 1.6, 0.09, p.gain, "sine");
        for (let half = 0; half < 2; half++) {
          const th = t + half * spb / 2, step = (beatInChord * 2 + half) % tr.arp.length;
          if (Math.random() < tr.arpChance) pluck(th, chord[tr.arp[step]] + 12, tr.pluck * (half ? 0.75 : 1), p.gain, tr.bpm > 100 ? 0.7 : 1.2);
          if (tr.hat && half === 1) burst(th, 0.03, 0.012, p.gain, "highpass", 7000);
        }
        if (beatInChord % 2 === 0 && Math.random() < tr.melodyChance) pluck(t + (Math.random() < 0.5 ? 0 : spb / 2), tr.melody[Math.floor(Math.random() * tr.melody.length)], tr.pluck * 1.1, p.gain, 1.6);
        p.beat++; p.nextBeat += spb;
      }
    }
  }
  function syncTrack() {
    if (!ctx) return;
    const key = musicOn ? trackFor(scene) : "", now = ctx.currentTime;
    for (const p of playing) if (p.key !== key && !p.dying) { p.dying = true; p.gain.gain.cancelScheduledValues(now); p.gain.gain.setTargetAtTime(0, now, 0.6); window.setTimeout(() => { playing = playing.filter(x => x !== p); p.gain.disconnect(); }, 4000); }
    if (key && !playing.some(p => p.key === key && !p.dying)) {
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(1, now, 0.8); g.connect(musicBus); g.connect(reverbSend);
      playing.push({ key, track: TRACKS[key], gain: g, nextBeat: now + 0.15, beat: 0, dying: false });
    }
  }

  /* ---------- ambience ---------- */
  function syncAmbience() {
    if (!ctx) return;
    const now = ctx.currentTime, mix = RAIN_MIX[scene.rain];
    rainGain.gain.setTargetAtTime(mix.hiss, now, 0.8); rainLp.frequency.setTargetAtTime(mix.lp, now, 0.8);
    rumbleGain.gain.setTargetAtTime(mix.rumble, now, 1.2);
    windGain.gain.setTargetAtTime(scene.mode === "cave" ? 0.05 : scene.mode === "ruins" ? 0.025 : 0, now, 0.8);
    reverbSend.gain.setTargetAtTime(scene.mode === "cave" ? 0.55 : 0.28, now, 0.8);
    fireGain.gain.setTargetAtTime(scene.mode === "camp" ? (scene.rain === "heavy" || scene.rain === "storm" ? 0.012 : 0.022) : 0, now, 0.6);
    musicBus.gain.setTargetAtTime(0.9 * mix.duck, now, 1);
  }
  function ambientEvents(t: number, dt: number) {
    const mix = RAIN_MIX[scene.rain];
    // rain drops: short bright ticks on leaves and puddles
    for (let n = 0; n < 3; n++) if (Math.random() < mix.drops * dt / 3) burst(t + Math.random() * dt, 0.02 + Math.random() * 0.03, 0.02 + Math.random() * 0.04, ambBus, "bandpass", 1800 + Math.random() * 3500, 3);
    // campfire crackle and pops
    if (scene.mode === "camp") {
      const wet = scene.rain === "heavy" || scene.rain === "storm";
      if (Math.random() < (wet ? 2 : 4) * dt) burst(t + Math.random() * dt, 0.012 + Math.random() * 0.02, 0.05 + Math.random() * 0.08, ambBus, "bandpass", 1200 + Math.random() * 2400, 1.5);
      if (Math.random() < 0.25 * dt) burst(t, 0.05, 0.12, ambBus, "bandpass", 700, 2);
    }
    // cave: water drips echoing in the dark
    if (scene.mode === "cave") {
      if (Math.random() < 1.1 * dt) { const t0 = t + Math.random() * dt, f = 1300 + Math.random() * 1500; tone(t0, f, 0.09, 0.05, ambBus, "sine", f * 0.55, 0.003); tone(t0, f, 0.09, 0.04, reverbSend, "sine", f * 0.55, 0.003); }
      return;
    }
    // ruins: sand trickling from the ceiling and far-off birds
    if (scene.mode === "ruins") {
      if (Math.random() < 0.8 * dt) burst(t + Math.random() * dt, 0.4 + Math.random() * 0.5, 0.012, ambBus, "highpass", 3500, 0.7);
      if (Math.random() < 0.12 * dt) { const t0 = t + Math.random() * dt, f = 1800 + Math.random() * 700; tone(t0, f, 0.18, 0.012, ambBus, "sine", f * 0.7, 0.01); tone(t0 + 0.22, f * 0.9, 0.2, 0.01, ambBus, "sine", f * 0.6, 0.01); }
      return;
    }
    // crickets at night (camp is always night); rain silences most of them
    const night = scene.mode === "camp" || scene.time === "night" || scene.time === "evening";
    if (night && scene.rain !== "storm" && scene.rain !== "heavy" && Math.random() < (scene.rain === "light" ? 0.25 : 0.7) * dt) {
      const f = 4200 + Math.random() * 900, t0 = t + Math.random() * dt, pulses = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) tone(t0 + i * 0.045, f, 0.025, 0.018, ambBus, "sine", undefined, 0.004);
    }
    // birds by day
    if (scene.mode === "run" && (scene.time === "morning" || scene.time === "day") && scene.rain !== "heavy" && scene.rain !== "storm" && Math.random() < (scene.time === "morning" ? 0.45 : 0.3) * dt) {
      const t0 = t + Math.random() * dt, base = 2400 + Math.random() * 1600, notes = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) { const f = base * (1 + (Math.random() - 0.3) * 0.25); tone(t0 + i * 0.11, f, 0.07, 0.018, ambBus, "sine", f * (Math.random() < 0.5 ? 1.35 : 0.8), 0.006); }
    }
  }

  /* ---------- clock ---------- */
  function tick() {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime, dt = Math.min(0.2, lastTick ? now - lastTick : 0.05); lastTick = now;
    scheduleMusic(now + 0.3);
    ambientEvents(now + 0.05, dt);
  }
  function applyRunning() {
    if (!ctx) return;
    const off = muted || paused || hidden;
    master.gain.setTargetAtTime(off ? 0 : volume * 1.6, ctx.currentTime, 0.05);
    if (off) { window.setTimeout(() => { if (ctx && (muted || paused || hidden) && ctx.state === "running") void ctx.suspend(); }, 150); }
    else if (ctx.state !== "running") { void ctx.resume().then(() => { lastTick = 0; for (const p of playing) p.nextBeat = Math.max(p.nextBeat, ctx!.currentTime + 0.1); }); }
  }
  const onVisibility = () => { hidden = document.visibilityState === "hidden"; applyRunning(); };

  return {
    /** Create or resume the audio context. Call directly from a click, tap or key press. */
    async unlock(): Promise<boolean> {
      try {
        if (!ctx) {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return false;
          const c = new AC(); ctx = c;
          white = noiseBuffer(c, "white"); brown = noiseBuffer(c, "brown");
          master = c.createGain(); master.gain.value = 0; master.connect(c.destination);
          const warm = c.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 3200; warm.connect(master);
          musicBus = c.createGain(); musicBus.gain.value = 0.9; musicBus.connect(warm);
          ambBus = c.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
          sfxBus = c.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
          reverb = c.createConvolver(); reverb.buffer = impulse(c, 2.4); reverbSend = c.createGain(); reverbSend.gain.value = 0.28; reverbSend.connect(reverb); reverb.connect(warm);
          const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
          rainLp = c.createBiquadFilter(); rainLp.type = "lowpass"; rainLp.frequency.value = 2500;
          rainGain = c.createGain(); rainGain.gain.value = 0; loop(white, hp); hp.connect(rainLp).connect(rainGain).connect(ambBus);
          const rlp = c.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 140;
          rumbleGain = c.createGain(); rumbleGain.gain.value = 0; loop(brown, rlp); rlp.connect(rumbleGain).connect(ambBus);
          const fbp = c.createBiquadFilter(); fbp.type = "bandpass"; fbp.frequency.value = 700; fbp.Q.value = 0.6;
          fireGain = c.createGain(); fireGain.gain.value = 0; loop(brown, fbp); fbp.connect(fireGain).connect(ambBus);
          const wbp = c.createBiquadFilter(); wbp.type = "bandpass"; wbp.frequency.value = 260; wbp.Q.value = 0.8;
          windGain = c.createGain(); windGain.gain.value = 0; loop(brown, wbp); wbp.connect(windGain).connect(ambBus);
          timer = window.setInterval(tick, 40);
          document.addEventListener("visibilitychange", onVisibility); hidden = document.visibilityState === "hidden";
          syncAmbience(); syncTrack();
        }
        if (ctx.state !== "running" && !muted && !paused && !hidden) await ctx.resume();
        applyRunning();
        return true;
      } catch { return false; }
    },
    setMuted(value: boolean) { muted = value; applyRunning(); },
    setPaused(value: boolean) { paused = value; applyRunning(); },
    setVolume(value: number) { volume = Math.max(0, Math.min(1, value)); applyRunning(); },
    setMusic(on: boolean) { musicOn = on; syncTrack(); },
    setScene(next: SoundScene) {
      const changedTrack = trackFor(next) !== trackFor(scene);
      scene = next; syncAmbience(); if (changedTrack) syncTrack();
    },
    /** A thunder clap: bright crack, then a long low rumble. */
    thunder() {
      if (!ctx || ctx.state !== "running") return;
      const t = ctx.currentTime + 0.05 + Math.random() * 0.4;
      burst(t, 0.35, 0.22, ambBus, "highpass", 900, 0.7);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = brown; s.playbackRate.value = 0.6 + Math.random() * 0.3; f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(90, t + 3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      s.connect(f).connect(g).connect(ambBus); s.start(t); s.stop(t + 3.8);
    },
    sfx(kind: Sfx) {
      if (!ctx || ctx.state !== "running") return;
      const t = ctx.currentTime + 0.005, out = sfxBus;
      switch (kind) {
        case "step-grass": burst(t, 0.06, 0.05, out, "lowpass", 900 + Math.random() * 300, 0.7); break;
        case "step-path": burst(t, 0.05, 0.06, out, "bandpass", 1600 + Math.random() * 500, 1.2); tone(t, 110 + Math.random() * 20, 0.04, 0.03, out); break;
        case "jump": tone(t, 280, 0.13, 0.08, out, "triangle", 620); break;
        case "jump-air": tone(t, 420, 0.12, 0.07, out, "triangle", 900); burst(t, 0.1, 0.03, out, "highpass", 3000); break;
        case "land": burst(t, 0.05, 0.05, out, "lowpass", 500); break;
        case "spark": {
          const now = ctx.currentTime; sparkStreak = now - lastSpark < 1.2 ? Math.min(sparkStreak + 1, 7) : 0; lastSpark = now;
          const steps = [0, 2, 4, 7, 9, 12, 14, 16], f = midi(81 + steps[sparkStreak]);
          tone(t, f, 0.16, 0.05, out, "sine"); tone(t + 0.03, f * 1.5, 0.12, 0.025, out, "sine"); break;
        }
        case "hit":
          burst(t, 0.16, 0.2, out, "lowpass", 700, 0.8);
          tone(t, 190, 0.28, 0.11, out, "square", 60);
          tone(t + 0.02, 95, 0.2, 0.12, out, "sine", 50); break;
        case "heart": tone(t, midi(76), 0.14, 0.06, out, "sine"); tone(t + 0.1, midi(81), 0.22, 0.06, out, "sine"); tone(t + 0.1, midi(88), 0.2, 0.02, out, "sine"); break;
        case "stomp": tone(t, 240, 0.22, 0.12, out, "sine", 90); burst(t, 0.05, 0.08, out, "bandpass", 1200, 1); tone(t + 0.08, midi(84), 0.12, 0.035, out, "triangle"); break;
        case "rumble": burst(t, 0.7, 0.35, out, "lowpass", 180, 0.7, brown, 0.7); burst(t + 0.05, 0.25, 0.06, out, "bandpass", 900, 1.5); break;
        case "whoosh": {
          const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          s.buffer = white; f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.5); f.frequency.exponentialRampToValueAtTime(500, t + 1.1);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
          s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + 1.3); break;
        }
        case "zone": for (const [i, n] of [64, 69, 76].entries()) { tone(t + i * 0.12, midi(n), 0.5, 0.04, out, "triangle"); tone(t + i * 0.12, midi(n), 0.5, 0.03, reverbSend, "sine"); } break;
        case "step-stone": burst(t, 0.04, 0.06, out, "bandpass", 2200 + Math.random() * 600, 2); tone(t, 150 + Math.random() * 30, 0.03, 0.03, out); break;
        case "arrow": tone(t, 900, 0.08, 0.05, out, "triangle", 400); burst(t, 0.18, 0.04, out, "bandpass", 3000, 2); break;
        case "crumble": burst(t, 0.45, 0.14, out, "lowpass", 600, 0.8, brown, 1.2); burst(t + 0.05, 0.2, 0.05, out, "bandpass", 1500, 1.5); break;
        case "tick": tone(t, 1760, 0.05, 0.05, out, "square"); break;
        case "spikewarn": for (let i = 0; i < 4; i++) burst(t + i * 0.09, 0.06, 0.06 + i * 0.015, out, "bandpass", 900 + i * 250, 2.5, brown, 1.6); burst(t, 0.4, 0.03, out, "highpass", 3000, 0.7); break; // grinding stone and trickling grit
        case "shield": tone(t, 1500, 0.35, 0.05, out, "triangle", 2600); tone(t, 2250, 0.3, 0.03, out, "sine", 3300); burst(t, 0.2, 0.03, out, "highpass", 5000); break;
      }
    },
    dispose() {
      window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility);
      const c = ctx; ctx = null; playing = []; if (c) void c.close().catch(() => {});
    },
  };
}
export type Soundscape = ReturnType<typeof createSoundscape>;
