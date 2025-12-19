import { getAudioContext, getEffectsGain, setEffectsBusGain } from './audio';

type SfxName = 'click' | 'place';
export type SfxConfig = { enabled: boolean; volume: number };

let noiseShort: AudioBuffer | null = null;
let noiseLong: AudioBuffer | null = null;
const lastPlayedAtMs: Record<SfxName, number> = { click: 0, place: 0 };
let sfxConfig: SfxConfig = { enabled: true, volume: 1 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const setSfxConfig = (next: SfxConfig) => {
  sfxConfig = {
    enabled: Boolean(next.enabled),
    volume: clamp(next.volume ?? 1, 0, 1),
  };

  setEffectsBusGain(sfxConfig.enabled ? sfxConfig.volume : 0);
};

const getNoiseBuffer = (ctx: AudioContext, durationSeconds: number): AudioBuffer => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = rand(-1, 1);
  return buffer;
};

const ensureNoise = (ctx: AudioContext) => {
  if (!noiseShort || noiseShort.sampleRate !== ctx.sampleRate) noiseShort = getNoiseBuffer(ctx, 0.03);
  if (!noiseLong || noiseLong.sampleRate !== ctx.sampleRate) noiseLong = getNoiseBuffer(ctx, 0.07);
};

const connectToEffects = (node: AudioNode) => {
  const effectsGain = getEffectsGain();
  if (!effectsGain) return;
  node.connect(effectsGain);
};

const scheduleDisconnect = (node: AudioNode, ctx: AudioContext, stopAt: number) => {
  const ms = Math.max(0, Math.ceil((stopAt - ctx.currentTime) * 1000));
  window.setTimeout(() => {
    try {
      node.disconnect();
    } catch {
      // ignore
    }
  }, ms + 50);
};

const playClick = (ctx: AudioContext) => {
  ensureNoise(ctx);
  const t0 = ctx.currentTime + 0.001;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800 + rand(-120, 120), t0);
  osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.04);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.14, t0 + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);

  osc.connect(gain);
  connectToEffects(gain);
  osc.start(t0);
  osc.stop(t0 + 0.065);
  scheduleDisconnect(gain, ctx, t0 + 0.07);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseShort;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1600, t0);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.linearRampToValueAtTime(0.075, t0 + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

  noise.connect(hp);
  hp.connect(ng);
  connectToEffects(ng);
  noise.start(t0);
  noise.stop(t0 + 0.04);
  scheduleDisconnect(ng, ctx, t0 + 0.06);
};

const playPlace = (ctx: AudioContext) => {
  ensureNoise(ctx);
  const t0 = ctx.currentTime + 0.001;

  const low = ctx.createOscillator();
  low.type = 'sine';
  low.frequency.setValueAtTime(130 + rand(-6, 6), t0);
  low.frequency.exponentialRampToValueAtTime(85, t0 + 0.12);

  const lowGain = ctx.createGain();
  lowGain.gain.setValueAtTime(0.0001, t0);
  lowGain.gain.linearRampToValueAtTime(0.26, t0 + 0.006);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

  low.connect(lowGain);
  connectToEffects(lowGain);
  low.start(t0);
  low.stop(t0 + 0.25);
  scheduleDisconnect(lowGain, ctx, t0 + 0.26);

  const mid = ctx.createOscillator();
  mid.type = 'triangle';
  mid.frequency.setValueAtTime(520 + rand(-25, 25), t0);
  mid.frequency.exponentialRampToValueAtTime(340, t0 + 0.07);

  const midGain = ctx.createGain();
  midGain.gain.setValueAtTime(0.0001, t0);
  midGain.gain.linearRampToValueAtTime(0.17, t0 + 0.004);
  midGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);

  mid.connect(midGain);
  connectToEffects(midGain);
  mid.start(t0);
  mid.stop(t0 + 0.13);
  scheduleDisconnect(midGain, ctx, t0 + 0.14);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseLong;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2600, t0);
  bp.Q.setValueAtTime(1.4, t0);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.linearRampToValueAtTime(0.15, t0 + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

  noise.connect(bp);
  bp.connect(ng);
  connectToEffects(ng);
  noise.start(t0);
  noise.stop(t0 + 0.11);
  scheduleDisconnect(ng, ctx, t0 + 0.14);
};

export const playSfx = (name: SfxName) => {
  if (!sfxConfig.enabled) return;

  const nowMs = typeof performance === 'undefined' ? Date.now() : performance.now();
  const minIntervalMs = name === 'click' ? 35 : 60;
  if (nowMs - lastPlayedAtMs[name] < minIntervalMs) return;
  lastPlayedAtMs[name] = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (name === 'click') playClick(ctx);
  else playPlace(ctx);
};
