import { NextResponse } from "next/server";
import { z } from "zod";
import { adminEmail, adminPasswordSecret, isAdminAuthDisabled, setAdminSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(request: Request, email: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${email.toLowerCase()}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = loginBuckets.get(key) || { count: 0, resetAt: now + 10 * 60 * 1000 };
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + 10 * 60 * 1000;
  }
  bucket.count += 1;
  loginBuckets.set(key, bucket);
  return bucket.count > 8;
}

export async function POST(request: Request) {
  if (isAdminAuthDisabled()) {
    return NextResponse.json({ ok: true, authDisabled: true });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ message: "Invalid login details" }, { status: 400 });
  }

  const key = rateLimitKey(request, body.data.email);
  if (isRateLimited(key)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const configuredEmail = adminEmail();
  const allowed = body.data.email.toLowerCase() === configuredEmail && (await verifyPassword(body.data.password, adminPasswordSecret()));

  if (!allowed) {
    return NextResponse.json({ message: "Email or password is wrong" }, { status: 401 });
  }

  await setAdminSession({
    id: "super-admin",
    name: "Admin User",
    email: configuredEmail,
    role: "SUPER_ADMIN",
  });

  return NextResponse.json({ ok: true });
}
