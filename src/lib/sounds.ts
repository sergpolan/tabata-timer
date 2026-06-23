const SOUND_FILES = {
  exerciseEnd: "/sounds/exercise-end.wav",
  restEnd: "/sounds/rest-end.wav",
} as const;

export type PhaseSound = keyof typeof SOUND_FILES;

const audioCache = new Map<string, HTMLAudioElement>();
let soundsEnabled = true;
let soundsUnlocked = false;

function getAudio(src: string) {
  const cached = audioCache.get(src);
  if (cached) {
    return cached;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audioCache.set(src, audio);
  return audio;
}

export function setSoundsEnabled(enabled: boolean) {
  soundsEnabled = enabled;
}

export function areSoundsEnabled() {
  return soundsEnabled;
}

export function unlockSounds() {
  soundsUnlocked = true;

  for (const src of Object.values(SOUND_FILES)) {
    getAudio(src);
  }
}

export function playPhaseSound(sound: PhaseSound) {
  if (!soundsEnabled || !soundsUnlocked) {
    return;
  }

  const audio = getAudio(SOUND_FILES[sound]);
  const playback = audio.cloneNode() as HTMLAudioElement;
  playback.volume = 0.85;
  void playback.play().catch(() => {
    // Browsers may block playback until the next user gesture.
  });
}
