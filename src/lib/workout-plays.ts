import { ensureWorkoutPlaysSchema, getSql } from "@/lib/db";
import {
  decodeTabataConfig,
  getTotalWorkoutSeconds,
  getWorkoutTitle,
} from "@/lib/tabata-config-url";

type DevStore = {
  plays: Map<string, number>;
};

function getDevStore(): DevStore {
  const globalStore = globalThis as typeof globalThis & {
    __workoutPlays?: DevStore;
  };

  if (!globalStore.__workoutPlays) {
    globalStore.__workoutPlays = { plays: new Map() };
  }

  return globalStore.__workoutPlays;
}

export type WorkoutPlayEntry = {
  hash: string;
  plays: number;
  title: string;
  totalSeconds: number;
  exercises: number;
  sets: number;
};

export async function recordWorkoutPlay(hash: string): Promise<boolean> {
  if (!decodeTabataConfig(hash)) {
    return false;
  }

  const sql = getSql();

  if (sql && (await ensureWorkoutPlaysSchema())) {
    await sql`
      INSERT INTO workout_plays (hash, plays, updated_at)
      VALUES (${hash}, 1, NOW())
      ON CONFLICT (hash)
      DO UPDATE SET
        plays = workout_plays.plays + 1,
        updated_at = NOW()
    `;
    return true;
  }

  const store = getDevStore();
  store.plays.set(hash, (store.plays.get(hash) ?? 0) + 1);
  return true;
}

export async function getTopWorkouts(limit = 50): Promise<WorkoutPlayEntry[]> {
  const sql = getSql();
  let ranked: { hash: string; plays: number }[] = [];

  if (sql && (await ensureWorkoutPlaysSchema())) {
    ranked = (await sql`
      SELECT hash, plays
      FROM workout_plays
      ORDER BY plays DESC
      LIMIT ${limit}
    `) as { hash: string; plays: number }[];
  } else {
    ranked = [...getDevStore().plays.entries()]
      .map(([hash, plays]) => ({ hash, plays }))
      .sort((left, right) => right.plays - left.plays)
      .slice(0, limit);
  }

  return ranked.flatMap(({ hash, plays }) => {
    const config = decodeTabataConfig(hash);
    if (!config) {
      return [];
    }

    return [
      {
        hash,
        plays,
        title: getWorkoutTitle(config),
        totalSeconds: getTotalWorkoutSeconds(config),
        exercises: config.exercises,
        sets: config.sets,
      },
    ];
  });
}
