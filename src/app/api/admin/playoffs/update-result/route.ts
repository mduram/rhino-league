import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import {
  PlayoffResultError,
  recordPlayoffResult,
} from "@/lib/recordPlayoffResult";

export async function POST(request: Request) {
  const { adminToken, gameId, homeScore, awayScore } = await request.json();

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  try {
    const result = await recordPlayoffResult({
      gameId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not record the playoff result.",
      },
      { status: error instanceof PlayoffResultError ? error.status : 500 }
    );
  }
}
