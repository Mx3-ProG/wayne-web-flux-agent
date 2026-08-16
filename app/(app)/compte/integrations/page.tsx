import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { listIntegrationsForPage } from "@/lib/integrations/list-for-page";
import { IntegrationsPanel } from "@/components/account/integrations-panel";

export const metadata: Metadata = {
  title: "Intégrations — FLUX",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "La connexion a échoué (session expirée) — réessayez.",
  connection_failed: "La connexion a échoué. Réessayez dans quelques instants.",
  unsupported_provider: "Ce fournisseur n'est pas disponible.",
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = await getActivePageId(supabase, user.id);
  const entries = pageId ? await listIntegrationsForPage(supabase, pageId) : [];
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-xl font-medium">Intégrations</h1>
        <p className="text-sm text-muted-foreground">
          Connectez les outils que vous utilisez déjà — FLUX se charge de garder tout synchronisé.
        </p>
      </header>

      {params.connected && (
        <p className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-700">Connexion réussie.</p>
      )}
      {params.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[params.error] ?? "Une erreur est survenue."}
        </p>
      )}

      <IntegrationsPanel initialEntries={entries} />
    </div>
  );
}
