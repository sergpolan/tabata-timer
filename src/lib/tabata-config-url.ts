export type TabataConfig = {
  name: string;
  prepareSeconds: number;
  workSeconds: number;
  restSeconds: number;
  exercises: number;
  sets: number;
  exerciseNames: string[];
};

export const DEFAULT_TABATA_CONFIG: TabataConfig = {
  name: "",
  prepareSeconds: 10,
  workSeconds: 20,
  restSeconds: 10,
  exercises: 8,
  sets: 1,
  exerciseNames: [],
};

const LIMITS = {
  name: { max: 60 },
  exerciseName: { max: 40 },
  prepareSeconds: { min: 0, max: 60 },
  workSeconds: { min: 5, max: 300 },
  restSeconds: { min: 0, max: 120 },
  exercises: { min: 1, max: 50 },
  sets: { min: 1, max: 50 },
} as const;

type EncodedTabataConfig = {
  w: number;
  r: number;
  s: number;
  p: number;
  n?: string;
  e?: string[];
  u?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeName(name: string) {
  return name.trim().slice(0, LIMITS.name.max);
}

function normalizeExerciseName(name: string) {
  return name.trim().slice(0, LIMITS.exerciseName.max);
}

function sanitizeExerciseName(name: string) {
  return name.slice(0, LIMITS.exerciseName.max);
}

export function resizeExerciseNames(names: string[], exercises: number) {
  const normalized = names.map(sanitizeExerciseName);

  if (normalized.length === exercises) {
    return normalized;
  }

  if (normalized.length > exercises) {
    return normalized.slice(0, exercises);
  }

  return [
    ...normalized,
    ...Array.from({ length: exercises - normalized.length }, () => ""),
  ];
}

function normalizeConfig(config: TabataConfig): TabataConfig {
  const exercises = clamp(
    config.exercises,
    LIMITS.exercises.min,
    LIMITS.exercises.max,
  );
  const sets = clamp(config.sets, LIMITS.sets.min, LIMITS.sets.max);

  return {
    name: normalizeName(config.name),
    prepareSeconds: clamp(
      config.prepareSeconds,
      LIMITS.prepareSeconds.min,
      LIMITS.prepareSeconds.max,
    ),
    workSeconds: clamp(
      config.workSeconds,
      LIMITS.workSeconds.min,
      LIMITS.workSeconds.max,
    ),
    restSeconds: clamp(
      config.restSeconds,
      LIMITS.restSeconds.min,
      LIMITS.restSeconds.max,
    ),
    exercises,
    sets,
    exerciseNames: resizeExerciseNames(config.exerciseNames, exercises),
  };
}

function decodeLegacyConfig(decoded: string): TabataConfig | null {
  const [workSeconds, restSeconds, exercises, prepareSeconds] = decoded
    .split(",")
    .map((value) => Number(value));

  if ([workSeconds, restSeconds, exercises, prepareSeconds].some(Number.isNaN)) {
    return null;
  }

  return normalizeConfig({
    name: "",
    workSeconds,
    restSeconds,
    exercises,
    sets: 1,
    prepareSeconds,
    exerciseNames: [],
  });
}

export function getTotalWorkoutSeconds(config: TabataConfig) {
  const roundDuration =
    config.exercises * config.workSeconds +
    (config.exercises - 1) * config.restSeconds;

  return (
    config.sets * roundDuration + (config.sets - 1) * config.restSeconds
  );
}

export function encodeTabataConfig(config: TabataConfig) {
  const normalized = normalizeConfig(config);
  const payload: EncodedTabataConfig = {
    w: normalized.workSeconds,
    r: normalized.restSeconds,
    s: normalized.exercises,
    p: normalized.prepareSeconds,
  };

  if (normalized.name) {
    payload.n = normalized.name;
  }

  if (normalized.sets > 1) {
    payload.u = normalized.sets;
  }

  if (normalized.exerciseNames.some((name) => name.length > 0)) {
    payload.e = normalized.exerciseNames;
  }

  return toBase64Url(JSON.stringify(payload));
}

export function decodeTabataConfig(hash: string): TabataConfig | null {
  try {
    const decoded = fromBase64Url(hash.trim());

    if (decoded.startsWith("{")) {
      const data = JSON.parse(decoded) as EncodedTabataConfig;
      if ([data.w, data.r, data.s, data.p].some((value) => typeof value !== "number")) {
        return null;
      }

      return normalizeConfig({
        name: typeof data.n === "string" ? data.n : "",
        workSeconds: data.w,
        restSeconds: data.r,
        exercises: data.s,
        sets: typeof data.u === "number" ? data.u : 1,
        prepareSeconds: data.p,
        exerciseNames: Array.isArray(data.e) ? data.e.map(String) : [],
      });
    }

    return decodeLegacyConfig(decoded);
  } catch {
    return null;
  }
}

export function getTabataConfigPath(config: TabataConfig) {
  return `/t/${encodeTabataConfig(config)}`;
}

export function isDefaultTabataConfig(config: TabataConfig) {
  return (
    !config.name.trim() &&
    config.exerciseNames.every((name) => !name.trim()) &&
    config.prepareSeconds === DEFAULT_TABATA_CONFIG.prepareSeconds &&
    config.workSeconds === DEFAULT_TABATA_CONFIG.workSeconds &&
    config.restSeconds === DEFAULT_TABATA_CONFIG.restSeconds &&
    config.exercises === DEFAULT_TABATA_CONFIG.exercises &&
    config.sets === DEFAULT_TABATA_CONFIG.sets
  );
}

export function getWorkoutTitle(config: TabataConfig) {
  return config.name.trim() || "Tabata Timer";
}

export function getExerciseName(config: TabataConfig, exerciseNumber: number) {
  return config.exerciseNames[exerciseNumber - 1]?.trim() ?? "";
}
