import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      backendUrl,
      backend: payload,
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      backendUrl,
      message: error instanceof Error ? error.message : "Backend health check failed",
    }, { status: 502 });
  }
}
