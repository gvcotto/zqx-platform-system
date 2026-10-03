import { afterEach, describe, expect, it, vi } from "vitest";

const previous = process.env.ZQX_OUTPUT;
afterEach(() => {
  if (previous === undefined) delete process.env.ZQX_OUTPUT;
  else process.env.ZQX_OUTPUT = previous;
});

describe("portable output is opt-in", () => {
  it("preserves the ordinary build by default", async () => {
    delete process.env.ZQX_OUTPUT;
    vi.resetModules();
    const nextConfiguration = await import("../next.config");
    expect(nextConfiguration.default.output).toBeUndefined();
  });
  it("uses the documented standalone output for container builds", async () => {
    process.env.ZQX_OUTPUT = "standalone";
    vi.resetModules();
    const nextConfiguration = await import("../next.config");
    expect(nextConfiguration.default.output).toBe("standalone");
    expect(nextConfiguration.default.reactStrictMode).toBe(true);
  });
});
