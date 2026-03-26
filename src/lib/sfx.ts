"use client";

/**
 * Arena SFX — procedural sounds via Web Audio API.
 * No external files needed; all sounds are synthesized.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function gain(ac: AudioContext, value: number): GainNode {
  const g = ac.createGain();
  g.gain.value = value;
  g.connect(ac.destination);
  return g;
}

// ── Individual sounds ──────────────────────────────────────────────────

/** SMASH — deep thud + sharp high crack */
export function playSmash() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Low boom
  const boom = ac.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(120, now);
  boom.frequency.exponentialRampToValueAtTime(30, now + 0.18);
  const boomGain = gain(ac, 0.7);
  boom.connect(boomGain);
  boomGain.gain.setValueAtTime(0.7, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  boom.start(now);
  boom.stop(now + 0.22);

  // High snap (noise burst)
  const bufSize = ac.sampleRate * 0.06;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const snap = ac.createBufferSource();
  snap.buffer = buf;
  const snapFilter = ac.createBiquadFilter();
  snapFilter.type = "highpass";
  snapFilter.frequency.value = 3000;
  const snapGain = gain(ac, 0.5);
  snap.connect(snapFilter);
  snapFilter.connect(snapGain);
  snap.start(now + 0.02);
}

/** ACE — ascending 3-note arpeggio with shimmer */
export function playAce() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = [440, 660, 880];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now + i * 0.1);
    g.gain.linearRampToValueAtTime(0.35, now + i * 0.1 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.35);
  });

  // Shimmer on top
  const shim = ac.createOscillator();
  shim.type = "sine";
  shim.frequency.value = 1760;
  const shimGain = ac.createGain();
  shimGain.gain.setValueAtTime(0, now + 0.2);
  shimGain.gain.linearRampToValueAtTime(0.15, now + 0.28);
  shimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  shim.connect(shimGain);
  shimGain.connect(ac.destination);
  shim.start(now + 0.2);
  shim.stop(now + 0.7);
}

/** POINT — short triumphant two-tone */
export function playPoint() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  [[330, 0], [495, 0.12]].forEach(([freq, delay]) => {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.3);
  });
}

/** RALLY — quick light chirp */
export function playRally() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1100, now + 0.06);
  osc.frequency.linearRampToValueAtTime(700, now + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.25, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

/** NET — short low thud */
export function playNet() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// ── UI Interaction Sounds ───────────────────────────────────────────────

function uiBeep(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.001, now + delay);
  g.gain.linearRampToValueAtTime(vol, now + delay + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(now + delay);
  osc.stop(now + delay + dur + 0.01);
}

/** Subtle button click */
export function playClick() { uiBeep(660, 0.04, 0.04, 'square'); }

/** Select an agent card */
export function playSelect() { uiBeep(440, 0.04, 0.05, 'square'); uiBeep(660, 0.06, 0.04, 'sine', 0.03); }

/** Toggle chip on */
export function playToggleOn() { uiBeep(880, 0.06, 0.05, 'sine'); }

/** Toggle chip off */
export function playToggleOff() { uiBeep(440, 0.04, 0.04, 'square'); }

/** Confirm / submit */
export function playConfirm() {
  uiBeep(660, 0.06, 0.06, 'sine');
  uiBeep(880, 0.08, 0.05, 'sine', 0.07);
  uiBeep(1320, 0.12, 0.04, 'sine', 0.14);
}

/** Agent created / success */
export function playSuccess() {
  uiBeep(880, 0.07, 0.06, 'sine');
  uiBeep(1100, 0.08, 0.05, 'sine', 0.09);
  uiBeep(1320, 0.14, 0.04, 'sine', 0.17);
}

/** Error */
export function playError() { uiBeep(220, 0.12, 0.07, 'sawtooth'); }

/** Image generation triggered */
export function playGenerate() {
  [440, 660, 880].forEach((f, i) => uiBeep(f, 0.08, 0.03, 'sine', i * 0.09));
}

// Dispatch map — keyed by flash label
export const SFX_MAP: Record<string, () => void> = {
  "SMASH!": playSmash,
  "ACE!":   playAce,
  "POINT!": playPoint,
  "RALLY!": playRally,
  "NET!":   playNet,
};
