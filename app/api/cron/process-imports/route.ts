import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyImportRow } from "@/lib/integrations/csv/import-writer";
import type { ImportEntityType } from "@/lib/integrations/csv/fields";

// Worker des imports CSV (import_jobs / import_rows, migration 00049).
// Même convention que app/api/cron/translate-jobs : Bearer CRON_SECRET,
// claim/complete via RPC security definer, boucle bornée par run pour
// rester sous la limite de durée d'une function serverless.
const MAX_JOBS_PER_RUN = 3;
const ROWS_PER_BATCH = 100;

type ImportJobRow = {
  id: string;
  page_id: string;
  entity_type: ImportEntityType;
  column_mapping: Record<string, string | null>;
};

type ImportRowRow = {
  id: number;
  row_number: number;
  raw_row: Record<string, string>;
};

async function processJob(admin: ReturnType<typeof createAdminClient>, job: ImportJobRow) {
  const { data: rows, error: claimError } = await admin.rpc("claim_import_rows", {
    p_job_id: job.id,
    p_batch_size: ROWS_PER_BATCH,
  });
  if (claimError) {
    console.error("process-imports: claim_import_rows failed", job.id, claimError.message);
    return { jobId: job.id, processed: 0 };
  }

  const batch = (rows ?? []) as ImportRowRow[];
  for (const row of batch) {
    const outcome = await applyImportRow(admin, job, row);
    const { error } = await admin.rpc("complete_import_row", {
      p_row_id: row.id,
      p_status: outcome.status,
      p_error_reason: outcome.reason ?? null,
    });
    if (error) console.error("process-imports: complete_import_row failed", row.id, error.message);
  }

  const { data: finalized } = await admin.rpc("finalize_import_job", { p_job_id: job.id });
  return { jobId: job.id, processed: batch.length, finalized: Boolean(finalized) };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin.rpc("reap_stalled_import_rows");

  const results: Awaited<ReturnType<typeof processJob>>[] = [];
  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const { data: job, error } = await admin.rpc("claim_import_job");
    if (error) {
      console.error("process-imports: claim_import_job failed", error.message);
      break;
    }
    if (!job) break;
    results.push(await processJob(admin, job as ImportJobRow));
  }

  return NextResponse.json({ ok: true, jobsProcessed: results.length, results });
}
