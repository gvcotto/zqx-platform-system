import { NextResponse } from "next/server";
import { remoteContext } from "@/lib/infrastructure/adapters/remote-identity";
import { remotePersistenceAllowed } from "@/lib/infrastructure/adapters/remote-identity-policy";
import { WorkspaceService } from "@/lib/application/workspace";
import { PostgresWorkspace } from "@/lib/infrastructure/adapters/postgres-workspace";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const service=new WorkspaceService(new PostgresWorkspace());
export async function GET(request:Request) {
 if(!remotePersistenceAllowed()) return new NextResponse(null,{status:404});
 try {
  const context=await remoteContext();const org=new URL(request.url).searchParams.get("organizationId");
  if(!org||!context.organizations.some(o=>o.id===org)) return new NextResponse(null,{status:403});
  return NextResponse.json(await service.snapshot(context.actor,org),{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Workspace access unavailable."},{status:403});}
}
export async function POST(request:Request) {
 if(!remotePersistenceAllowed()) return new NextResponse(null,{status:404});
 if(request.headers.get("origin")!==new URL(request.url).origin) return new NextResponse(null,{status:403});
 if(Number(request.headers.get("content-length")||0)>16000) return new NextResponse(null,{status:413});
 try {
  const context=await remoteContext();const text=await request.text();if(text.length>16000) return new NextResponse(null,{status:413});
  const command=JSON.parse(text);
  if(!context.organizations.some(o=>o.id===command.organizationId)) return new NextResponse(null,{status:403});
  return NextResponse.json(await service.save(context.actor,command),{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Change rejected. Check access, references and invoice balance."},{status:400});}
}
