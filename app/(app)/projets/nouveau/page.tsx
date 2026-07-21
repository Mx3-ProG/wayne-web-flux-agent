import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { projectLimit } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { CreatePageWizard } from "@/components/editor/create-page-wizard";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "projects")).meta.newTitle };
}

export default async function NouveauProjetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }, locale] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "projects");

  // Gate : au-delà de la limite du forfait, retour à l'espace projets.
  if ((count ?? 0) >= projectLimit((profile?.plan as Plan) ?? "basique")) {
    redirect("/projets");
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/projets" className="text-sm underline underline-offset-4">
        {t.backToProjects}
      </Link>
      <CreatePageWizard redirectTo="/espace" />
    </div>
  );
}
