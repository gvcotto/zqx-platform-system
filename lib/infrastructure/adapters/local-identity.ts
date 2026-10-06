import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "@/lib/domain/v2";

// Explicit isolated LOCAL fixture. NEVER an authentication substitute in production.
export function localPersistenceAllowed(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "development" && ["development","development-local"].includes(env.ZQX_RUNTIME_MODE||"") && env.ZQX_LOCAL_DATA_V2 === "true";
}
export function localActor(env: NodeJS.ProcessEnv = process.env): Actor {
  if (!localPersistenceAllowed(env)) throw new Error("Local identity is disabled.");
  const url = new URL(env.ZQX_DATABASE_URL || "");
  if (url.hostname !== "database" || url.pathname !== "/zqx_local" || url.username !== "zqx_app" || url.password) {
    throw new Error("Local fixture must use the dedicated private PostgreSQL container.");
  }
  return { authSubject: z.guid().parse(env.ZQX_LOCAL_AUTH_SUBJECT), requestId: randomUUID() };
}
