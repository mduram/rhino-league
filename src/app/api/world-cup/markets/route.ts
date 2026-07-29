import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    success: true,
    retired: true,
    message: "World Cup betting has been retired for the playoff phase.",
    matches: [],
    marketsByMatchId: {},
  });
}
