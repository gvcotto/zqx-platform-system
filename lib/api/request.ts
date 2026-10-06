import { NextResponse } from "next/server";
import { z } from "zod";
import { DataBackendError } from "@/lib/core/errors";
import { RuntimeConfigurationError } from "@/lib/runtime-config";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413, message: string) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export async function readJsonBody(request: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestBodyError(413, "Request body is too large.");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new RequestBodyError(413, "Request body is too large.");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new RequestBodyError(400, "Invalid JSON body.");
  }
}

export function toApiErrorResponse(error: unknown) {
  if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request data.", issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  }
  if (error instanceof DataBackendError || error instanceof RuntimeConfigurationError) {
    console.error(`[zqx-api] ${error.name}: ${error.message}`);
    return NextResponse.json({ error: "Service unavailable.", code: error.code }, { status: 503 });
  }
  console.error("[zqx-api] Unexpected request failure.", error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
