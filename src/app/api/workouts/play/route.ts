import { recordWorkoutPlay } from "@/lib/workout-plays";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let hash: string | undefined;

  try {
    const body = (await request.json()) as { hash?: string };
    hash = body.hash;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!hash || typeof hash !== "string") {
    return NextResponse.json({ error: "Missing workout hash" }, { status: 400 });
  }

  const recorded = await recordWorkoutPlay(hash);

  if (!recorded) {
    return NextResponse.json({ error: "Invalid workout hash" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
