import { NextRequest, NextResponse } from "next/server";
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  joinPoolWithInitialEntry,
} from "@/lib/nba-playoffs/server-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      displayName?: string;
      inviteCode?: string;
      joinMethod?: "link" | "code";
      initialEntryName?: string;
      finalsTiebreaker?: number;
    };

    const joined = await joinPoolWithInitialEntry({
      clientId: body.clientId ?? "",
      displayName: body.displayName ?? "",
      inviteCode: body.inviteCode,
      joinMethod: body.joinMethod === "link" ? "link" : "code",
      initialEntryName: body.initialEntryName,
      finalsTiebreaker:
        typeof body.finalsTiebreaker === "number"
          ? body.finalsTiebreaker
          : undefined,
    });

    return NextResponse.json(joined);
  } catch (error) {
    return NextResponse.json(
      {
        error: getHttpErrorMessage(error),
      },
      {
        status: getHttpErrorStatus(error),
      },
    );
  }
}
