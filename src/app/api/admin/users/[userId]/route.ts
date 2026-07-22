import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "users:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { userId } = await context.params;
  try {
    const data = await fetchBackendJson(`/api/admin/users/${encodeURIComponent(userId)}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "users:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { userId } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const data = await fetchBackendJson(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
