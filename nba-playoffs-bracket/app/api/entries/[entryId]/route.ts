import { NextRequest, NextResponse } from "next/server";
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  updateEntry,
} from "@/lib/nba-playoffs/server-store";
import { MatchupPick } from "@/lib/nba-playoffs/types";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId } = await context.params;
    const body = (await request.json()) as {
      clientId?: string;
      name?: string;
      tiebreakerGuess?: number | null;
      picks?: Record<string, MatchupPick>;
      submit?: boolean;
    };

    const updated = await updateEntry({
      clientId: body.clientId ?? "",
      entryId,
      name: body.name,
      tiebreakerGuess:
        typeof body.tiebreakerGuess === "number" || body.tiebreakerGuess === null
          ? body.tiebreakerGuess
          : undefined,
      picks: body.picks,
      submit: body.submit,
    });

    return NextResponse.json(updated);
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
