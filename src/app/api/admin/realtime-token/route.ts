import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { backendUrl, createAdminRealtimeToken } from "@/lib/backend";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({
      backendUrl,
      token: createAdminRealtimeToken(),
    });
  } catch {
    return NextResponse.json({ message: "Realtime backend configuration missing" }, { status: 503 });
  }
}
