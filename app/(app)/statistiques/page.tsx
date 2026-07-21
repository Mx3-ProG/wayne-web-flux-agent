import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { PageEventKind, PageSubscriber } from "@/lib/types";
import { Activity, Download, LineChart } from "lucide-react";
import { StatsTunnel } from "@/components/stats/stats-tunnel";
import styles from "./statistiques.module.css";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";
import { defaultLocale, type Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "analytics")).meta.title };
}

const DAY_MS = 86_400_000;

type EventRow = { kind: PageEventKind; created_at: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function countSince(
  events: EventRow[],
  kind: PageEventKind,
  days: number,
  now: number
): number {
  const since = now - days * DAY_MS;
  return events.filter(
    (e) => e.kind === kind && new Date(e.created_at).getTime() >= since
  ).length;
}

// Chargement + agrégats hors du composant (la règle de pureté React interdit
// Date.now() dans le rendu, même côté serveur).
async function loadStats(supabase: SupabaseServer, pageId: string, locale: Locale) {
  const now = Date.now();
  const since = new Date(now - 30 * DAY_MS).toISOString();
  const [{ data: rawEvents }, { data: rawSubscribers }] = await Promise.all([
    supabase
      .from("page_events")
      .select("kind, created_at")
      .eq("page_id", pageId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000),
    supabase
      .from("page_subscribers")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false }),
  ]);
  const events = (rawEvents ?? []) as EventRow[];
  const subscribers = (rawSubscribers ?? []) as PageSubscriber[];

  // Visites par jour sur 14 jours, pour la petite barre.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = start.getTime() + DAY_MS;
    days.push({
      label: formatDate(locale, start, { day: "2-digit", month: "2-digit" }),
      count: events.filter((e) => {
        if (e.kind !== "view") return false;
        const t = new Date(e.created_at).getTime();
        return t >= start.getTime() && t < end;
      }).length,
    });
  }

  return { now, events, subscribers, days };
}

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [page, locale] = await Promise.all([
    getActivePage(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  if (!page) redirect("/ma-page");
  const t = await getDictionary(locale, "analytics");

  // Mini tunnel d'abord (partage du lien), tableau de bord sur ?view=stats.
  const params = await searchParams;
  if (params.view !== "stats") {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
    return <StatsTunnel pageUrl={`${siteUrl}/p/${page.slug}`} t={t.tunnel} />;
  }

  const { now, events, subscribers, days } = await loadStats(supabase, page.id, locale);

  const cards = [
    { label: t.cards.visits7, value: countSince(events, "view", 7, now) },
    { label: t.cards.visits30, value: countSince(events, "view", 30, now) },
    {
      label: t.cards.phoneClicks30,
      value: countSince(events, "phone_click", 30, now),
    },
    {
      label: t.cards.whatsappClicks30,
      value: countSince(events, "whatsapp_click", 30, now),
    },
    {
      label: t.cards.socialClicks30,
      value: countSince(events, "social_click", 30, now),
    },
    { label: t.cards.newsletterSubscribers, value: subscribers.length },
  ];
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const csv = [
    t.subscribers.csvHeader,
    ...subscribers.map(
      (s) => `${s.email};${formatDate(locale, s.created_at)}`
    ),
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  const visits30 = countSince(events, "view", 30, now);

  return (
    <div className={styles.statsPage}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <Activity aria-hidden="true" />
          {t.hero.kicker}
        </span>
        <div className={styles.statMark} aria-hidden="true">
          <LineChart />
        </div>
        <h1>
          {t.hero.titleStart} <span>{t.hero.titleEm}</span>
        </h1>
        <p>
          {t.hero.textStart}{" "}
          <Link href={`/p/${page.slug}`} target="_blank">
            {t.hero.textLink}
          </Link>{" "}
          {t.hero.textEnd}
        </p>
        <div className={styles.highlight}>
          <Activity aria-hidden="true" />
          <strong>{visits30}</strong>
          <span>{visits30 > 1 ? t.hero.visitPlural : t.hero.visitSingular}</span>
        </div>
      </header>

      <div className={styles.statGrid}>
        {cards.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <p className={styles.statValue}>{card.value}</p>
            <p className={styles.statLabel}>{card.label}</p>
          </div>
        ))}
      </div>

      <section className={styles.chartCard}>
        <p className={styles.cardTitle}>{t.chart.title}</p>
        {events.length === 0 ? (
          <p className={styles.emptyLine}>{t.chart.empty}</p>
        ) : (
          <div className={styles.chart}>
            {days.map((day) => (
              <div
                key={day.label}
                className={styles.chartCol}
                title={(day.count > 1 ? t.chart.tooltipPlural : t.chart.tooltipSingular)
                  .replace("{label}", day.label)
                  .replace("{count}", String(day.count))}
              >
                <div
                  className={day.count > 0 ? styles.bar : styles.barEmpty}
                  style={{
                    height: `${Math.round((day.count / maxDay) * 100)}px`,
                    minHeight: day.count > 0 ? 4 : 2,
                  }}
                />
                <span className={styles.barLabel}>{day.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.subsCard}>
        <div className={styles.subsHead}>
          <div>
            <p className={styles.cardTitle}>{t.subscribers.title}</p>
            <p className={styles.cardHint}>{t.subscribers.hint}</p>
          </div>
          {subscribers.length > 0 && (
            <a
              href={csvHref}
              download={`abonnes-${page.slug}.csv`}
              className={styles.csvButton}
            >
              <Download aria-hidden="true" />
              {t.subscribers.export}
            </a>
          )}
        </div>
        {subscribers.length === 0 ? (
          <p className={styles.emptyLine}>{t.subscribers.empty}</p>
        ) : (
          <div className={styles.subsList}>
            {subscribers.map((s) => (
              <div key={s.id} className={styles.subsRow}>
                <span className={styles.subsEmail}>{s.email}</span>
                <span className={styles.subsDate}>{formatDate(locale, s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
