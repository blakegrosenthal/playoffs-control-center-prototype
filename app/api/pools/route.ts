import { NextRequest, NextResponse } from "next/server";
import {
  createPoolWithInitialEntry,
  getHttpErrorMessage,
  getHttpErrorStatus,
} from "@/lib/nba-playoffs/server-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      displayName?: string;
      poolName?: string;
      description?: string;
      lockAt?: string;
      inviteCode?: string;
      initialEntryName?: string;
      finalsTiebreaker?: number;
    };

    const created = await createPoolWithInitialEntry({
      clientId: body.clientId ?? "",
      displayName: body.displayName ?? "",
      poolName: body.poolName ?? "",
      description: body.description,
      lockAt: body.lockAt ?? "",
      inviteCode: body.inviteCode,
      initialEntryName: body.initialEntryName ?? "",
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
