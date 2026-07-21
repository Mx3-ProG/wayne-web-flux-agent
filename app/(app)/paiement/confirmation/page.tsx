import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/credit-packs";
import { PLAN_LABEL } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale, LOCALE_BCP47 } from "@/lib/i18n/config";
import styles from "./confirmation.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "billing")).meta.paymentConfirmationTitle };
}

export default async function PaymentConfirmation({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const locale = await getAccountLocale(supabase, user.id);
  const t = (await getDictionary(locale, "billing")).confirmation;
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
  const amount = session.amount_total == null ? null : (session.amount_total / 100).toLocaleString(LOCALE_BCP47[locale], { style: "currency", currency: session.currency?.toUpperCase() ?? "EUR" });

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={complete ? styles.success : processing ? styles.pending : styles.error}>
          {complete ? <CheckCircle2 /> : processing ? <Clock3 /> : <TriangleAlert />}
        </span>
        <p className={styles.eyebrow}>{t.securePayment}</p>
        <h1>{complete ? t.confirmedTitle : processing ? t.processingTitle : t.failedTitle}</h1>
        <p className={styles.lead}>
          {complete
            ? isCredits
              ? pack?.credits
                ? t.creditsAdding.replace("{credits}", String(pack.credits))
                : t.creditsAddingFallback
              : t.planActivating.replace("{plan}", plan ? PLAN_LABEL[plan] : "FLUX")
            : processing
              ? t.stripeProcessing
              : t.notActivated}
        </p>
        <dl>
          {amount && <div><dt>{t.amountLabel}</dt><dd>{amount}</dd></div>}
          <div><dt>{t.emailLabel}</dt><dd>{session.customer_details?.email ?? user.email ?? "—"}</dd></div>
          <div><dt>{t.referenceLabel}</dt><dd>{session.id.slice(-12)}</dd></div>
        </dl>
        <div className={styles.actions}>
          <Link href={isCredits ? "/credits" : "/compte/facturation"} className={`flux-button-smooth ${styles.primary}`}>
            {isCredits ? t.viewCredits : t.viewBilling}
          </Link>
          <Link href="/espace">{t.backToSpace}</Link>
        </div>
        <small>{t.webhookNote}</small>
      </section>
    </div>
  );
}
