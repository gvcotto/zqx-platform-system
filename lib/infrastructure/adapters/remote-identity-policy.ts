import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "@/lib/domain/v2";

export interface VerifiedIdentity { actor: Actor; email: string; confirmed: boolean }
// Caller must pass ONLY the server-side IdP getUser response, never request data.
export function identityFromVerifiedUser(user: {id:string;email?:string;email_confirmed_at?:string} | null): VerifiedIdentity {
  if (!user) throw new Error("Unauthenticated");
  return {actor:{authSubject:z.guid().parse(user.id),requestId:randomUUID()},email:user.email?.trim().toLowerCase()||"",confirmed:Boolean(user.email_confirmed_at)};
}
export function remotePersistenceAllowed(env: NodeJS.ProcessEnv=process.env) {
  return env.ZQX_RUNTIME_MODE==="production" || (env.NODE_ENV==="development" && env.ZQX_RUNTIME_MODE==="development-remote");
}
export function bootstrapAllowed(identity:VerifiedIdentity,hasOwner:boolean,env:NodeJS.ProcessEnv=process.env) {
  return env.NODE_ENV==="development" && env.ZQX_RUNTIME_MODE==="development-remote" && env.ZQX_OWNER_BOOTSTRAP_ENABLED==="true"
    && !hasOwner && identity.confirmed && identity.email===(env.ZQX_SYSTEM_OWNER_EMAIL||"").trim().toLowerCase()
    && identity.email==="gvcotto@zqxconsulting.com";
}
