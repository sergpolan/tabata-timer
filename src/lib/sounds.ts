const SOUND_FILES = {
  prepareEnd: "/sounds/prepare-end.wav",
  exerciseEnd: "/sounds/exercise-end.wav",
  restEnd: "/sounds/rest-end.wav",
  countdownTick: "/sounds/countdown-tick.wav",
} as const;

export type PhaseSound = keyof typeof SOUND_FILES;

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_PHASES = new Set(["prepare", "work", "rest"]);
const POOL_SIZE = 3;

let audioContext: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const htmlAudioPools = new Map<string, HTMLAudioElement[]>();
let soundsEnabled = true;
let soundsUnlocked = false;

function getHtmlAudioPool(src: string) {
  const existing = htmlAudioPools.get(src);
  if (existing) {
    return existing;
  }

  const pool = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    return audio;
  });
  htmlAudioPools.set(src, pool);
  return pool;
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function loadBuffer(src: string) {
  const cached = bufferCache.get(src);
  if (cached) {
    return cached;
  }

  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await ensureAudioContext().decodeAudioData(arrayBuffer);
  bufferCache.set(src, buffer);
  return buffer;
}

function preloadBuffers() {
  return Promise.all(Object.values(SOUND_FILES).map((src) => loadBuffer(src)));
}

function playHtmlAudio(src: string, volume: number) {
  const pool = getHtmlAudioPool(src);
  const audio =
    pool.find((entry) => entry.paused || entry.ended) ?? pool[0];
  audio.volume = volume;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Ignore autoplay restrictions until audio is unlocked.
  });
}

function playWebAudio(buffer: AudioBuffer, volume: number) {
  const context = ensureAudioContext();
  const source = context.createBufferSource();
  const gain = context.createGain();

  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(0);
}

export function setSoundsEnabled(enabled: boolean) {
  soundsEnabled = enabled;
}

export function areSoundsEnabled() {
  return soundsEnabled;
}

export function unlockSounds() {
  soundsUnlocked = true;

  const context = ensureAudioContext();
  void context.resume();

  // iOS requires playback to begin inside the user gesture that unlocks audio.
  const unlockAudio = getHtmlAudioPool(SOUND_FILES.countdownTick)[0];
  unlockAudio.volume = 0.01;
  unlockAudio.currentTime = 0;
  void unlockAudio
    .play()
    .then(() => {
      unlockAudio.pause();
      unlockAudio.currentTime = 0;
    })
    .catch(() => {
      // Ignore; buffers may still load for Web Audio playback.
    });

  void preloadBuffers();
}

export function playPhaseSound(sound: PhaseSound, volume = 0.85) {
  if (!soundsEnabled || !soundsUnlocked) {
    return;
  }

  const src = SOUND_FILES[sound];
  const cachedBuffer = bufferCache.get(src);

  if (cachedBuffer) {
    const context = ensureAudioContext();
    if (context.state === "suspended") {
      void context.resume();
    }
    playWebAudio(cachedBuffer, volume);
    return;
  }

  void loadBuffer(src)
    .then((buffer) => playWebAudio(buffer, volume))
    .catch(() => playHtmlAudio(src, volume));
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
