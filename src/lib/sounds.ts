const SOUND_FILES = {
  prepareEnd: "/sounds/prepare-end.wav",
  exerciseEnd: "/sounds/exercise-end.wav",
  restEnd: "/sounds/rest-end.wav",
  countdownTick: "/sounds/countdown-tick.wav",
} as const;

export type PhaseSound = keyof typeof SOUND_FILES;

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_PHASES = new Set(["prepare", "work", "rest"]);

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

export function playPhaseSound(sound: PhaseSound, volume = 0.85) {
  if (!soundsEnabled || !soundsUnlocked) {
    return;
  }

  const audio = getAudio(SOUND_FILES[sound]);
  const playback = audio.cloneNode() as HTMLAudioElement;
  playback.volume = volume;
  void playback.play().catch(() => {
    // Browsers may block playback until the next user gesture.
  });
}

export function playCountdownTick(phase: string, secondsLeft: number) {
  if (
    !COUNTDOWN_PHASES.has(phase) ||
    secondsLeft < 1 ||
    secondsLeft > COUNTDOWN_SECONDS
  ) {
    return;
  }

  playPhaseSound("countdownTick", 0.7);
}
