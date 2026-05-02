import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOCAL_SESSION_COOKIE } from "@/lib/local-auth";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();

  const response = NextResponse.json({ ok: true, redirectTo: "/login" });
  response.cookies.set(LOCAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
