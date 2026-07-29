import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "World Cup betting has been retired. Rhino Coin markets are now focused on the Rhino League playoffs.",
    },
    { status: 410 }
  );
}
