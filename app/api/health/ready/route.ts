import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localActor, localPersistenceAllowed } from "@/lib/infrastructure/adapters/local-identity";
import { PostgresWorkspace } from "@/lib/infrastructure/adapters/postgres-workspace";
import { remotePersistenceAllowed } from "@/lib/infrastructure/adapters/remote-identity-policy";
import { workspacePool } from "@/lib/infrastructure/adapters/postgres-pool";

export async function GET() {
  try {
    if (remotePersistenceAllowed()) {
      // Metadata only: no identity impersonation and no customer data in health checks.
      const result=await workspacePool().query("select current_user = 'zqx_app' and to_regclass('zqx.organizations') is not null ready");
      if (!result.rows[0]?.ready) return NextResponse.json({status:"not_ready"},{status:503});
      return NextResponse.json({status:"ready",persistence:"postgresql"});
    }
    if (localPersistenceAllowed()) {
      await new PostgresWorkspace().snapshot(localActor(),"30000000-0000-0000-0000-000000000001");
      return NextResponse.json({status:"ready",mode:"development",persistence:"local-postgresql"});
    }
    const runtime = getRuntimeConfig();
    if (runtime.usesMemoryData) return NextResponse.json({ status: "ready", mode: runtime.mode });

    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ status: "not_ready" }, { status: 503 });
    const { error } = await supabase.from("businesses").select("id").limit(1);
    if (error) return NextResponse.json({ status: "not_ready" }, { status: 503 });
    return NextResponse.json({ status: "ready", mode: runtime.mode });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
