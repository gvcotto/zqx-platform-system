import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

import { createRecordAsync, deleteRecordAsync, updateRecordAsync } from "@/lib/core/data";
import { getRecord, listRecords } from "@/lib/core/crud";
import { DataBackendError } from "@/lib/core/errors";

function failingClient() {
  const error = { message: "simulated database outage" };
  const builder: Record<string, unknown> = { error };
  for (const method of ["from", "select", "insert", "update", "delete", "eq", "in"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => ({ data: null, error }));
  builder.maybeSingle = vi.fn(async () => ({ data: null, error }));
  return builder;
}

describe("production persistence", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ZQX_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    mocks.createClient.mockResolvedValue(failingClient());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("does not write memory when create fails", async () => {
    const before = listRecords("clients").length;
    await expect(createRecordAsync("clients", { business_id: "biz-zqx", name: "Fail closed", type: "person", email: "", phone: "", status: "lead", service_interest: "", notes: "" })).rejects.toBeInstanceOf(DataBackendError);
    expect(listRecords("clients")).toHaveLength(before);
  });

  it("does not write memory when update fails", async () => {
    const record = listRecords("clients")[0];
    const before = getRecord("clients", record.id);
    await expect(updateRecordAsync("clients", record.id, { name: "Must not persist" })).rejects.toBeInstanceOf(DataBackendError);
    expect(getRecord("clients", record.id)).toEqual(before);
  });

  it("does not write memory when delete fails", async () => {
    const record = listRecords("clients")[0];
    await expect(deleteRecordAsync("clients", record.id)).rejects.toBeInstanceOf(DataBackendError);
    expect(getRecord("clients", record.id)).not.toBeNull();
  });

  it("allows isolated memory persistence only in explicit demo mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ZQX_RUNTIME_MODE", "demo");
    const before = listRecords("clients").length;
    await createRecordAsync("clients", { business_id: "biz-zqx", name: "Demo only", type: "person", email: "", phone: "", status: "lead", service_interest: "", notes: "" });
    expect(listRecords("clients")).toHaveLength(before + 1);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
