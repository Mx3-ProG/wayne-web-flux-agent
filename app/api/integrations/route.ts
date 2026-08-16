import { NextResponse } from "next/server";
import { requireActivePage } from "@/lib/integrations/require-page";
import { listIntegrationsForPage } from "@/lib/integrations/list-for-page";

export async function GET() {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const integrations = await listIntegrationsForPage(ctx.supabase, ctx.pageId);
  return NextResponse.json({ integrations });
}
