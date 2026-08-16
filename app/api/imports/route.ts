import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActivePage } from "@/lib/integrations/require-page";
import { decodeCsvBuffer, parseCsv } from "@/lib/integrations/csv/parse";
import { proposeMapping } from "@/lib/integrations/csv/mapping";
import type { ImportEntityType } from "@/lib/integrations/csv/fields";

const ENTITY_TYPES: ImportEntityType[] = ["customers", "appointments", "products", "services"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Upload + analyse d'un CSV : détection délimiteur/encodage, lecture des
// en-têtes, proposition de mapping déterministe. N'écrit AUCUNE ligne en
// base — ça n'arrive qu'à la confirmation (/api/imports/[id]/confirm), une
// fois le mapping validé par l'utilisateur.
export async function POST(request: Request) {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file");
  const entityType = formData.get("entityType");
  if (!(file instanceof File) || typeof entityType !== "string" || !ENTITY_TYPES.includes(entityType as ImportEntityType)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { text, encoding } = decodeCsvBuffer(buffer);
  const { delimiter, headers, rows } = parseCsv(text);
  if (headers.length === 0 || rows.length === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      page_id: ctx.pageId,
      entity_type: entityType,
      status: "mapping",
      file_name: file.name.slice(0, 200),
      file_path: "", // renseigné juste après (dépend de l'id généré)
      detected_delimiter: delimiter,
      detected_encoding: encoding,
      headers,
      column_mapping: proposeMapping(headers, entityType as ImportEntityType),
      total_rows: rows.length,
    })
    .select("*")
    .single();
  if (jobError || !job) return NextResponse.json({ error: "job_creation_failed" }, { status: 500 });

  const filePath = `${ctx.userId}/${job.id}.csv`;
  const { error: uploadError } = await admin.storage.from("imports").upload(filePath, buffer, {
    contentType: "text/csv",
    upsert: true,
  });
  if (uploadError) {
    await admin.from("import_jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  await admin.from("import_jobs").update({ file_path: filePath }).eq("id", job.id);

  return NextResponse.json({
    job: { ...job, file_path: filePath },
    preview: rows.slice(0, 10),
  });
}

export async function GET() {
  const ctx = await requireActivePage();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("import_jobs")
    .select(
      "id, entity_type, status, file_name, total_rows, imported_rows, merged_rows, skipped_rows, error_rows, created_at, completed_at"
    )
    .eq("page_id", ctx.pageId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  return NextResponse.json({ jobs: data });
}
