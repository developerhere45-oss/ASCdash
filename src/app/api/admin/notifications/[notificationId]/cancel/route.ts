import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

type Params = { params: Promise<{ notificationId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { notificationId } = await params;
  try {
    const data = await fetchBackendJson(`/api/admin/notifications/${encodeURIComponent(notificationId)}/cancel`, { method: "POST" });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Cancel failed" }, { status: 502 });
  }
}
