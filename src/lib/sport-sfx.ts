/**
 * Sport SFX — Web Audio API synthesized sounds
 * No audio files needed. Works in any modern browser.
 * All sounds are generated programmatically using oscillators + noise.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return null; }
  }
  return ctx;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Synthesize a smash: sharp high-frequency THWACK + low thud
export function playSFX(action: string, volume = 0.5) {
  if (typeof window !== 'undefined' && (window as any).__arenaMuted) return;
  const ac = getCtx();
  if (!ac) return;

  const vol = clamp(volume, 0, 1);
  const now = ac.currentTime;

  switch (action) {
    case 'SMASH':
      playSmash(ac, now, vol);
      break;
    case 'DRIVE':
      playDrive(ac, now, vol * 0.7);
      break;
    case 'DROP':
      playDrop(ac, now, vol * 0.5);
      break;
    case 'CLEAR':
      playClear(ac, now, vol * 0.5);
      break;
    case 'LOB':
      playLob(ac, now, vol * 0.4);
      break;
    case 'BLOCK':
      playBlock(ac, now, vol * 0.4);
      break;
    case 'SPECIAL':
      playSpecial(ac, now, vol);
      break;
    case 'SERVE':
      playServe(ac, now, vol * 0.5);
      break;
    case 'POINT':
      playPoint(ac, now, vol);
      break;
    default:
      break;
  }
}

// ── SMASH: sharp crack + impact thud ─────────────────────────────────────────
function playSmash(ac: AudioContext, t: number, vol: number) {
  // High crack
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
  gain.gain.setValueAtTime(vol * 0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.start(t);
  osc.stop(t + 0.15);

  // Impact thud
  const noise = ac.createBufferSource();
  const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  noise.buffer = buf;
  const nGain = ac.createGain();
  noise.connect(nGain);
  nGain.connect(ac.destination);
  nGain.gain.setValueAtTime(vol * 1.2, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noise.start(t);
}

// ── DRIVE: fast whoosh ────────────────────────────────────────────────────────
function playDrive(ac: AudioContext, t: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  gain.gain.setValueAtTime(vol * 0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}

// ── DROP: soft tap ─────────────────────────────────────────────────────────────
function playDrop(ac: AudioContext, t: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.06);
  gain.gain.setValueAtTime(vol * 0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.08);
}

// ── CLEAR: long swish ──────────────────────────────────────────────────────────
function playClear(ac: AudioContext, t: number, vol: number) {
  const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin(Math.PI * i / data.length);
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  src.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(vol * 0.5, t);
  src.start(t);
}

// ── LOB: gentle loft ──────────────────────────────────────────────────────────
function playLob(ac: AudioContext, t: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(450, t + 0.08);
  osc.frequency.linearRampToValueAtTime(200, t + 0.16);
  gain.gain.setValueAtTime(vol * 0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.18);
}

// ── BLOCK: sharp deflect ───────────────────────────────────────────────────────
function playBlock(ac: AudioContext, t: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
  gain.gain.setValueAtTime(vol * 0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.start(t);
  osc.stop(t + 0.06);
}

// ── SPECIAL: dramatic chord + shimmer ────────────────────────────────────────
function playSpecial(ac: AudioContext, t: number, vol: number) {
  // Power chord: 3 oscillators
  [220, 330, 440].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.3);
    gain.gain.setValueAtTime(vol * 0.3, t + i * 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t + i * 0.02);
    osc.stop(t + 0.5);
  });
}

// ── SERVE: quick pop ──────────────────────────────────────────────────────────
function playServe(ac: AudioContext, t: number, vol: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.07);
  gain.gain.setValueAtTime(vol * 0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.start(t);
  osc.stop(t + 0.09);
}

// ── POINT WIN: ascending ding ─────────────────────────────────────────────────
export function playPoint(ac: AudioContext, t: number, vol: number) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    gain.gain.setValueAtTime(vol * 0.5, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.25);
  });
}
