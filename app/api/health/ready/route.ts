import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
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
