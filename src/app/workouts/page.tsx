import { getTopWorkouts } from "@/lib/workout-plays";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Popular Workouts",
  description: "The most played Tabata workouts",
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPlays(count: number) {
  return count === 1 ? "play" : "plays";
}

export default async function WorkoutsPage() {
  const workouts = await getTopWorkouts(50);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-50">
            Popular workouts
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            The most played workouts across the community
          </p>
        </header>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-6 py-10 text-center">
            <p className="text-sm text-stone-400">
              No workouts played yet. Customize a workout, share it, and start
              it to appear here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              Create a workout
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {workouts.map((workout, index) => (
              <li key={workout.hash}>
                <Link
                  href={`/t/${workout.hash}`}
                  className="group flex items-center gap-4 rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-4 transition-colors hover:border-stone-600 hover:bg-stone-900"
                >
                  <span className="w-8 shrink-0 text-center font-mono text-sm tabular-nums text-stone-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-50 group-hover:text-white">
                      {workout.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {workout.exercises} exercises · {workout.sets}{" "}
                      {workout.sets === 1 ? "set" : "sets"} ·{" "}
                      {formatDuration(workout.totalSeconds)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-amber-400">
                      {workout.plays.toLocaleString()}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatPlays(workout.plays)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
