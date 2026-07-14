import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/credit-packs";
import { PLAN_LABEL } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import styles from "./confirmation.module.css";

export const metadata = { title: "Confirmation du paiement" };

export default async function PaymentConfirmation({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  const stripe = getStripe();
  if (!stripe || !sessionId || !sessionId.startsWith("cs_")) redirect("/espace");

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    redirect("/espace");
  }
  if (session.client_reference_id !== user.id && session.metadata?.user_id !== user.id) {
    redirect("/espace");
  }

  const isCredits = session.metadata?.kind === "credits";
  const pack = isCredits && session.metadata?.pack_id ? getPack(session.metadata.pack_id) : null;
  const plan = session.metadata?.plan as Plan | undefined;
  const complete = session.status === "complete" &&
    (session.mode === "subscription" || session.payment_status === "paid");
  const processing = session.status === "complete" && !complete;
  const amount = session.amount_total == null ? null : (session.amount_total / 100).toLocaleString("fr-FR", { style: "currency", currency: session.currency?.toUpperCase() ?? "EUR" });

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={complete ? styles.success : processing ? styles.pending : styles.error}>
          {complete ? <CheckCircle2 /> : processing ? <Clock3 /> : <TriangleAlert />}
        </span>
        <p className={styles.eyebrow}>Paiement sécurisé Stripe</p>
        <h1>{complete ? "C’est confirmé." : processing ? "Paiement en cours." : "Paiement non finalisé."}</h1>
        <p className={styles.lead}>
          {complete
            ? isCredits
              ? `${pack?.credits ?? "Tes"} crédits sont en cours d’ajout à ton solde.`
              : `Ta formule ${plan ? PLAN_LABEL[plan] : "FLUX"} est en cours d’activation.`
            : processing
              ? "Stripe finalise le paiement. Ton accès sera mis à jour automatiquement."
              : "Aucun accès n’est activé depuis cette page. Tu peux reprendre le parcours en toute sécurité."}
        </p>
        <dl>
          {amount && <div><dt>Montant</dt><dd>{amount}</dd></div>}
          <div><dt>E-mail</dt><dd>{session.customer_details?.email ?? user.email ?? "—"}</dd></div>
          <div><dt>Référence</dt><dd>{session.id.slice(-12)}</dd></div>
        </dl>
        <div className={styles.actions}>
          <Link href={isCredits ? "/credits" : "/compte/facturation"} className={styles.primary}>
            {isCredits ? "Voir mes crédits" : "Voir ma facturation"}
          </Link>
          <Link href="/espace">Retour à mon espace</Link>
        </div>
        <small>L’activation est effectuée par les notifications sécurisées Stripe, même si tu fermes cette page.</small>
      </section>
    </div>
  );
}
