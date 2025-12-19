import { getAudioContext, getExistingAudioContext, getMusicGain, setMusicBusGain } from './audio';

export type MusicConfig = {
  enabled: boolean;
  volume: number; // 0..1 (relative to master output gain)
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

let musicConfig: MusicConfig = { enabled: false, volume: 0.4 };
let isRunning = false;
let schedulerTimer: number | null = null;
let nextLoopStartTime = 0;

let internalGain: GainNode | null = null;
let lowpass: BiquadFilterNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let noiseHat: AudioBuffer | null = null;

const BPM = 104;
const BEAT = 60 / BPM;
const STEP = BEAT / 4; // 16th note
const LOOP_STEPS = 64; // 4 bars @ 16 steps/bar
const LOOP_SECONDS = LOOP_STEPS * STEP;

const createNoise = (ctx: AudioContext, seconds: number) => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
  return buffer;
};

const ensureGraph = (ctx: AudioContext) => {
  if (internalGain && internalGain.context === ctx && lowpass && compressor) return;

  internalGain = ctx.createGain();
  internalGain.gain.value = 0.0001;

  lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 5200;
  lowpass.Q.value = 0.6;

  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.18;

  internalGain.connect(lowpass);
  lowpass.connect(compressor);

  const musicGain = getMusicGain();
  if (musicGain) compressor.connect(musicGain);

  if (!noiseHat || noiseHat.sampleRate !== ctx.sampleRate) noiseHat = createNoise(ctx, 0.05);
};

const scheduleDisconnect = (node: AudioNode, ctx: AudioContext, stopAt: number) => {
  const ms = Math.max(0, Math.ceil((stopAt - ctx.currentTime) * 1000));
  window.setTimeout(() => {
    try {
      node.disconnect();
    } catch {
      // ignore
    }
  }, ms + 80);
};

const noteToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const scheduleTone = (
  ctx: AudioContext,
  startAt: number,
  duration: number,
  midi: number,
  type: OscillatorType,
  velocity: number,
  pan: number,
) => {
  if (!internalGain) return;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(noteToFreq(midi), startAt);
  osc.detune.setValueAtTime((Math.random() * 2 - 1) * 4, startAt);

  const gain = ctx.createGain();
  const attack = 0.004;
  const release = Math.min(0.06, duration * 0.6);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(velocity, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(attack + 0.01, duration - release));
  gain.gain.setValueAtTime(0.0001, startAt + duration);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(clamp(pan, -0.35, 0.35), startAt);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(internalGain);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
  scheduleDisconnect(panner, ctx, startAt + duration + 0.05);
};

const scheduleHat = (ctx: AudioContext, startAt: number, velocity: number) => {
  if (!internalGain || !noiseHat) return;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseHat;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(5200, startAt);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(velocity, startAt + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.04);

  noise.connect(hp);
  hp.connect(gain);
  gain.connect(internalGain);

  noise.start(startAt);
  noise.stop(startAt + 0.06);
  scheduleDisconnect(gain, ctx, startAt + 0.08);
};

// Subtle chiptune pattern in A minor-ish; designed to loop at 4 bars.
const scheduleLoop = (ctx: AudioContext, t0: number) => {
  // Bass (triangle): roots and fifths, sparse.
  const bass = [
    { step: 0, midi: 45 }, // A2
    { step: 8, midi: 52 }, // E3
    { step: 16, midi: 48 }, // C3
    { step: 24, midi: 55 }, // G3
    { step: 32, midi: 43 }, // G2
    { step: 40, midi: 50 }, // D3
    { step: 48, midi: 45 }, // A2
    { step: 56, midi: 52 }, // E3
  ];
  for (const n of bass) scheduleTone(ctx, t0 + n.step * STEP, BEAT * 0.9, n.midi, 'triangle', 0.072, -0.08);

  // Lead (square): gentle arps with rests (kept low volume).
  const leadSteps: Array<{ step: number; midi: number; durSteps?: number }> = [
    { step: 2, midi: 69 }, // A4
    { step: 6, midi: 72 }, // C5
    { step: 10, midi: 76 }, // E5
    { step: 14, midi: 72 },
    { step: 18, midi: 67 }, // G4
    { step: 22, midi: 71 }, // B4
    { step: 26, midi: 74 }, // D5
    { step: 30, midi: 71 },
    { step: 34, midi: 65 }, // F4
    { step: 38, midi: 69 },
    { step: 42, midi: 72 },
    { step: 46, midi: 69 },
    { step: 50, midi: 64 }, // E4
    { step: 54, midi: 67 },
    { step: 58, midi: 71 },
    { step: 62, midi: 67 },
  ];
  for (const n of leadSteps) scheduleTone(ctx, t0 + n.step * STEP, STEP * 2.8, n.midi, 'square', 0.055, 0.12);

  // Soft hats: 8th notes with occasional gaps.
  for (let step = 0; step < LOOP_STEPS; step += 2) {
    const isDownbeat = step % 8 === 0;
    const velocity = isDownbeat ? 0.025 : 0.018;
    scheduleHat(ctx, t0 + step * STEP, velocity);
  }
};

const updateMusicGain = () => {
  setMusicBusGain(musicConfig.enabled ? clamp(musicConfig.volume, 0, 1) : 0);
};

const stopScheduler = () => {
  if (schedulerTimer !== null) {
    window.clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
};

export const setMusicConfig = (next: MusicConfig) => {
  musicConfig = { enabled: Boolean(next.enabled), volume: clamp(next.volume ?? 0.4, 0, 1) };
  updateMusicGain();

  if (!musicConfig.enabled || musicConfig.volume <= 0) {
    fadeOut();
    return;
  }

  const ctx = getExistingAudioContext();
  if (ctx && ctx.state === 'running') ensureRunning();
};

const fadeIn = (ctx: AudioContext) => {
  if (!internalGain) return;
  const t0 = ctx.currentTime + 0.01;
  internalGain.gain.cancelScheduledValues(t0);
  internalGain.gain.setValueAtTime(internalGain.gain.value, t0);
  internalGain.gain.linearRampToValueAtTime(1, t0 + 0.45);
};

const fadeOut = () => {
  const ctx = getExistingAudioContext();
  if (!ctx || !internalGain) {
    stopScheduler();
    isRunning = false;
    return;
  }

  const t0 = ctx.currentTime + 0.01;
  internalGain.gain.cancelScheduledValues(t0);
  internalGain.gain.setValueAtTime(internalGain.gain.value, t0);
  internalGain.gain.linearRampToValueAtTime(0.0001, t0 + 0.25);

  window.setTimeout(() => {
    stopScheduler();
    isRunning = false;
  }, 350);
};

export const ensureRunning = () => {
  if (isRunning) return;
  if (!musicConfig.enabled || musicConfig.volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;
  ensureGraph(ctx);
  updateMusicGain();

  nextLoopStartTime = Math.max(ctx.currentTime + 0.08, nextLoopStartTime || 0);
  isRunning = true;
  fadeIn(ctx);

  const scheduleAheadSeconds = 1.25;
  schedulerTimer = window.setInterval(() => {
    if (!musicConfig.enabled || musicConfig.volume <= 0) return;
    const now = ctx.currentTime;
    while (nextLoopStartTime < now + scheduleAheadSeconds) {
      scheduleLoop(ctx, nextLoopStartTime);
      nextLoopStartTime += LOOP_SECONDS;
    }
  }, 120);
};

export const pauseMusic = () => {
  fadeOut();
};

export const resumeMusicIfPossible = () => {
  const ctx = getExistingAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  ensureRunning();
};

// Call once to attach a "first gesture" retry, so music starts cleanly on mobile browsers.
export const installMusicAutostart = () => {
  if (typeof window === 'undefined') return;
  const onFirstGesture = () => {
    ensureRunning();
    if (isRunning) {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('touchstart', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    }
  };
  window.addEventListener('pointerdown', onFirstGesture, { passive: true });
  window.addEventListener('touchstart', onFirstGesture, { passive: true });
  window.addEventListener('keydown', onFirstGesture);
};
