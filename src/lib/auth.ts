import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { can, type AdminRole } from "./permissions";

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

const cookieName = "apnaservo_admin_session";
const encoder = new TextEncoder();
const defaultJwtSecret = "dev-only-apnaservo-admin-secret-change-me";
const defaultAdminPassword = "Admin@12345";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function isAdminAuthDisabled() {
  return process.env.ADMIN_AUTH_DISABLED !== "false";
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET || defaultJwtSecret;
  if (isProduction() && (secret === defaultJwtSecret || secret.length < 32)) {
    throw new Error("JWT_SECRET must be a unique 32+ character secret in production");
  }
  return encoder.encode(secret);
}

export function adminEmail() {
  if (isProduction()) return requiredEnv("ADMIN_EMAIL").toLowerCase();
  return (process.env.ADMIN_EMAIL || "admin@apnaservo.com").toLowerCase();
}

export function adminPasswordSecret() {
  const password = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || defaultAdminPassword;
  if (isProduction()) {
    if (!process.env.ADMIN_PASSWORD_HASH) {
      throw new Error("ADMIN_PASSWORD_HASH is required in production");
    }
    if (!password.startsWith("$2")) {
      throw new Error("ADMIN_PASSWORD_HASH must be a bcrypt hash");
    }
  }
  return password;
}

export async function signAdminToken(admin: AdminSession) {
  return new SignJWT(admin)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(jwtSecret());
}

export async function verifyAdminToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  if (isAdminAuthDisabled()) {
    return {
      id: "passwordless-admin",
      name: "Admin",
      email: process.env.ADMIN_EMAIL || "admin@apnaservo.com",
      role: "SUPER_ADMIN",
    } satisfies AdminSession;
  }
  const jar = await cookies();
  return verifyAdminToken(jar.get(cookieName)?.value);
}

export async function setAdminSession(admin: AdminSession) {
  const token = await signAdminToken(admin);
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function verifyPassword(password: string, hashOrPlain: string) {
  if (hashOrPlain.startsWith("$2")) return bcrypt.compare(password, hashOrPlain);
  if (isProduction()) return false;
  return password === hashOrPlain;
}

export function requirePermission(session: AdminSession | null, permission: string) {
  if (!session) return false;
  return can(session.role, permission);
}
