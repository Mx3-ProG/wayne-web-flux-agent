import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { ImportCsvPanel } from "@/components/account/import-csv-panel";

export const metadata: Metadata = {
  title: "Importer des données — FLUX",
};

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) redirect("/projets/nouveau");

  const { data: jobs } = await supabase
    .from("import_jobs")
    .select(
      "id, entity_type, status, file_name, total_rows, imported_rows, merged_rows, skipped_rows, error_rows, created_at"
    )
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-xl font-medium">Importer des données</h1>
        <p className="text-sm text-muted-foreground">
          Migrez vos clients, rendez-vous, prestations ou produits depuis un autre outil, sans tout
          ressaisir à la main.
        </p>
      </header>

      <ImportCsvPanel />

      {jobs && jobs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Imports précédents</h2>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{job.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {job.entity_type} · {job.status}
                  </span>
                </div>
                {job.status === "completed" && (
                  <span className="text-xs text-muted-foreground">
                    {job.imported_rows} importées · {job.merged_rows} fusionnées ·{" "}
                    {job.skipped_rows} ignorées · {job.error_rows} erreurs
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
