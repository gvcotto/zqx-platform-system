import { describe, expect, it } from "vitest";
import {
  balance,
  clientNavigation,
  controlNavigation,
  demoAllowed,
  emptyStore,
  paidAmount,
  restoreStore,
  saveRecord,
  seedDemo,
} from "@/lib/demo/model";

describe("modern product sandbox", () => {
  it("contains all client and platform navigation destinations", () => {
    expect(clientNavigation.flatMap((g) => g.items)).toHaveLength(10);
    expect(controlNavigation[0].items).toHaveLength(8);
    expect(clientNavigation.flatMap((g) => g.items)).not.toContain(
      "Organizations",
    );
  });
  it("never enables the demo in production or ordinary development", () => {
    expect(
      demoAllowed({ NODE_ENV: "production", ZQX_RUNTIME_MODE: "demo" }),
    ).toBe(false);
    expect(
      demoAllowed({ NODE_ENV: "production", ZQX_RUNTIME_MODE: "production" }),
    ).toBe(false);
    expect(demoAllowed({ NODE_ENV: "development" })).toBe(false);
    expect(
      demoAllowed({ NODE_ENV: "development", ZQX_RUNTIME_MODE: "demo" }),
    ).toBe(true);
  });
  it("seeds a coherent fictional dashboard with linked records", () => {
    const s = seedDemo();
    expect(s.customers).toHaveLength(8);
    expect(balance(s)).toBe(620000);
    expect(s.payments.reduce((n, p) => n + p.amount, 0)).toBe(610000);
    for (const a of s.appointments)
      expect(s.customers.some((c) => c.id === a.customerId)).toBe(true);
    expect(s.customers.every((c) => c.email.endsWith("@example.invalid"))).toBe(
      true,
    );
  });
  it("creates and edits a customer without mutating the seed", () => {
    const s = seedDemo();
    const c = {
      id: "new",
      name: "Test Studio",
      company: "Demo",
      email: "test@example.invalid",
      phone: "",
      notes: "Synthetic",
      status: "Active",
    };
    const added = saveRecord(s, "customers", c);
    expect(s.customers).toHaveLength(8);
    expect(added.customers).toHaveLength(9);
    expect(
      saveRecord(added, "customers", { ...c, name: "Updated Studio" })
        .customers[0].name,
    ).toBe("Updated Studio");
  });
  it("validates customer email and rejects invalid records", () => {
    expect(() =>
      saveRecord(seedDemo(), "customers", {
        id: "bad",
        name: "Bad",
        email: "not-email",
      }),
    ).toThrow();
  });
  it("completes and reopens a task", () => {
    const s = seedDemo();
    const next = saveRecord(s, "tasks", { ...s.tasks[0], status: "Completed" });
    expect(next.tasks[0].status).toBe("Completed");
    expect(
      saveRecord(next, "tasks", { ...next.tasks[0], status: "Open" }).tasks[0]
        .status,
    ).toBe("Open");
  });
  it("rejects cross-workspace customer references in a task", () => {
    expect(() =>
      saveRecord(emptyStore(), "tasks", seedDemo().tasks[0]),
    ).toThrow("Choose a customer");
  });
  it("records a partial then final payment and computes invoice state", () => {
    const s = seedDemo();
    const p = {
      id: "pay-a",
      invoiceId: "INV-1003",
      date: "2026-10-02",
      method: "Cash",
      amount: 100000,
    };
    const partial = saveRecord(s, "payments", p);
    expect(partial.invoices.find((i) => i.id === p.invoiceId)?.status).toBe(
      "Partial",
    );
    const paid = saveRecord(partial, "payments", {
      ...p,
      id: "pay-b",
      amount: 180000,
    });
    expect(paid.invoices.find((i) => i.id === p.invoiceId)?.status).toBe(
      "Paid",
    );
    expect(paidAmount(paid, p.invoiceId)).toBe(280000);
  });
  it("rejects overpayments, draft invoices and unknown invoice IDs", () => {
    const s = seedDemo();
    const p = {
      id: "p",
      date: "2026-10-02",
      method: "Cash",
      amount: 1,
      invoiceId: "INV-1005",
    };
    expect(() => saveRecord(s, "payments", p)).toThrow();
    expect(() =>
      saveRecord(s, "payments", { ...p, invoiceId: "missing" }),
    ).toThrow();
    expect(() =>
      saveRecord(s, "payments", {
        ...p,
        invoiceId: "INV-1003",
        amount: 999999,
      }),
    ).toThrow("exceeds");
  });
  it("issues a draft invoice without payment gateway or accounting", () => {
    const s = seedDemo();
    const created = saveRecord(s, "invoices", {
      id: "draft",
      customerId: "c1",
      amount: 10000,
      due: "2026-10-02",
      status: "Draft",
    });
    expect(balance(created)).toBe(balance(s));
    expect(
      balance(
        saveRecord(created, "invoices", {
          ...created.invoices[0],
          status: "Pending",
        }),
      ),
    ).toBe(balance(s) + 10000);
  });
  it("keeps switched workspace records separate", () => {
    const populated = seedDemo();
    const empty = emptyStore();
    saveRecord(populated, "tasks", {
      ...populated.tasks[0],
      status: "Completed",
    });
    expect(empty.tasks).toHaveLength(0);
    expect(populated.tasks[0].status).toBe("Open");
  });
  it("only restores versioned validated synthetic state", () => {
    expect(restoreStore(JSON.stringify(seedDemo()))?.customers).toHaveLength(8);
    expect(restoreStore('{"version":2}')).toBeUndefined();
    expect(restoreStore("not json")).toBeUndefined();
    expect(restoreStore("x".repeat(500001))).toBeUndefined();
  });
});
