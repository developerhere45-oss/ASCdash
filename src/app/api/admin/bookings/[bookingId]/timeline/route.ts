import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function GET(_request: Request, context: { params: Promise<{ bookingId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "bookings:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { bookingId } = await context.params;
  try {
    const data = await fetchBackendJson(`/api/admin/bookings/${encodeURIComponent(bookingId)}/timeline`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
