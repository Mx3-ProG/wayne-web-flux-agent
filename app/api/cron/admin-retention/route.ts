import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { error } = await admin.rpc("purge_admin_telemetry");
  if (error) return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

