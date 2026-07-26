import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSystemUser } from "@/lib/auth";
import { canReadRecord, canWriteEntity, scopedUpdate } from "@/lib/core/access";
import { isEntity } from "@/lib/core/crud";
import { deleteRecordAsync, getRecordAsync, updateRecordAsync } from "@/lib/core/data";
import type { Entity, RecordUpdate } from "@/lib/core/types";

type RouteContext = {
  params: Promise<{ entity: string; id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  const record = await getRecordAsync(entity, id);

  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canReadRecord(user, entity, record)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  return NextResponse.json({ record });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });
  if (!canWriteEntity(user, entity)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const existing = await getRecordAsync(entity, id);

  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canReadRecord(user, entity, existing)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const record = await updateRecordAsync(entity, id, scopedUpdate(user, entity, body as RecordUpdate<Entity>));

  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ record });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });
  if (!canWriteEntity(user, entity)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const existing = await getRecordAsync(entity, id);

  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canReadRecord(user, entity, existing)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (entity === "users") {
    const record = await getRecordAsync("users", id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (record.role === "zqx_owner") {
      return NextResponse.json({ error: "Owner account cannot be deleted." }, { status: 403 });
    }
  }

  const deleted = await deleteRecordAsync(entity, id);

  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
