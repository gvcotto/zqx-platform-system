import { describe, expect, it, vi } from "vitest";
import { DataBackendError } from "@/lib/core/errors";

vi.mock("@/lib/auth", () => ({
  getCurrentSystemUser: vi.fn(async () => ({ email: "owner@example.com", name: "Owner", role: "zqx_owner", businessId: "biz-zqx", isZqxAdmin: true })),
}));
vi.mock("@/lib/core/data", () => ({
  createRecordAsync: vi.fn(async () => { throw new DataBackendError("create", "clients"); }),
  listRecordsAsync: vi.fn(async () => []),
}));

import { POST } from "@/app/api/records/[entity]/route";

describe("records API", () => {
  it("returns 503 instead of false success when persistence fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new Request("https://system.example/api/records/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ business_id: "biz-zqx", name: "Test", type: "person", email: "", phone: "", status: "lead", service_interest: "", notes: "" }),
    });
    const response = await POST(request as never, { params: Promise.resolve({ entity: "clients" }) });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "DATA_BACKEND_UNAVAILABLE" });
  });
});
