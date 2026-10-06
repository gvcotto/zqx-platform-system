import { z } from "zod";
import type { Entity, RecordInput, RecordUpdate } from "@/lib/core/types";

const id = z.string().trim().min(1).max(120);
const shortText = z.string().trim().min(1).max(200);
const text = z.string().trim().max(5000);
const email = z.string().trim().email().max(320);
const isoDate = z.string().datetime({ offset: true });

const createSchemas = {
  businesses: z.object({ name: shortText, slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/), industry: z.enum(["general", "dentist", "medical", "university", "consulting", "restaurant", "custom"]), contact_email: email, logo_url: z.string().url().max(2048).optional(), status: z.enum(["active", "demo", "paused"]), notes: text }),
  users: z.object({ business_id: id, email, name: shortText, role: z.enum(["zqx_owner", "business_admin", "operator", "viewer"]), status: z.enum(["invited", "active", "disabled"]), auth_source: z.enum(["local", "google"]).optional() }),
  modules: z.object({ key: z.enum(["general", "dentist", "medical", "university", "consulting", "restaurant", "custom"]), name: shortText, description: text }),
  business_modules: z.object({ business_id: id, module_id: id, enabled: z.boolean(), configuration: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }),
  clients: z.object({ business_id: id, name: shortText, type: z.enum(["person", "organization"]), email: z.union([email, z.literal("")]), phone: z.string().trim().max(50), status: z.enum(["lead", "prospect", "active", "inactive"]), service_interest: z.string().trim().max(300), notes: text }),
  appointments: z.object({ business_id: id, client_id: id, service_id: id, title: shortText, scheduled_at: isoDate, status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]), location: z.string().trim().max(300), notes: text }),
  followups: z.object({ business_id: id, client_id: id, appointment_id: id.optional(), title: shortText, channel: z.enum(["email", "phone", "whatsapp", "meeting"]), due_at: isoDate, status: z.enum(["open", "in_progress", "done", "blocked"]), owner: shortText, notes: text }),
  services: z.object({ business_id: id, name: shortText, category: shortText, price: z.number().nonnegative().finite(), duration_minutes: z.number().int().positive().max(10080), active: z.boolean() }),
  payments: z.object({ business_id: id, client_id: id, service_id: id, appointment_id: id.optional(), amount: z.number().nonnegative().finite(), amount_paid: z.number().nonnegative().finite(), currency: z.literal("USD"), status: z.enum(["paid", "pending", "partial"]), due_at: isoDate, paid_at: isoDate.optional(), description: text }),
  faqs: z.object({ business_id: id, question: shortText, answer: text, tags: z.array(z.string().trim().min(1).max(80)).max(30) }),
  chatbot_logs: z.object({ business_id: id, user_email: email.optional(), visitor_name: shortText.optional(), visitor_phone: z.string().trim().max(50).optional(), visitor_email: email.optional(), service_interest: z.string().trim().max(300).optional(), message: z.string().trim().min(1).max(2000), response: z.string().trim().min(1).max(5000), created_client_id: id.optional(), created_appointment_id: id.optional() }),
} satisfies Record<Entity, z.ZodTypeAny>;

export function parseRecordInput<E extends Entity>(entity: E, value: unknown): RecordInput<E> {
  return createSchemas[entity].strict().parse(value) as unknown as RecordInput<E>;
}

export function parseRecordUpdate<E extends Entity>(entity: E, value: unknown): RecordUpdate<E> {
  const schema = createSchemas[entity] as z.ZodObject<z.ZodRawShape>;
  return schema.partial().strict().refine((body) => Object.keys(body).length > 0, "At least one field is required.").parse(value) as RecordUpdate<E>;
}
