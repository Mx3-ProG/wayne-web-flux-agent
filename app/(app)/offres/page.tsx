import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgePercent, Flame, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { Offer, Plan } from "@/lib/types";
import { offerLimit } from "@/lib/plans";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { OffersManager } from "./offers-manager";
import styles from "./offres-redesign.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "offers")).meta.title };
}

export default async function OffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, page, locale] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    getActivePage(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "offers");

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
          {t.hero.kicker}
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <BadgePercent />
        </div>
        <h1>
          {t.hero.titleStart} <span>{t.hero.titleEm}</span>
        </h1>
        <p>{t.hero.text}</p>
        <div className={styles.heroCount}>
          <HeartHandshake aria-hidden="true" />
          <strong>{activeOffers.length}</strong>
          <span>{activeOffers.length > 1 ? t.hero.countPlural : t.hero.countSingular}</span>
        </div>
      </header>

      {!page ? (
        <div className={styles.empty}>
          {t.hero.emptyStart} <Link href="/ma-page">{t.hero.emptyLink}</Link>{" "}
          {t.hero.emptyEnd}
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
          t={t}
        />
      )}
    </div>
  );
}
