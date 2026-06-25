import Link from "next/link";

const links = [
  { href: "/", label: "Timer" },
  { href: "/workouts", label: "Popular workouts" },
] as const;

export default function SiteNav() {
  return (
    <nav className="border-b border-stone-800 px-6 py-4">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-stone-50"
        >
          Tabata Timer
        </Link>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
