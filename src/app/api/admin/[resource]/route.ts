import { NextResponse } from "next/server";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { getResourceRows, resourceConfig } from "@/lib/data";

export async function GET(_request: Request, context: { params: Promise<{ resource: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { resource } = await context.params;
  const config = resourceConfig[resource];
  if (!config) return NextResponse.json({ message: "Resource not found" }, { status: 404 });
  if (!requirePermission(session, config.permission)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await getResourceRows(resource);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
