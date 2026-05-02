import { entities, type Entity, type RecordFilters, type RecordFor, type RecordInput, type Records, type RecordUpdate } from "@/lib/core/types";
import { seedRecords } from "@/lib/core/seed";

declare global {
  // eslint-disable-next-line no-var
  var __zqxSystemStore: Records | undefined;
  // eslint-disable-next-line no-var
  var __zqxSystemCounter: number | undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStore() {
  globalThis.__zqxSystemStore ??= clone(seedRecords);
  globalThis.__zqxSystemCounter ??= 1000;
  return globalThis.__zqxSystemStore;
}

function nextId(entity: Entity) {
  globalThis.__zqxSystemCounter = (globalThis.__zqxSystemCounter ?? 1000) + 1;
  return `${entity.slice(0, 4)}-${globalThis.__zqxSystemCounter}`;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matches<E extends Entity>(record: RecordFor<E>, filters?: RecordFilters<E>) {
  if (!filters) return true;

  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === "") return true;
    const recordValue = (record as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      return value.map(normalize).includes(normalize(recordValue));
    }

    return normalize(recordValue) === normalize(value);
  });
}

export function isEntity(value: string): value is Entity {
  return (entities as readonly string[]).includes(value);
}

export function listRecords<E extends Entity>(entity: E, filters?: RecordFilters<E>) {
  const records = getStore()[entity] as RecordFor<E>[];
  return clone(records.filter((record) => matches(record, filters)));
}

export function getRecord<E extends Entity>(entity: E, id: string) {
  const records = getStore()[entity] as RecordFor<E>[];
  const record = records.find((item) => item.id === id);
  return record ? clone(record) : null;
}

export function createRecord<E extends Entity>(entity: E, data: RecordInput<E>) {
  const now = new Date().toISOString();
  const record = {
    ...data,
    id: data.id ?? nextId(entity),
    created_at: data.created_at ?? now,
    updated_at: data.updated_at ?? now,
  } as RecordFor<E>;

  const records = getStore()[entity] as RecordFor<E>[];
  records.push(record);

  return clone(record);
}

export function updateRecord<E extends Entity>(entity: E, id: string, data: RecordUpdate<E>) {
  const records = getStore()[entity] as RecordFor<E>[];
  const index = records.findIndex((item) => item.id === id);

  if (index === -1) return null;

  const current = records[index];
  const updated = {
    ...current,
    ...data,
    id: current.id,
    created_at: current.created_at,
    updated_at: new Date().toISOString(),
  } as RecordFor<E>;

  records[index] = updated;
  return clone(updated);
}

export function deleteRecord<E extends Entity>(entity: E, id: string) {
  const records = getStore()[entity] as RecordFor<E>[];
  const index = records.findIndex((item) => item.id === id);

  if (index === -1) return false;

  records.splice(index, 1);
  return true;
}
