import type { SystemUser } from "@/lib/core/selectors";
import type { Entity, RecordFilters, RecordFor, RecordInput, RecordUpdate } from "@/lib/core/types";

const businessScopedEntities = new Set<Entity>([
  "users",
  "business_modules",
  "clients",
  "appointments",
  "followups",
  "services",
  "payments",
  "faqs",
  "chatbot_logs",
]);

const platformManagedEntities = new Set<Entity>(["businesses", "modules", "business_modules", "users"]);

function hasBusinessId(record: unknown): record is { business_id: string } {
  return typeof record === "object" && record !== null && "business_id" in record;
}

export function scopedFilters<E extends Entity>(user: SystemUser, entity: E, filters: RecordFilters<E>) {
  if (user.isZqxAdmin) return filters;

  if (entity === "businesses") {
    return { ...filters, id: user.businessId } as RecordFilters<E>;
  }

  if (businessScopedEntities.has(entity)) {
    return { ...filters, business_id: user.businessId } as RecordFilters<E>;
  }

  return filters;
}

export function canReadRecord<E extends Entity>(user: SystemUser, entity: E, record: RecordFor<E>) {
  if (user.isZqxAdmin || entity === "modules") return true;
  if (entity === "businesses") return record.id === user.businessId;
  if (hasBusinessId(record)) return record.business_id === user.businessId;
  return false;
}

export function canWriteEntity(user: SystemUser, entity: Entity) {
  if (user.isZqxAdmin) return true;
  if (user.role === "viewer") return false;
  if (platformManagedEntities.has(entity)) return false;
  return businessScopedEntities.has(entity);
}

export function scopedInput<E extends Entity>(user: SystemUser, entity: E, input: RecordInput<E>) {
  if (user.isZqxAdmin || !businessScopedEntities.has(entity)) return input;
  return { ...input, business_id: user.businessId } as RecordInput<E>;
}

export function scopedUpdate<E extends Entity>(user: SystemUser, entity: E, input: RecordUpdate<E>) {
  if (user.isZqxAdmin || !businessScopedEntities.has(entity)) return input;
  const { business_id: _businessId, ...rest } = input as Record<string, unknown>;
  return rest as RecordUpdate<E>;
}
