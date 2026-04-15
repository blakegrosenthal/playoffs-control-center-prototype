import { NextRequest, NextResponse } from "next/server";
import {
  createEntryInPool,
  getHttpErrorMessage,
  getHttpErrorStatus,
} from "@/lib/nba-playoffs/server-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ poolId: string }> },
) {
  try {
    const { poolId } = await context.params;
    const body = (await request.json()) as {
      clientId?: string;
      entryName?: string;
      finalsTiebreaker?: number;
    };

    const created = await createEntryInPool({
      clientId: body.clientId ?? "",
      poolId,
      entryName: body.entryName ?? "",
      finalsTiebreaker:
        typeof body.finalsTiebreaker === "number"
          ? body.finalsTiebreaker
          : undefined,
    });

    return NextResponse.json(created, { status: 201 });
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
