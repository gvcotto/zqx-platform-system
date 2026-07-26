import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSystemUserAccess, type SystemUser } from "@/lib/core/selectors";
import { getLocalSessionFromCookies } from "@/lib/local-auth";

type AccessReason = "unauthenticated" | "not_found" | "invited" | "disabled";

type AccessResult = {
  user: SystemUser | null;
  reason: AccessReason;
};

export async function getCurrentSystemAccess(): Promise<AccessResult> {
  const localSession = await getLocalSessionFromCookies();

  if (localSession) {
    const access = await getSystemUserAccess(localSession.email, localSession.name);
    return { user: access.user, reason: access.state === "active" ? "unauthenticated" : access.state };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { user: null, reason: "unauthenticated" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { user: null, reason: "unauthenticated" };

  const access = await getSystemUserAccess(user.email, user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email);
  return { user: access.user, reason: access.state === "active" ? "unauthenticated" : access.state };
}

export async function getCurrentSystemUser() {
  const access = await getCurrentSystemAccess();
  return access.user;
}

export async function requireSystemUser() {
  const access = await getCurrentSystemAccess();
  const user = access.user;

  if (!user) {
    if (access.reason === "invited" || access.reason === "disabled" || access.reason === "not_found") {
      redirect(`/access?reason=${access.reason}`);
    }
    redirect("/login");
  }

  return user;
}
