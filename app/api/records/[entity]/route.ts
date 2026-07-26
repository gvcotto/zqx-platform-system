import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSystemUser } from "@/lib/auth";
import { canWriteEntity, scopedFilters, scopedInput } from "@/lib/core/access";
import { isEntity } from "@/lib/core/crud";
import { createRecordAsync, listRecordsAsync } from "@/lib/core/data";
import type { Entity, RecordFilters, RecordInput } from "@/lib/core/types";

type RouteContext = {
  params: Promise<{ entity: string }>;
};

function filtersFromRequest(request: NextRequest) {
  const filters: Record<string, string | string[]> = {};

  request.nextUrl.searchParams.forEach((value, key) => {
    const existing = filters[key];
    filters[key] = existing ? (Array.isArray(existing) ? [...existing, value] : [existing, value]) : value;
  });

  return filters;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  const filters = scopedFilters(user, entity, filtersFromRequest(request) as RecordFilters<Entity>);
  return NextResponse.json({ records: await listRecordsAsync(entity, filters) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });
  if (!canWriteEntity(user, entity)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const record = await createRecordAsync(entity, scopedInput(user, entity, body as RecordInput<Entity>));
  return NextResponse.json({ record }, { status: 201 });
}
