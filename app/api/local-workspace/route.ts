import { NextResponse } from "next/server";
import { WorkspaceService } from "@/lib/application/workspace";
import { PostgresWorkspace } from "@/lib/infrastructure/adapters/postgres-workspace";
import { localActor, localPersistenceAllowed } from "@/lib/infrastructure/adapters/local-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const LOCAL_ORGANIZATION = "30000000-0000-0000-0000-000000000001";
const service = new WorkspaceService(new PostgresWorkspace());
function allowedRequest(request: Request) {
  return localPersistenceAllowed() && ["localhost:3012","127.0.0.1:3012"].includes(request.headers.get("host") || "");
}
export async function GET(request: Request) {
  if (!allowedRequest(request)) return new NextResponse(null, {status:404});
  try {
    return NextResponse.json(await service.snapshot(localActor(),LOCAL_ORGANIZATION),{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Local PostgreSQL workspace unavailable."},{status:503}); }
}
export async function POST(request: Request) {
  if (!allowedRequest(request)) return new NextResponse(null,{status:404});
  // Browser requests must be same-origin; no user or actor supplied in request data.
  if (request.headers.get("origin")!=="http://"+request.headers.get("host")) return new NextResponse(null,{status:403});
  if (Number(request.headers.get("content-length") || 0)>16000) return new NextResponse(null,{status:413});
  try {
    const text=await request.text();
    if(text.length>16000) return new NextResponse(null,{status:413});
    const input=JSON.parse(text);
    if(input.organizationId!==LOCAL_ORGANIZATION) return new NextResponse(null,{status:403});
    return NextResponse.json(await service.save(localActor(),input),{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Database rejected the change. Check references, role and invoice balance."},{status:400}); }
}
