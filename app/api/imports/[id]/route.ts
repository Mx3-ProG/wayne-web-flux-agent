import { NextResponse } from "next/server";
import { requireActivePage } from "@/lib/integrations/require-page";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: job, error } = await ctx.supabase
    .from("import_jobs")
    .select("*")
    .eq("id", id)
    .eq("page_id", ctx.pageId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: errorRows } = await ctx.supabase
    .from("import_rows")
    .select("row_number, error_reason")
    .eq("import_job_id", id)
    .eq("status", "error")
    .order("row_number")
    .limit(50);

  return NextResponse.json({ job, errorRows: errorRows ?? [] });
}

// Annulation : uniquement tant qu'aucune ligne n'a encore été écrite en base
// (cf. INTEGRATIONS_PLAN.md § E — pas de rollback destructif automatique
// une fois le traitement commencé).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: job } = await ctx.supabase
    .from("import_jobs")
    .select("id, status")
    .eq("id", id)
    .eq("page_id", ctx.pageId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["uploaded", "mapping", "ready"].includes(job.status)) {
    return NextResponse.json({ error: "cannot_cancel" }, { status: 409 });
  }

  const { error } = await ctx.supabase.from("import_jobs").update({ status: "cancelled" }).eq("id", id);
  if (error) return NextResponse.json({ error: "cancel_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
