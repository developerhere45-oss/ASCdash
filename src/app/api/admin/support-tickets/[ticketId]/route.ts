import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function GET(_request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "complaints:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { ticketId } = await context.params;
  try {
    const data = await fetchBackendJson(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "complaints:manage")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { ticketId } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const data = await fetchBackendJson(
      `/api/admin/support-tickets/${encodeURIComponent(ticketId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
