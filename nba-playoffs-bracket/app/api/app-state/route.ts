import { NextRequest, NextResponse } from "next/server";
import {
  getAppBootstrap,
  getHttpErrorMessage,
  getHttpErrorStatus,
} from "@/lib/nba-playoffs/server-store";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
    const inviteCode =
      request.nextUrl.searchParams.get("inviteCode") ?? undefined;

    const state = await getAppBootstrap({
      clientId: clientId ?? "",
      inviteCode,
    });

    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
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
