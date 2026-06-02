import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    token: process.env.ADMIN_SESSION_TOKEN,
  });
}