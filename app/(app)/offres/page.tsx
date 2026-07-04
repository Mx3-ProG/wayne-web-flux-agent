import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Offer, Plan } from "@/lib/types";
import { offerLimit } from "@/lib/plans";
import { OffersManager } from "./offers-manager";
import styles from "./offres.module.css";

export const metadata = { title: "Mes offres" };

export default async function OffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, page] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    getActivePage(supabase, user.id),
  ]);

  let offers: Offer[] = [];
  let balance = 0;
  let nextVersion = 1;
  let pageHasDraft = false;
  if (page) {
    const [{ data }, { data: bal }, { data: lastVersion }] = await Promise.all([
      supabase.from("offers").select("*").eq("page_id", page.id).order("position"),
      supabase.rpc("credit_balance", { uid: user.id }),
      supabase
        .from("page_versions")
        .select("version")
        .eq("page_id", page.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle<{ version: number }>(),
    ]);
    offers = (data ?? []) as Offer[];
    balance = bal ?? 0;
    nextVersion = (lastVersion?.version ?? 0) + 1;
    pageHasDraft = page.draft != null;
  }

  const plan = (profile?.plan as Plan) ?? "free";

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Ta vitrine</p>
      <h1 className={styles.title}>Mes offres</h1>
      <p className={styles.subtitle}>
        Tes promos mises en avant en grand tout en haut de ta vitrine. Un client
        clique, il commande, tu reçois la commande dans ton espace. Tes
        changements partent en brouillon : publie une nouvelle version pour les
        mettre en ligne.
      </p>

      {!page ? (
        <div className={styles.empty}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> pour ajouter des
          offres.
        </div>
      ) : (
        <OffersManager
          initialOffers={offers}
          userId={user.id}
          plan={plan}
          limit={offerLimit(plan)}
          pageId={page.id}
          balance={balance}
          nextVersion={nextVersion}
          pageHasDraft={pageHasDraft}
        />
      )}
    </div>
  );
}
