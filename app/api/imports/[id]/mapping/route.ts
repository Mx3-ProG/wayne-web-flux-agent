import { NextResponse } from "next/server";
import { requireActivePage } from "@/lib/integrations/require-page";
import { fieldsForEntity, type ImportEntityType } from "@/lib/integrations/csv/fields";
import { missingRequiredFields } from "@/lib/integrations/csv/mapping";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { mapping?: Record<string, string | null> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.mapping || typeof body.mapping !== "object") {
    return NextResponse.json({ error: "invalid_mapping" }, { status: 400 });
  }

  const { data: job } = await ctx.supabase
    .from("import_jobs")
    .select("id, status, entity_type, headers")
    .eq("id", id)
    .eq("page_id", ctx.pageId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["uploaded", "mapping"].includes(job.status)) {
    return NextResponse.json({ error: "cannot_edit_mapping" }, { status: 409 });
  }

  const entityType = job.entity_type as ImportEntityType;
  const validFieldKeys = new Set(fieldsForEntity(entityType).map((f) => f.key));
  const headerSet = new Set<string>(job.headers ?? []);
  const mapping: Record<string, string | null> = {};
  for (const [header, field] of Object.entries(body.mapping)) {
    if (!headerSet.has(header)) continue;
    mapping[header] = field && validFieldKeys.has(field) ? field : null;
  }

  const { error } = await ctx.supabase
    .from("import_jobs")
    .update({ column_mapping: mapping, status: "mapping" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    mapping,
    missingRequired: missingRequiredFields(mapping, entityType),
  });
}
