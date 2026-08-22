import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "analytics:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const query = new URL(request.url).searchParams;
  const view = query.get("view") === "checklists" ? "checklists" : "reports";
  try {
    if (view === "checklists") return NextResponse.json(await fetchBackendJson("/admin/service-work/checklists"));
    const params = new URLSearchParams();
    for (const key of ["page", "limit", "serviceCategory", "status", "from", "to"]) {
      const value = query.get(key);
      if (value) params.set(key, value);
    }
    return NextResponse.json(await fetchBackendJson(`/admin/service-work/reports?${params}`));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Live backend unavailable" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "analytics:read")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const category = new URL(request.url).searchParams.get("serviceCategory");
  if (!category) return NextResponse.json({ message: "Service category required" }, { status: 400 });
  try {
    return NextResponse.json(await fetchBackendJson(`/admin/service-work/checklists/${encodeURIComponent(category)}`, {
      method: "PUT",
      body: JSON.stringify(await request.json()),
    }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Update failed" }, { status: 502 });
  }
}
