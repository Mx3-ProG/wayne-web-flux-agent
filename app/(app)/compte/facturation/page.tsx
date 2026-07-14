import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LABEL, PLAN_LIMITS } from "@/lib/plans";
import type { Plan, Profile } from "@/lib/types";
import { openBillingPortal } from "./actions";
import styles from "./facturation.module.css";

export const metadata = { title: "Facturation" };

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  trialing: "Période d’essai",
  past_due: "Paiement à régulariser",
  unpaid: "Impayé",
  canceled: "Résilié",
  incomplete: "Activation incomplète",
  incomplete_expired: "Activation expirée",
  paused: "Suspendu",
};

export default async function BillingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id, subscription_status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .single<Pick<Profile, "plan" | "stripe_customer_id" | "subscription_status" | "current_period_end" | "cancel_at_period_end">>();
  const params = await searchParams;
  const plan = (profile?.plan ?? "basique") as Plan;
  const status = profile?.subscription_status ?? null;
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className={styles.page}>
      <header><p>Compte</p><h1>Facturation</h1><span>Ton abonnement, tes échéances et tes factures au même endroit.</span></header>
      {params.erreur && <div className={styles.notice}>Le portail de facturation est momentanément indisponible.</div>}
      <section className={styles.card}>
        <div><small>Formule actuelle</small><h2>{status ? PLAN_LABEL[plan] : "Aucune formule active"}</h2></div>
        {status && <span className={status === "past_due" ? styles.warning : styles.status}>{STATUS_LABEL[status] ?? status}</span>}
        {status && (
          <dl>
            <div><dt>Tarif</dt><dd>{PLAN_LIMITS[plan].priceEur} € / mois</dd></div>
            <div><dt>Crédits inclus</dt><dd>{PLAN_LIMITS[plan].monthlyCredits} par facture payée</dd></div>
            <div><dt>{profile?.cancel_at_period_end ? "Fin d’accès prévue" : "Prochaine échéance"}</dt><dd>{periodEnd ?? "À confirmer"}</dd></div>
          </dl>
        )}
        {profile?.stripe_customer_id ? (
          <form action={openBillingPortal}><button type="submit">Gérer l’abonnement et les factures</button></form>
        ) : (
          <Link className={styles.button} href="/formules">Choisir une formule</Link>
        )}
        <p className={styles.help}>Le portail sécurisé Stripe permet de modifier le moyen de paiement, télécharger les factures, changer de formule ou résilier.</p>
      </section>
      <Link className={styles.back} href="/compte">← Retour au profil</Link>
    </div>
  );
}
