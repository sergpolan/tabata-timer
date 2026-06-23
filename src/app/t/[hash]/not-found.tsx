import Link from "next/link";

export default function InvalidTabataConfigPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-stone-50">
          Workout link not found
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          This Tabata configuration link is invalid or expired.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-6 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300"
        >
          Start with defaults
        </Link>
      </div>
    </main>
  );
}
