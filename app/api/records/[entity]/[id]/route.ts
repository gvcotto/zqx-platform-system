import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSystemUser } from "@/lib/auth";
import { deleteRecord, getRecord, isEntity, updateRecord } from "@/lib/core/crud";
import type { Entity, RecordUpdate } from "@/lib/core/types";

type RouteContext = {
  params: Promise<{ entity: string; id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  const record = getRecord(entity, id);

  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ record });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const record = updateRecord(entity, id, body as RecordUpdate<Entity>);

  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ record });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity, id } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  if (entity === "users") {
    const record = getRecord("users", id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (record.role === "zqx_owner") {
      return NextResponse.json({ error: "Owner account cannot be deleted." }, { status: 403 });
    }
  }

  const deleted = deleteRecord(entity, id);

  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
