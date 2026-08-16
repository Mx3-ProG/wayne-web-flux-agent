import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActivePage } from "@/lib/integrations/require-page";
import { decodeCsvBuffer, parseCsv } from "@/lib/integrations/csv/parse";
import { missingRequiredFields } from "@/lib/integrations/csv/mapping";
import type { ImportEntityType } from "@/lib/integrations/csv/fields";

const INSERT_BATCH_SIZE = 500;

// Valide le mapping, relit le fichier stocké, matérialise une ligne
// import_rows par ligne CSV, puis passe le job à 'ready' pour que le worker
// cron (app/api/cron/process-imports) prenne le relais — aucun traitement
// long dans cette requête HTTP.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: job } = await ctx.supabase
    .from("import_jobs")
    .select("id, status, entity_type, column_mapping, file_path")
    .eq("id", id)
    .eq("page_id", ctx.pageId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (job.status !== "mapping") {
    return NextResponse.json({ error: "cannot_confirm" }, { status: 409 });
  }

  const entityType = job.entity_type as ImportEntityType;
  const mapping = (job.column_mapping ?? {}) as Record<string, string | null>;
  const missing = missingRequiredFields(mapping, entityType);
  if (missing.length > 0) {
    return NextResponse.json({ error: "missing_required_fields", fields: missing }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: fileBlob, error: downloadError } = await admin.storage.from("imports").download(job.file_path);
  if (downloadError || !fileBlob) return NextResponse.json({ error: "file_unavailable" }, { status: 500 });

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const { text } = decodeCsvBuffer(buffer);
  const { rows } = parseCsv(text);
  if (rows.length === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE).map((raw_row, offset) => ({
      import_job_id: id,
      row_number: i + offset + 1,
      raw_row,
    }));
    const { error: insertError } = await admin.from("import_rows").insert(batch);
    if (insertError) {
      await admin.from("import_rows").delete().eq("import_job_id", id);
      return NextResponse.json({ error: "row_insert_failed" }, { status: 500 });
    }
  }

  const { error: updateError } = await admin
    .from("import_jobs")
    .update({ status: "ready", total_rows: rows.length })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: "update_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, totalRows: rows.length });
}
