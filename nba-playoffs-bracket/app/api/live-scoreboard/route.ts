import { NextResponse } from "next/server";
import { fetchOfficialLiveScoreboard } from "@/lib/nba-playoffs/live-scoreboard";

export async function GET() {
  try {
    const games = await fetchOfficialLiveScoreboard();

    return NextResponse.json(
      {
        capturedAt: new Date().toISOString(),
        games,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        games: [],
        error: "Official NBA scoreboard request failed.",
      },
      { status: 500 },
    );
  }
}
