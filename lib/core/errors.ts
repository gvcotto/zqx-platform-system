import type { Entity } from "@/lib/core/types";

export type DataOperation = "list" | "get" | "create" | "update" | "delete";

export class DataBackendError extends Error {
  readonly code = "DATA_BACKEND_UNAVAILABLE";
  readonly status = 503;

  constructor(readonly operation: DataOperation, readonly entity: Entity, options?: { cause?: unknown }) {
    super(`The data service could not complete ${operation} for ${entity}.`, options);
    this.name = "DataBackendError";
  }
}
