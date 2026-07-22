import type { NextConfig } from "next";
import path from "node:path";

const fallbackBackendUrl = "https://apnaservobk-1.onrender.com";

function connectSrcOrigins() {
  const configuredBackendUrls =
    process.env.APNASERVO_BACKEND_URL ||
    process.env.NEXT_PUBLIC_APNASERVO_BACKEND_URL ||
    fallbackBackendUrl;

  const origins = new Set(["'self'"]);

  for (const backendUrl of configuredBackendUrls.split(",")) {
    const normalized = backendUrl.trim().replace(/\/+$/, "");
    if (!normalized) continue;

    origins.add(normalized);

    try {
      const parsed = new URL(normalized);
      if (parsed.protocol === "https:") origins.add(`wss://${parsed.host}`);
      if (parsed.protocol === "http:") origins.add(`ws://${parsed.host}`);
    } catch {
      // Ignore invalid deploy-time values; backend config validation handles them.
    }
  }

  return Array.from(origins).join(" ");
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const connectSrc = connectSrcOrigins();
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              `connect-src ${connectSrc} https://accounts.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.googleapis.com`,
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
