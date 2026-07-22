import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

type Params = { params: Promise<{ notificationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { notificationId } = await params;
  try {
    const data = await fetchBackendJson(`/api/admin/notifications/${encodeURIComponent(notificationId)}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { notificationId } = await params;
  try {
    const data = await fetchBackendJson(`/api/admin/notifications/${encodeURIComponent(notificationId)}`, { method: "DELETE" });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Delete failed" }, { status: 502 });
  }
}
