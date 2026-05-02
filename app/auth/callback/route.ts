import { NextResponse, type NextRequest } from "next/server";
import { createRecord, listRecords, updateRecord } from "@/lib/core/crud";
import { ZQX_BUSINESS_ID, type UserRecord } from "@/lib/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ownerEmail = (process.env.ZQX_SYSTEM_OWNER_EMAIL ?? "gvcotto@zqxconsulting.com").trim().toLowerCase();

function resolveDefaultRole(email: string): UserRecord["role"] {
  return email === ownerEmail ? "zqx_owner" : "viewer";
}

function provisionSystemUser(email: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = listRecords("users").find((record) => record.email.toLowerCase() === normalizedEmail);
  if (existing) {
    if (existing.role !== "zqx_owner" && existing.status === "invited" && existing.business_id === ZQX_BUSINESS_ID) {
      updateRecord("users", existing.id, { business_id: "", auth_source: existing.auth_source ?? "google" });
    } else if (!existing.auth_source) {
      updateRecord("users", existing.id, { auth_source: "google" });
    }
    return;
  }

  const role = resolveDefaultRole(normalizedEmail);
  createRecord("users", {
    business_id: role === "zqx_owner" ? ZQX_BUSINESS_ID : "",
    email: normalizedEmail,
    name: (name ?? normalizedEmail).trim(),
    role,
    status: role === "zqx_owner" ? "active" : "invited",
    auth_source: "google",
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          provisionSystemUser(user.email, user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined);
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
