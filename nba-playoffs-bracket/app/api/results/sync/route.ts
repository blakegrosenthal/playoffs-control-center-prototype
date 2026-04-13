import { NextResponse } from "next/server";
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  syncOfficialResults,
} from "@/lib/nba-playoffs/server-store";

export async function POST() {
  try {
    const results = await syncOfficialResults();
    return NextResponse.json(results);
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
