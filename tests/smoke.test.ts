import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/live/route";

describe("application smoke", () => {
  it("returns a live health response", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
