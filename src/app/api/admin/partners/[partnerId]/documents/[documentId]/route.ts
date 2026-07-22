import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requirePermission } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/backend";

const schema = z.object({
  validationStatus: z.enum(["accepted", "rejected", "review"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ partnerId: string; documentId: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!requirePermission(session, "technicians:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Invalid document status" }, { status: 400 });

  const { partnerId, documentId } = await context.params;
  try {
    const data = await fetchBackendJson(
      `/api/admin/partners/${encodeURIComponent(partnerId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "PATCH", body: JSON.stringify(body.data) },
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
