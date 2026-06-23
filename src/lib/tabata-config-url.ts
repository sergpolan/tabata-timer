export type TabataConfig = {
  name: string;
  prepareSeconds: number;
  workSeconds: number;
  restSeconds: number;
  sets: number;
};

export const DEFAULT_TABATA_CONFIG: TabataConfig = {
  name: "",
  prepareSeconds: 10,
  workSeconds: 20,
  restSeconds: 10,
  sets: 8,
};

const LIMITS = {
  name: { max: 60 },
  prepareSeconds: { min: 0, max: 60 },
  workSeconds: { min: 5, max: 300 },
  restSeconds: { min: 0, max: 120 },
  sets: { min: 1, max: 50 },
} as const;

type EncodedTabataConfig = {
  w: number;
  r: number;
  s: number;
  p: number;
  n?: string;
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

function normalizeConfig(config: TabataConfig): TabataConfig {
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
    sets: clamp(config.sets, LIMITS.sets.min, LIMITS.sets.max),
  };
}

function decodeLegacyConfig(decoded: string): TabataConfig | null {
  const [workSeconds, restSeconds, sets, prepareSeconds] = decoded
    .split(",")
    .map((value) => Number(value));

  if ([workSeconds, restSeconds, sets, prepareSeconds].some(Number.isNaN)) {
    return null;
  }

  return normalizeConfig({
    name: "",
    workSeconds,
    restSeconds,
    sets,
    prepareSeconds,
  });
}

export function encodeTabataConfig(config: TabataConfig) {
  const normalized = normalizeConfig(config);
  const payload: EncodedTabataConfig = {
    w: normalized.workSeconds,
    r: normalized.restSeconds,
    s: normalized.sets,
    p: normalized.prepareSeconds,
  };

  if (normalized.name) {
    payload.n = normalized.name;
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
        sets: data.s,
        prepareSeconds: data.p,
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
    config.prepareSeconds === DEFAULT_TABATA_CONFIG.prepareSeconds &&
    config.workSeconds === DEFAULT_TABATA_CONFIG.workSeconds &&
    config.restSeconds === DEFAULT_TABATA_CONFIG.restSeconds &&
    config.sets === DEFAULT_TABATA_CONFIG.sets
  );
}

export function getWorkoutTitle(config: TabataConfig) {
  return config.name.trim() || "Tabata Timer";
}
