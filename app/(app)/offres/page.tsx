import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgePercent, Flame, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Offer, Plan } from "@/lib/types";
import { offerLimit } from "@/lib/plans";
import { OffersManager } from "./offers-manager";
import styles from "./offres-redesign.module.css";

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

  const plan = (profile?.plan as Plan) ?? "basique";
  const activeOffers = offers.filter((offer) => offer.draft_status !== "deleted");

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.overline}>
          <Flame aria-hidden="true" />
          Vitrine de désir
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <BadgePercent />
        </div>
        <h1>
          Offres qui <span>vendent</span>
        </h1>
        <p>
          Construis des offres claires, désirables et prêtes à convertir. Rouge,
          rose, noir : chaque carte doit donner envie de cliquer, commander, puis
          revenir.
        </p>
        <div className={styles.heroCount}>
          <HeartHandshake aria-hidden="true" />
          <strong>{activeOffers.length}</strong>
          <span>offre{activeOffers.length > 1 ? "s" : ""} en vitrine</span>
        </div>
      </header>

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
