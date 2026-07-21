import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLocale, defaultLocale } from "@/lib/i18n/config";
import { collectPageEntities, sourceHash, type EntitySource } from "@/lib/translation/entities";
import { translateContent, TranslationValidationError } from "@/lib/translation/translate-content";

// Worker de traduction des boutiques (localized_content / translation_jobs,
// migration 00034 + 00038). Traducteur dédié (lib/translation/translate-content.ts),
// distinct de FLUX : ne génère jamais de contenu, ne fait que porter le
// contenu déjà écrit par le commerçant dans la langue cible.
//
// Sécurité : même convention que app/api/cron/admin-retention (Bearer
// CRON_SECRET), + service role Postgres (les fonctions SQL appelées ici sont
// révoquées pour authenticated/anon dans 00038).
//
// Déclenchement : cron externe (Vercel Cron / Supabase Cron / autre)
// appelant GET avec le header Authorization, à intervalle régulier (ex.
// toutes les 2 minutes). Chaque appel traite au plus MAX_JOBS_PER_RUN jobs
// pour rester sous la limite de durée d'une function serverless.

const MAX_JOBS_PER_RUN = 3;

type TranslationJobRow = {
  id: string;
  page_id: string;
  locale: string;
  source_version: number;
  attempts: number;
};

async function processJob(admin: ReturnType<typeof createAdminClient>, job: TranslationJobRow) {
  if (!hasLocale(job.locale)) {
    await admin.rpc("fail_translation_job", { job_id: job.id, error_message: `unknown_locale:${job.locale}` });
    return { jobId: job.id, status: "error" as const, translated: 0, skipped: 0 };
  }
  const locale = job.locale === defaultLocale ? defaultLocale : job.locale;

  try {
    const [entities, { data: published }] = await Promise.all([
      collectPageEntities(admin, job.page_id),
      admin
        .from("localized_content")
        .select("entity_type, entity_id, published_source_hash")
        .eq("page_id", job.page_id)
        .eq("locale", job.locale),
    ]);

    const publishedHashes = new Map(
      (published ?? []).map((row) => [`${row.entity_type}:${row.entity_id}`, row.published_source_hash])
    );

    const withHash = entities.map((entity) => ({ ...entity, hash: sourceHash(entity.fields) }));
    const toTranslate = withHash.filter(
      (entity) => publishedHashes.get(`${entity.entity_type}:${entity.entity_id}`) !== entity.hash
    );

    if (toTranslate.length === 0) {
      // Rien n'a changé depuis la dernière traduction publiée de cette
      // langue : le job existe (probablement une republication qui n'a pas
      // touché le contenu traduisible), on le clôture sans appel IA.
      await admin.rpc("complete_translation_job", { job_id: job.id, entities: [] });
      return { jobId: job.id, status: "completed" as const, translated: 0, skipped: withHash.length };
    }

    // Un seul appel IA pour toutes les entités à traduire de ce job : plus
    // rapide, moins coûteux, et translateContent valide la forme du lot
    // entier d'un coup (mêmes clés, mêmes longueurs de tableaux).
    const sourcePayload = toTranslate.map((entity) => entity.fields);
    const translatedPayload = await translateContent(sourcePayload, locale);

    const completedEntities: (EntitySource & { source_hash: string })[] = toTranslate.map((entity, i) => ({
      entity_type: entity.entity_type,
      entity_id: entity.entity_id,
      fields: translatedPayload[i],
      source_hash: entity.hash,
    }));

    await admin.rpc("complete_translation_job", { job_id: job.id, entities: completedEntities });
    return {
      jobId: job.id,
      status: "completed" as const,
      translated: completedEntities.length,
      skipped: withHash.length - completedEntities.length,
    };
  } catch (error) {
    const message =
      error instanceof TranslationValidationError
        ? `validation_error:${error.message}`
        : error instanceof Error
          ? error.message
          : "unknown_error";
    console.error("translate-jobs: job failed", { jobId: job.id, pageId: job.page_id, locale: job.locale, message });
    await admin.rpc("fail_translation_job", { job_id: job.id, error_message: message });
    return { jobId: job.id, status: "error" as const, translated: 0, skipped: 0, error: message };
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Reprise des jobs bloqués (worker mort en plein traitement) avant de
  // saisir de nouveaux jobs.
  await admin.rpc("reap_stalled_translation_jobs");

  const results: Awaited<ReturnType<typeof processJob>>[] = [];
  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const { data: job, error } = await admin.rpc("claim_translation_job");
    if (error) {
      console.error("translate-jobs: claim failed", error.message);
      break;
    }
    if (!job) break; // plus de job en attente
    results.push(await processJob(admin, job as TranslationJobRow));
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
