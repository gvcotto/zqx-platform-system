import { describe, expect, it, vi } from "vitest";
import { getSafePostAuthPath } from "@/lib/auth-redirect";
import { parseRecordInput } from "@/lib/core/validation";
import { validateLocalPasswordLogin } from "@/lib/local-auth";
import { getRuntimeConfig, RuntimeConfigurationError } from "@/lib/runtime-config";
import { stripSensitiveFields } from "@/lib/security/sanitize";

describe("Phase 1 security baseline", () => {
  it("requires an explicit runtime mode outside development/test", () => {
    expect(() => getRuntimeConfig({ NODE_ENV: "production" })).toThrow(RuntimeConfigurationError);
  });

  it("does not permit demo runtime under NODE_ENV production", () => {
    expect(() => getRuntimeConfig({ NODE_ENV: "production", ZQX_RUNTIME_MODE: "demo" })).toThrow(RuntimeConfigurationError);
  });

  it("disables local demo authentication in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ZQX_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    const result = await validateLocalPasswordLogin("user@example.com", "not-a-real-password");
    expect(result.ok).toBe(false);
    expect("disabled" in result && result.disabled).toBe(true);
  });

  it("removes credential-like fields recursively before serialization", () => {
    const result = stripSensitiveFields({ user: { email: "user@example.com", password: "redacted", temporary_password: "redacted", session_secret: "redacted", access_token: "redacted" } });
    expect(JSON.stringify(result)).not.toMatch(/password|secret|token/i);
    expect(result).toEqual({ user: { email: "user@example.com" } });
  });

  it("rejects external and protocol-relative OAuth destinations", () => {
    expect(getSafePostAuthPath("//evil.example")).toBe("/dashboard");
    expect(getSafePostAuthPath("/\\evil.example")).toBe("/dashboard");
    expect(getSafePostAuthPath("https://evil.example")).toBe("/dashboard");
    expect(getSafePostAuthPath("/access?reason=invited")).toBe("/access?reason=invited");
  });

  it("rejects password fields and unknown privileged fields in user mutations", () => {
    expect(() => parseRecordInput("users", { business_id: "biz-zqx", email: "user@example.com", name: "User", role: "viewer", status: "invited", auth_source: "google", temporary_password: "redacted" })).toThrow();
    expect(() => parseRecordInput("users", { business_id: "biz-zqx", email: "user@example.com", name: "User", role: "viewer", status: "invited", auth_source: "google", isZqxAdmin: true })).toThrow();
  });
});
