/** Provider-independent identifiers. Money is integer minor units, not floating point. */
export type OrganizationRole = "org_admin" | "operator" | "viewer";
export type PlatformRole = "platform_owner" | "zqx_admin" | "support";
export interface Actor { authSubject: string; requestId: string }
export interface User { id: string; authUserId: string | null; email: string; name: string; status: "active" | "inactive" }
export interface Organization { id: string; slug: string; name: string; industry: string; status: "active" | "inactive" }
export interface Membership { id: string; userId: string; organizationId: string; role: OrganizationRole; status: "active" | "invited" | "inactive" }
export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "overdue" | "void";
export interface Invoice { id: string; invoiceNumber: string; organizationId: string; customerId: string; currency: string; subtotal: number; total: number; status: InvoiceStatus }
export interface Payment { id: string; organizationId: string; invoiceId: string; customerId: string; amount: number; currency: string; method: "bank_transfer" | "card" | "cash" }
export interface Customer { id: string; organizationId: string; name: string; email: string; phone: string; status: "active" | "inactive"; notes: string }
export interface Lead { id: string; organizationId: string; name: string; stage: "new" | "contacted" | "qualified" | "won" | "lost"; ownerUserId: string | null; nextAction: string }
export interface Appointment { id: string; organizationId: string; customerId: string | null; title: string; startsAt: string; endsAt: string; status: "scheduled" | "completed" | "cancelled" }
export interface Task { id: string; organizationId: string; customerId: string | null; title: string; dueAt: string | null; priority: "low" | "medium" | "high"; status: "open" | "completed"; assignedUserId: string | null }
export interface AuditEvent { id: string; organizationId: string | null; actorUserId: string | null; action: string; resourceType: string; resourceId: string | null; occurredAt: string }
