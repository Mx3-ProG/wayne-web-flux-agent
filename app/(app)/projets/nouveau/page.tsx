import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { projectLimit } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { CreatePageWizard } from "@/components/editor/create-page-wizard";

export const metadata = { title: "Nouveau projet" };

export default async function NouveauProjetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // Gate : au-delà de la limite du forfait, retour à l'espace projets.
  if ((count ?? 0) >= projectLimit((profile?.plan as Plan) ?? "basique")) {
    redirect("/projets");
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/projets" className="text-sm underline underline-offset-4">
        ← Mes projets
      </Link>
      <CreatePageWizard redirectTo="/espace" />
    </div>
  );
}
