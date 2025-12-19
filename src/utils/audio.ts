const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type AudioContextLike = AudioContext;

let audioContext: AudioContextLike | null = null;
let masterGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let musicGain: GainNode | null = null;

const BASE_MASTER_GAIN = 0.3;

const getDeviceScale = () => {
  if (typeof window === 'undefined') return 1;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return clamp(minDim / 800, 0.55, 1);
};

export const getAudioContext = (): AudioContextLike | null => {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!audioContext) {
    audioContext = new Ctx();
    masterGain = audioContext.createGain();
    effectsGain = audioContext.createGain();
    musicGain = audioContext.createGain();

    masterGain.gain.value = BASE_MASTER_GAIN * getDeviceScale();
    effectsGain.gain.value = 1;
    musicGain.gain.value = 1;

    effectsGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {
      // ignore
    });
  }

  return audioContext;
};

export const setMasterOutputGain = (volume: number) => {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;
  masterGain.gain.value = BASE_MASTER_GAIN * getDeviceScale() * clamp(volume, 0, 1);
};

export const getEffectsGain = (): GainNode | null => {
  const ctx = getAudioContext();
  if (!ctx) return null;
  return effectsGain;
};

export const getMusicGain = (): GainNode | null => {
  const ctx = getAudioContext();
  if (!ctx) return null;
  return musicGain;
};
