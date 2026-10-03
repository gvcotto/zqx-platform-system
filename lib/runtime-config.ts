import { z } from "zod";

const runtimeModeSchema = z.enum(["development", "development-local", "development-remote", "demo", "test", "production"]);

export type RuntimeMode = z.infer<typeof runtimeModeSchema>;

export class RuntimeConfigurationError extends Error {
  readonly code = "RUNTIME_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

function resolveRuntimeMode(env: NodeJS.ProcessEnv): RuntimeMode {
  const configuredMode = env.ZQX_RUNTIME_MODE?.trim();
  if (configuredMode) {
    const result = runtimeModeSchema.safeParse(configuredMode);
    if (!result.success) {
      throw new RuntimeConfigurationError("ZQX_RUNTIME_MODE must be development, demo, test, or production.");
    }
    return result.data;
  }
  if (env.NODE_ENV === "test") return "test";
  if (env.NODE_ENV === "development") return "development";
  throw new RuntimeConfigurationError("ZQX_RUNTIME_MODE is required outside development and test.");
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = resolveRuntimeMode(env);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (mode === "demo" && env.NODE_ENV === "production") {
    throw new RuntimeConfigurationError("Demo mode cannot run with NODE_ENV=production.");
  }
  if ((mode === "production" || mode === "development" || mode === "development-remote") && (!supabaseUrl || !supabaseAnonKey)) {
    throw new RuntimeConfigurationError(`Supabase configuration is required in ${mode} mode.`);
  }

  return {
    mode,
    usesMemoryData: mode === "demo" || mode === "test",
    localDemoAuthEnabled: mode === "demo" && env.NODE_ENV !== "production",
    supabaseUrl,
    supabaseAnonKey,
  } as const;
}

export function getDemoAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const runtime = getRuntimeConfig(env);
  if (!runtime.localDemoAuthEnabled) {
    throw new RuntimeConfigurationError("Local demo authentication is disabled in this runtime mode.");
  }

  const email = env.ZQX_DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = env.ZQX_DEMO_USER_PASSWORD;
  const sessionSecret = env.ZQX_SYSTEM_AUTH_SECRET;
  if (!email || !password || password.length < 12 || !sessionSecret || sessionSecret.length < 32) {
    throw new RuntimeConfigurationError(
      "Demo auth requires ZQX_DEMO_USER_EMAIL, a 12+ character ZQX_DEMO_USER_PASSWORD, and a 32+ character ZQX_SYSTEM_AUTH_SECRET.",
    );
  }
  return { email, password, sessionSecret } as const;
}
