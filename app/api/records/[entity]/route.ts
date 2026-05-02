import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSystemUser } from "@/lib/auth";
import { createRecord, isEntity, listRecords } from "@/lib/core/crud";
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

  return NextResponse.json({ records: listRecords(entity, filtersFromRequest(request) as RecordFilters<Entity>) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentSystemUser();
  const { entity } = await context.params;

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isEntity(entity)) return NextResponse.json({ error: "Invalid entity." }, { status: 404 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const record = createRecord(entity, body as RecordInput<Entity>);
  return NextResponse.json({ record }, { status: 201 });
}
