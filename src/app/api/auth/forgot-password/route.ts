import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ message: "Valid email required" }, { status: 400 });
  }
  if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST && !process.env.PASSWORD_RESET_WEBHOOK_URL) {
    return NextResponse.json({ message: "Password reset provider is not configured" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    message: "Password reset flow is queued. Connect SMTP before production email delivery.",
  });
}
