import crypto from "node:crypto";

export const backendUrl =
  process.env.APNASERVO_BACKEND_URL ||
  process.env.NEXT_PUBLIC_APNASERVO_BACKEND_URL ||
  "https://apnaservobk-1.onrender.com";

export const adminBackendSecret =
  process.env.ADMIN_BACKEND_SECRET ||
  process.env.ADMIN_API_SECRET ||
  "apnaservo-admin-dev-secret";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function assertProductionBackendConfig() {
  if (!isProduction()) return;
  if (!process.env.APNASERVO_BACKEND_URL && !process.env.NEXT_PUBLIC_APNASERVO_BACKEND_URL) {
    throw new Error("APNASERVO_BACKEND_URL is required in production");
  }
  if (!process.env.ADMIN_BACKEND_SECRET && !process.env.ADMIN_API_SECRET) {
    throw new Error("ADMIN_BACKEND_SECRET is required in production");
  }
  if (adminBackendSecret === "apnaservo-admin-dev-secret" || adminBackendSecret.length < 32) {
    throw new Error("ADMIN_BACKEND_SECRET must be a unique 32+ character secret in production");
  }
}

export function createAdminRealtimeToken(ttlMs = 5 * 60 * 1000) {
  assertProductionBackendConfig();
  const expiresAt = Date.now() + ttlMs;
  const signature = crypto.createHmac("sha256", adminBackendSecret).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

export async function fetchBackendJson<T>(path: string, init?: RequestInit): Promise<T> {
  assertProductionBackendConfig();
  const url = `${backendUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": adminBackendSecret,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Backend ${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
  }

  return (await response.json()) as T;
}
