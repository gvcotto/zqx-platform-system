import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDemoAuthConfig, getRuntimeConfig } from "@/lib/runtime-config";

export const LOCAL_SESSION_COOKIE = "zqx_system_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type LocalSession = {
  email: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret() {
  return getDemoAuthConfig().sessionSecret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function validateLocalPasswordLogin(email: string, password: string) {
  const runtime = getRuntimeConfig();
  if (!runtime.localDemoAuthEnabled) {
    return { ok: false, disabled: true, reason: "Local demo authentication is disabled." } as const;
  }

  const demo = getDemoAuthConfig();
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== demo.email || !safeEqual(password, demo.password)) {
    return { ok: false, reason: "Invalid email or password." } as const;
  }

  return { ok: true, reason: null, user: { email: demo.email, name: "ZQX Demo User" } } as const;
}

export function createLocalSessionToken(email: string, name: string) {
  const now = Math.floor(Date.now() / 1000);
  const session: LocalSession = {
    email: email.trim().toLowerCase(),
    name,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE,
  };
  const payload = encode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function verifyLocalSessionToken(token?: string | null) {
  if (!getRuntimeConfig().localDemoAuthEnabled || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(decode(payload)) as LocalSession;
    const now = Math.floor(Date.now() / 1000);
    if (!session.email || !session.expiresAt || session.expiresAt < now) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getLocalSessionFromCookies() {
  if (!getRuntimeConfig().localDemoAuthEnabled) return null;
  const cookieStore = await cookies();
  return verifyLocalSessionToken(cookieStore.get(LOCAL_SESSION_COOKIE)?.value);
}

export function getLocalSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
