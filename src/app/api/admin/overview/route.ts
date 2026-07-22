import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getOverview } from "@/lib/data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch {
    return NextResponse.json({ message: "Live backend unavailable" }, { status: 502 });
  }
}
