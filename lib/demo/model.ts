import { z } from "zod";

// Synthetic product sandbox only. Never consumed by production repositories/APIs.
export const DEMO_DATE = "2026-10-02";
export const DEMO_STORAGE_KEY = "zqx.synthetic-workspace.v1";
export const customerSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(150),
  company: z.string().max(100),
  phone: z.string().max(40),
  status: z.enum(["Active", "Inactive"]),
  notes: z.string().max(1500),
});
export const leadSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(100),
  company: z.string().max(100),
  status: z.enum(["New", "Contacted", "Qualified", "Won", "Lost"]),
  nextAction: z.string().max(200),
  owner: z.string().max(60),
});
export const appointmentSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(2).max(120),
  customerId: z.string(),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]),
  duration: z.number().int().min(15).max(240),
});
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(2).max(120),
  customerId: z.string(),
  due: z.iso.date(),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["Open", "Completed"]),
  assignee: z.string().max(60),
});
export const invoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().max(64).optional(),
  customerId: z.string().min(1),
  amount: z.number().int().min(1).max(100000000),
  due: z.iso.date(),
  status: z.enum(["Draft", "Pending", "Partial", "Paid", "Overdue"]),
});
export const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string().min(1),
  amount: z.number().int().min(1).max(100000000),
  date: z.iso.date(),
  method: z.enum(["Bank transfer", "Card", "Cash"]),
});
const activitySchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  detail: z.string().max(200),
  customerId: z.string(),
  time: z.string().max(60),
});
export const storeSchema = z.object({
  version: z.literal(1),
  customers: z.array(customerSchema).max(500),
  leads: z.array(leadSchema).max(500),
  appointments: z.array(appointmentSchema).max(500),
  tasks: z.array(taskSchema).max(500),
  invoices: z.array(invoiceSchema).max(500),
  payments: z.array(paymentSchema).max(1000),
  activities: z.array(activitySchema).max(1000),
});
export type DemoStore = z.infer<typeof storeSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type Entity =
  "customers" | "leads" | "appointments" | "tasks" | "invoices" | "payments";
export const organizations = [
  {
    id: "studio",
    name: "Forma Advisory",
    initials: "FA",
    industry: "Professional services",
    status: "Active",
    modules: 6,
    users: 3,
  },
  {
    id: "sandbox",
    name: "Empty sandbox",
    initials: "ES",
    industry: "Demo workspace",
    status: "Trial",
    modules: 6,
    users: 1,
  },
] as const;
export const clientNavigation = [
  { group: "Workspace", items: ["Overview"] },
  { group: "CRM", items: ["Customers", "Leads"] },
  { group: "Operations", items: ["Calendar", "Tasks"] },
  { group: "Finance", items: ["Invoices", "Payments"] },
  { group: "Insights", items: ["Analytics", "Automation"] },
  { group: "Manage", items: ["Settings"] },
];
export const controlNavigation = [
  {
    group: "Control Center",
    items: [
      "Overview",
      "Organizations",
      "Users",
      "Modules",
      "Usage",
      "Audit",
      "System",
      "Support",
    ],
  },
];
export function demoAllowed(env: NodeJS.ProcessEnv) {
  return env.ZQX_RUNTIME_MODE === "demo" && env.NODE_ENV === "development";
}
export function emptyStore(): DemoStore {
  return {
    version: 1,
    customers: [],
    leads: [],
    appointments: [],
    tasks: [],
    invoices: [],
    payments: [],
    activities: [],
  };
}
export function seedDemo(): DemoStore {
  const names = [
    "Aster Studio",
    "Northline Design",
    "Cedar Works",
    "Orbit Collective",
    "Lumen Partners",
    "Mosaic Atelier",
    "Sierra Lab",
    "Fieldwork Co.",
  ];
  return storeSchema.parse({
    version: 1,
    customers: names.map((name, i) => ({
      id: `c${i + 1}`,
      name,
      company: [
        "Strategy & consulting",
        "Creative services",
        "Project management",
      ][i % 3],
      email: `contact${i + 1}@example.invalid`,
      phone: "",
      status: i === 6 ? "Inactive" : "Active",
      notes:
        "Synthetic account for the ZQX product walkthrough. Quarterly advisory engagement.",
    })),
    leads: [
      "Beacon Projects",
      "Arcway Studio",
      "Cove Advisory",
      "Pilot Works",
      "Foundry Lab",
    ].map((name, i) => ({
      id: `l${i + 1}`,
      name,
      company: "Professional services",
      status: ["New", "Contacted", "Qualified", "Won", "Lost"][i],
      nextAction: [
        "Schedule discovery call",
        "Share service proposal",
        "Review scope of work",
        "Prepare onboarding",
        "Revisit next quarter",
      ][i],
      owner: "Demo operator",
    })),
    appointments: [
      {
        id: "a1",
        title: "Quarterly strategy review",
        customerId: "c1",
        date: DEMO_DATE,
        time: "09:30",
        duration: 60,
        status: "Scheduled",
      },
      {
        id: "a2",
        title: "Project kickoff",
        customerId: "c2",
        date: DEMO_DATE,
        time: "11:00",
        duration: 45,
        status: "Scheduled",
      },
      {
        id: "a3",
        title: "Proposal walkthrough",
        customerId: "c3",
        date: DEMO_DATE,
        time: "14:00",
        duration: 30,
        status: "Scheduled",
      },
      {
        id: "a4",
        title: "Monthly check-in",
        customerId: "c5",
        date: "2026-10-05",
        time: "10:00",
        duration: 30,
        status: "Scheduled",
      },
      {
        id: "a5",
        title: "Discovery workshop",
        customerId: "c4",
        date: "2026-10-06",
        time: "15:00",
        duration: 90,
        status: "Scheduled",
      },
      {
        id: "a6",
        title: "September retrospective",
        customerId: "c1",
        date: "2026-09-29",
        time: "09:00",
        duration: 60,
        status: "Completed",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Send updated strategy proposal",
        customerId: "c1",
        due: DEMO_DATE,
        priority: "High",
        status: "Open",
        assignee: "Demo operator",
      },
      {
        id: "t2",
        title: "Prepare kickoff agenda",
        customerId: "c2",
        due: DEMO_DATE,
        priority: "Medium",
        status: "Open",
        assignee: "Demo operator",
      },
      {
        id: "t3",
        title: "Follow up on pending invoice",
        customerId: "c3",
        due: "2026-10-03",
        priority: "High",
        status: "Open",
        assignee: "Demo finance",
      },
      {
        id: "t4",
        title: "Review onboarding checklist",
        customerId: "c4",
        due: "2026-10-05",
        priority: "Low",
        status: "Open",
        assignee: "Demo operator",
      },
      {
        id: "t5",
        title: "Share workshop notes",
        customerId: "c1",
        due: "2026-09-30",
        priority: "Medium",
        status: "Completed",
        assignee: "Demo operator",
      },
    ],
    invoices: [
      {
        id: "INV-1001",
        customerId: "c1",
        amount: 450000,
        due: "2026-10-10",
        status: "Paid",
      },
      {
        id: "INV-1002",
        customerId: "c2",
        amount: 320000,
        due: "2026-10-15",
        status: "Partial",
      },
      {
        id: "INV-1003",
        customerId: "c3",
        amount: 280000,
        due: "2026-09-30",
        status: "Overdue",
      },
      {
        id: "INV-1004",
        customerId: "c4",
        amount: 180000,
        due: "2026-10-20",
        status: "Pending",
      },
      {
        id: "INV-1005",
        customerId: "c5",
        amount: 240000,
        due: "2026-10-25",
        status: "Draft",
      },
    ],
    payments: [
      {
        id: "p1",
        invoiceId: "INV-1001",
        amount: 450000,
        date: DEMO_DATE,
        method: "Bank transfer",
      },
      {
        id: "p2",
        invoiceId: "INV-1002",
        amount: 160000,
        date: DEMO_DATE,
        method: "Card",
      },
    ],
    activities: [
      {
        id: "e1",
        title: "Payment received",
        detail: "INV-1001 · Bank transfer",
        customerId: "c1",
        time: "09:12",
      },
      {
        id: "e2",
        title: "Customer added",
        detail: "Ready for onboarding",
        customerId: "c2",
        time: "Yesterday",
      },
      {
        id: "e3",
        title: "Workshop completed",
        detail: "Notes shared with the team",
        customerId: "c1",
        time: "Sep 29",
      },
    ],
  });
}
export function customerName(store: DemoStore, id: string) {
  return store.customers.find((c) => c.id === id)?.name || "No customer";
}
export function paidAmount(store: DemoStore, id: string) {
  return store.payments
    .filter((p) => p.invoiceId === id)
    .reduce((n, p) => n + p.amount, 0);
}
export function balance(store: DemoStore) {
  return store.invoices
    .filter((i) => i.status !== "Draft")
    .reduce((n, i) => n + Math.max(0, i.amount - paidAmount(store, i.id)), 0);
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
export function saveRecord(
  store: DemoStore,
  entity: Entity,
  raw: unknown,
): DemoStore {
  const schemas = {
    customers: customerSchema,
    leads: leadSchema,
    appointments: appointmentSchema,
    tasks: taskSchema,
    invoices: invoiceSchema,
    payments: paymentSchema,
  };
  const record = schemas[entity].parse(raw);
  if (
    "customerId" in record &&
    record.customerId &&
    !store.customers.some((c) => c.id === record.customerId)
  )
    throw new Error("Choose a customer in this workspace.");
  const next = structuredClone(store);
  if (entity === "payments") {
    const payment = paymentSchema.parse(record);
    const invoice = next.invoices.find((i) => i.id === payment.invoiceId);
    if (!invoice || invoice.status === "Draft")
      throw new Error("Choose a issued invoice.");
    if (payment.amount > invoice.amount - paidAmount(next, invoice.id))
      throw new Error("Payment exceeds the outstanding balance.");
    next.payments.push(payment);
    invoice.status =
      paidAmount(next, invoice.id) === invoice.amount ? "Paid" : "Partial";
  } else {
    const rows = next[entity] as Array<{ id: string }>;
    const index = rows.findIndex((row) => row.id === record.id);
    if (index < 0) rows.unshift(record);
    else rows[index] = record;
  }
  next.activities.unshift({
    id: `event-${record.id}-${next.activities.length}`,
    title: `${entity[0].toUpperCase() + entity.slice(1)} updated`,
    detail: "Saved in the local demo only",
    customerId:
      "customerId" in record
        ? record.customerId
        : entity === "customers"
          ? record.id
          : "",
    time: "Just now",
  });
  return storeSchema.parse(next);
}
export function restoreStore(value: string | null): DemoStore | undefined {
  if (!value || value.length > 500000) return;
  try {
    const result = storeSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : undefined;
  } catch {
    return;
  }
}
