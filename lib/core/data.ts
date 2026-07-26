import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createRecord as createMemoryRecord,
  deleteRecord as deleteMemoryRecord,
  getRecord as getMemoryRecord,
  listRecords as listMemoryRecords,
  updateRecord as updateMemoryRecord,
} from "@/lib/core/crud";
import type { Entity, RecordFilters, RecordFor, RecordInput, RecordUpdate } from "@/lib/core/types";

const numericFields: Partial<Record<Entity, string[]>> = {
  services: ["price", "duration_minutes"],
  payments: ["amount", "amount_paid"],
};

function useSupabaseBackend() {
  return process.env.ZQX_DATA_BACKEND === "supabase";
}

function normalizeValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matches<E extends Entity>(record: RecordFor<E>, filters?: RecordFilters<E>) {
  if (!filters) return true;

  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === "") return true;
    const recordValue = (record as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      return value.map(normalizeValue).includes(normalizeValue(recordValue));
    }

    return normalizeValue(recordValue) === normalizeValue(value);
  });
}

function normalizeRecord<E extends Entity>(entity: E, record: Record<string, unknown>) {
  const normalized = { ...record };

  for (const field of numericFields[entity] ?? []) {
    if (normalized[field] !== null && normalized[field] !== undefined) {
      normalized[field] = Number(normalized[field]);
    }
  }

  return normalized as RecordFor<E>;
}

function newId(entity: Entity) {
  return `${entity.slice(0, 4)}-${globalThis.crypto.randomUUID()}`;
}

async function getSupabaseDataClient() {
  if (!useSupabaseBackend()) return null;
  return createSupabaseServerClient();
}

function scopedFallback<E extends Entity>(entity: E, filters?: RecordFilters<E>) {
  return listMemoryRecords(entity, filters);
}

export async function listRecordsAsync<E extends Entity>(entity: E, filters?: RecordFilters<E>) {
  const supabase = await getSupabaseDataClient();

  if (!supabase) return scopedFallback(entity, filters);

  let query = supabase.from(entity).select("*");

  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      query = query.in(key, value.map(String));
    } else {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[zqx-data] Supabase list failed for ${entity}:`, error.message);
    return scopedFallback(entity, filters);
  }

  return (data ?? []).map((record) => normalizeRecord(entity, record)).filter((record) => matches(record, filters));
}

export async function getRecordAsync<E extends Entity>(entity: E, id: string) {
  const supabase = await getSupabaseDataClient();

  if (!supabase) return getMemoryRecord(entity, id);

  const { data, error } = await supabase.from(entity).select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error(`[zqx-data] Supabase get failed for ${entity}/${id}:`, error.message);
    return getMemoryRecord(entity, id);
  }

  return data ? normalizeRecord(entity, data) : null;
}

export async function createRecordAsync<E extends Entity>(entity: E, data: RecordInput<E>) {
  const supabase = await getSupabaseDataClient();

  if (!supabase) return createMemoryRecord(entity, data);

  const now = new Date().toISOString();
  const payload = {
    ...data,
    id: data.id ?? newId(entity),
    created_at: data.created_at ?? now,
    updated_at: data.updated_at ?? now,
  };
  const { data: created, error } = await supabase.from(entity).insert(payload).select("*").single();

  if (error) {
    console.error(`[zqx-data] Supabase create failed for ${entity}:`, error.message);
    return createMemoryRecord(entity, data);
  }

  return normalizeRecord(entity, created);
}

export async function updateRecordAsync<E extends Entity>(entity: E, id: string, data: RecordUpdate<E>) {
  const supabase = await getSupabaseDataClient();

  if (!supabase) return updateMemoryRecord(entity, id, data);

  const payload = { ...data, updated_at: new Date().toISOString() };
  const { data: updated, error } = await supabase.from(entity).update(payload).eq("id", id).select("*").maybeSingle();

  if (error) {
    console.error(`[zqx-data] Supabase update failed for ${entity}/${id}:`, error.message);
    return updateMemoryRecord(entity, id, data);
  }

  return updated ? normalizeRecord(entity, updated) : null;
}

export async function deleteRecordAsync<E extends Entity>(entity: E, id: string) {
  const supabase = await getSupabaseDataClient();

  if (!supabase) return deleteMemoryRecord(entity, id);

  const { error } = await supabase.from(entity).delete().eq("id", id);

  if (error) {
    console.error(`[zqx-data] Supabase delete failed for ${entity}/${id}:`, error.message);
    return deleteMemoryRecord(entity, id);
  }

  return true;
}
