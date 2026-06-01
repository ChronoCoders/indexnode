import { NextRequest, NextResponse } from "next/server";

interface SubscribeBody {
  email?: string;
}

interface ResendErrorBody {
  message?: string;
  name?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as SubscribeBody;
  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email address required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    // without operator credentials. Operators must set both env vars in prod.
    console.warn(
      "Newsletter signup accepted without delivery — RESEND_API_KEY or RESEND_AUDIENCE_ID is unset.",
    );
    return NextResponse.json({ ok: true });
  }

  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    },
  );

  if (res.ok) {
    return NextResponse.json({ ok: true });
  }

  let detail: ResendErrorBody = {};
  try {
    detail = (await res.json()) as ResendErrorBody;
  } catch {
  }
  console.error(
    `Resend subscription failed (${res.status}): ${detail.message ?? res.statusText}`,
  );
  return NextResponse.json(
    { ok: false, error: "Subscription failed" },
    { status: 500 },
  );
}
