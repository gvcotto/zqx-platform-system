import { NextResponse } from "next/server";
import { createLocalSessionToken, getLocalSessionCookieOptions, LOCAL_SESSION_COOKIE, validateLocalPasswordLogin } from "@/lib/local-auth";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginPayload;

  try {
    body = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const validation = validateLocalPasswordLogin(email, password);

  if (!validation.ok || !validation.user) {
    return NextResponse.json({ error: validation.reason ?? "Email o contraseña inválida." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  response.cookies.set(LOCAL_SESSION_COOKIE, createLocalSessionToken(validation.user.email, validation.user.name), getLocalSessionCookieOptions());

  return response;
}
