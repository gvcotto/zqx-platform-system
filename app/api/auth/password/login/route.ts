import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody, toApiErrorResponse } from "@/lib/api/request";
import { createLocalSessionToken, getLocalSessionCookieOptions, LOCAL_SESSION_COOKIE, validateLocalPasswordLogin } from "@/lib/local-auth";

const loginPayloadSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  try {
    const body = loginPayloadSchema.parse(await readJsonBody(request, 4096));
    const validation = await validateLocalPasswordLogin(body.email.toLowerCase(), body.password);
    if ("disabled" in validation && validation.disabled) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!validation.ok || !validation.user) return NextResponse.json({ error: validation.reason ?? "Invalid credentials." }, { status: 401 });

    const response = NextResponse.json({ ok: true, redirectTo: "/dashboard" });
    response.cookies.set(LOCAL_SESSION_COOKIE, createLocalSessionToken(validation.user.email, validation.user.name), getLocalSessionCookieOptions());
    return response;
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
