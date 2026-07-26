import crypto from "node:crypto";
import { cookies } from "next/headers";
import { listRecordsAsync } from "@/lib/core/data";

export const LOCAL_SESSION_COOKIE = "zqx_system_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type LocalSession = {
  email: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
};

const fallbackUsers = [
  {
    email: "gvcotto@zqxconsulting.com",
    name: "ZQX Admin",
    password: "ZQXdemo2026!",
  },
  {
    email: "admin@dentalsmile.example",
    name: "Dental Smile Admin",
    password: "DemoDental2026!",
  },
  {
    email: "ops@universitydemo.example",
    name: "Universidad Central Admin",
    password: "DemoUniversity2026!",
  },
  {
    email: "reservas@mesacentral.example",
    name: "Mesa Central Admin",
    password: "DemoFood2026!",
  },
];

function getSecret() {
  return process.env.ZQX_SYSTEM_AUTH_SECRET ?? "zqx-system-local-development-secret";
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
  const normalizedEmail = email.trim().toLowerCase();
  const configuredEmail = process.env.ZQX_SYSTEM_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ZQX_SYSTEM_ADMIN_PASSWORD;
  const configuredUser =
    configuredEmail && configuredPassword
      ? {
          email: configuredEmail,
          name: "ZQX Admin",
          password: configuredPassword,
        }
      : null;
  const recordUser = (await listRecordsAsync("users")).find((item) => item.email.toLowerCase() === normalizedEmail && item.status === "active");
  const storedUser = recordUser?.temporary_password
    ? {
        email: recordUser.email,
        name: recordUser.name,
        password: recordUser.temporary_password,
      }
    : null;
  const user = [configuredUser, storedUser, ...fallbackUsers].filter(Boolean).find((item) => item?.email === normalizedEmail);

  if (!user) {
    return { ok: false, reason: "El usuario no está configurado para login por contraseña." };
  }

  if (!safeEqual(password, user.password)) {
    return { ok: false, reason: "Email o contraseña inválida." };
  }

  return { ok: true, reason: null, user: { email: user.email, name: user.name } };
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
  if (!token) return null;

  const [payload, signature] = token.split(".");

  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;

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
  const cookieStore = await cookies();
  return verifyLocalSessionToken(cookieStore.get(LOCAL_SESSION_COOKIE)?.value);
}

export function getLocalSessionCookieOptions() {
  const forceSecureCookie = process.env.ZQX_SYSTEM_COOKIE_SECURE === "true";
  const hostedProduction = Boolean(process.env.VERCEL);

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: forceSecureCookie || hostedProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
