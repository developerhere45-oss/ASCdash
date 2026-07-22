import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const data = await fetchBackendJson("/api/admin/notifications/send", {
      method: "POST",
      headers: request.headers.get("idempotency-key") ? { "Idempotency-Key": request.headers.get("idempotency-key") || "" } : undefined,
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Notification send failed" }, { status: 502 });
  }
}
