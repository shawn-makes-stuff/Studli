const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type AudioContextLike = AudioContext;

let audioContext: AudioContextLike | null = null;
let masterGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let musicGain: GainNode | null = null;

const BASE_MASTER_GAIN = 0.3;
let desiredMasterVolume = 1; // 0..1
let desiredEffectsVolume = 1; // 0..1 (relative to master)
let desiredMusicVolume = 1; // 0..1 (relative to master)

const getDeviceScale = () => {
  if (typeof window === 'undefined') return 1;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return clamp(minDim / 800, 0.55, 1);
};

export const getExistingAudioContext = (): AudioContextLike | null => audioContext;

export const suspendExistingAudioContext = async () => {
  if (!audioContext) return;
  if (audioContext.state !== 'running') return;
  await audioContext.suspend().catch(() => {
    // ignore
  });
};

export const resumeExistingAudioContext = async () => {
  if (!audioContext) return;
  if (audioContext.state !== 'suspended') return;
  await audioContext.resume().catch(() => {
    // ignore
  });
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

    masterGain.gain.value = BASE_MASTER_GAIN * getDeviceScale() * clamp(desiredMasterVolume, 0, 1);
    effectsGain.gain.value = clamp(desiredEffectsVolume, 0, 1);
    musicGain.gain.value = clamp(desiredMusicVolume, 0, 1);

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
  desiredMasterVolume = clamp(volume, 0, 1);
  if (!masterGain) return;
  masterGain.gain.value = BASE_MASTER_GAIN * getDeviceScale() * desiredMasterVolume;
};

export const setEffectsBusGain = (volume: number) => {
  desiredEffectsVolume = clamp(volume, 0, 1);
  if (effectsGain) effectsGain.gain.value = desiredEffectsVolume;
};

export const setMusicBusGain = (volume: number) => {
  desiredMusicVolume = clamp(volume, 0, 1);
  if (musicGain) musicGain.gain.value = desiredMusicVolume;
};

export const getEffectsGain = (): GainNode | null => effectsGain;

export const getMusicGain = (): GainNode | null => musicGain;
