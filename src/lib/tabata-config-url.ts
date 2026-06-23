export type TabataConfig = {
  prepareSeconds: number;
  workSeconds: number;
  restSeconds: number;
  sets: number;
};

export const DEFAULT_TABATA_CONFIG: TabataConfig = {
  prepareSeconds: 10,
  workSeconds: 20,
  restSeconds: 10,
  sets: 8,
};

const LIMITS = {
  prepareSeconds: { min: 0, max: 60 },
  workSeconds: { min: 5, max: 300 },
  restSeconds: { min: 0, max: 120 },
  sets: { min: 1, max: 50 },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toBase64Url(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

function normalizeConfig(config: TabataConfig): TabataConfig {
  return {
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

export function encodeTabataConfig(config: TabataConfig) {
  const normalized = normalizeConfig(config);
  const payload = [
    normalized.workSeconds,
    normalized.restSeconds,
    normalized.sets,
    normalized.prepareSeconds,
  ].join(",");
  return toBase64Url(payload);
}

export function decodeTabataConfig(hash: string): TabataConfig | null {
  try {
    const decoded = fromBase64Url(hash.trim());
    const [workSeconds, restSeconds, sets, prepareSeconds] = decoded
      .split(",")
      .map((value) => Number(value));

    if ([workSeconds, restSeconds, sets, prepareSeconds].some(Number.isNaN)) {
      return null;
    }

    return normalizeConfig({
      workSeconds,
      restSeconds,
      sets,
      prepareSeconds,
    });
  } catch {
    return null;
  }
}

export function getTabataConfigPath(config: TabataConfig) {
  return `/t/${encodeTabataConfig(config)}`;
}

export function isDefaultTabataConfig(config: TabataConfig) {
  return (
    config.prepareSeconds === DEFAULT_TABATA_CONFIG.prepareSeconds &&
    config.workSeconds === DEFAULT_TABATA_CONFIG.workSeconds &&
    config.restSeconds === DEFAULT_TABATA_CONFIG.restSeconds &&
    config.sets === DEFAULT_TABATA_CONFIG.sets
  );
}
