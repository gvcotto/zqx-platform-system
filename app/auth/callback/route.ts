import { NextResponse, type NextRequest } from "next/server";
import { createRecordAsync, listRecordsAsync, updateRecordAsync } from "@/lib/core/data";
import { ZQX_BUSINESS_ID, type UserRecord } from "@/lib/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafePostAuthPath } from "@/lib/auth-redirect";
import { remotePersistenceAllowed } from "@/lib/infrastructure/adapters/remote-identity-policy";
import { remoteContext } from "@/lib/infrastructure/adapters/remote-identity";

const ownerEmail = (process.env.ZQX_SYSTEM_OWNER_EMAIL ?? "gvcotto@zqxconsulting.com").trim().toLowerCase();

function resolveDefaultRole(email: string): UserRecord["role"] {
  return email === ownerEmail ? "zqx_owner" : "viewer";
}

async function provisionSystemUser(email: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = (await listRecordsAsync("users")).find((record) => record.email.toLowerCase() === normalizedEmail);
  if (existing) {
    if (existing.role !== "zqx_owner" && existing.status === "invited" && existing.business_id === ZQX_BUSINESS_ID) {
      await updateRecordAsync("users", existing.id, { auth_source: existing.auth_source ?? "google" });
    } else if (!existing.auth_source) {
      await updateRecordAsync("users", existing.id, { auth_source: "google" });
    }
    return;
  }

  const role = resolveDefaultRole(normalizedEmail);
  await createRecordAsync("users", {
    business_id: ZQX_BUSINESS_ID,
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
  const next = getSafePostAuthPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          if(remotePersistenceAllowed()) {
            try{await remoteContext();}catch{return NextResponse.redirect(new URL("/login?access=not_found",requestUrl.origin));}
          }else await provisionSystemUser(user.email, user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined);
        }
      } else {
        const category = error.code && /^[a-z_]{1,64}$/.test(error.code) ? error.code : "unknown";
        console.error("[zqx-auth] OAuth code exchange failed.", { category, status: error.status });
        return NextResponse.redirect(new URL("/login?oauth_error=exchange_failed", requestUrl.origin));
      }
    } else {
      console.error("[zqx-auth] OAuth callback is missing identity provider configuration.");
      return NextResponse.redirect(new URL("/login?oauth_error=not_configured", requestUrl.origin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?oauth_error=missing_code", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
