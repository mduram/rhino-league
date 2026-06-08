import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function safeString(value: any) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseBoolean(value: any) {
  if (value === true) return true;
  if (value === false) return false;

  const text = String(value || "").toLowerCase();

  return text === "true" || text === "1" || text === "yes";
}

async function parseKoFiPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const rawText = await request.text();

  try {
    const params = new URLSearchParams(rawText);
    const data = params.get("data");

    if (data) {
      return JSON.parse(data);
    }

    return Object.fromEntries(params.entries());
  } catch {
    try {
      return JSON.parse(rawText);
    } catch {
      return {};
    }
  }
}

export async function POST(request: Request) {
  const payload = await parseKoFiPayload(request);

  const expectedToken = process.env.KOFI_VERIFICATION_TOKEN;

  if (
    expectedToken &&
    String(payload.verification_token || "") !== expectedToken
  ) {
    return NextResponse.json(
      { error: "Invalid Ko-fi verification token." },
      { status: 401 }
    );
  }

  const messageId = safeString(payload.message_id);
  const supporterName =
    safeString(payload.from_name) ||
    safeString(payload.supporter_name) ||
    "Anonymous Rhino";

  const amount = Number(payload.amount || payload.amount_gross || 0);
  const currency = safeString(payload.currency) || "USD";
  const message = safeString(payload.message);
  const type = safeString(payload.type) || "Support";

  const isPublic =
    payload.is_public === undefined || payload.is_public === null
      ? true
      : parseBoolean(payload.is_public);

  if (!messageId) {
    return NextResponse.json(
      { error: "Missing Ko-fi message_id." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("kofi_supporters")
    .upsert(
      {
        kofi_message_id: messageId,
        supporter_name: supporterName,
        amount: Number.isFinite(amount) ? amount : null,
        currency,
        message,
        type,
        is_public: isPublic,
      },
      {
        onConflict: "kofi_message_id",
      }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}