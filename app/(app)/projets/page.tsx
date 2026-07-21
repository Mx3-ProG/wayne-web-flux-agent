import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { projectLimit, canUseCustomDomain, PLAN_LABEL } from "@/lib/plans";
import { CUSTOM_DOMAIN_ENABLED } from "@/lib/config";
import type { Page, Plan } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { getVertical } from "@/lib/verticals";
import { Lock, Plus, Store } from "lucide-react";
import { ActivateButton } from "./activate-button";
import { DomainSettings } from "./domain-settings";
import styles from "./projets.module.css";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "projects")).meta.title };
}

export default async function ProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: pages }, activePageId, locale] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    getActivePageId(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "projects");

  const projects = (pages ?? []) as Page[];
  const plan = (profile?.plan as Plan) ?? "basique";
  const limit = projectLimit(plan);
  const canCreate = projects.length < limit;
  const activeProject = projects.find((p) => p.id === activePageId) ?? projects[0];
  const domainEditable = canUseCustomDomain(plan) && CUSTOM_DOMAIN_ENABLED;

  // CA par projet (calculé à la volée via la RPC).
  const revenues = await Promise.all(
    projects.map(async (p) => {
      const { data } = await supabase.rpc("revenue_total", { p_page: p.id });
      return Number(data ?? 0);
    })
  );

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.subtitle}>{t.subtitle}</p>

      <div className={styles.counter}>
        {(limit > 1 ? t.counterPlural : t.counter)
          .replace("{count}", String(projects.length))
          .replace("{limit}", String(limit))
          .replace("{plan}", PLAN_LABEL[plan])}
      </div>

      <div className={styles.grid}>
        {projects.map((project, i) => {
          const active = project.id === activePageId;
          const vertical = getVertical(project.vertical);
          return (
            <article
              key={project.id}
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
            >
              <div className={styles.cardHead}>
                <span className={styles.emoji}>{vertical.emoji}</span>
                <div className={styles.cardTitle}>
                  <strong>{project.business_name || t.noName}</strong>
                  <small>/{project.slug}</small>
                </div>
              </div>
              <div className={styles.stat}>
                <span>{t.revenue}</span>
                <b>{formatPrice(revenues[i], locale)}</b>
              </div>
              <div className={styles.cardActions}>
                <ActivateButton
                  pageId={project.id}
                  active={active}
                  className={styles.activate}
                  t={t}
                />
                <Link href="/ma-page" className={styles.openLink}>
                  {t.open}
                </Link>
              </div>
            </article>
          );
        })}

        {canCreate ? (
          <Link href="/projets/nouveau" className={styles.addCard}>
            <Plus aria-hidden="true" />
            <span>{t.newProject}</span>
          </Link>
        ) : (
          <div className={styles.upsell}>
            <Lock aria-hidden="true" />
            <strong>{t.upsellTitle}</strong>
            <p>{plan === "basique" ? t.upsellBasique : t.upsellLimit}</p>
            {plan === "basique" && (
              <Link href="/formules" className={`flux-button-smooth ${styles.upsellCta}`}>
                <Store aria-hidden="true" /> {t.discoverPlans}
              </Link>
            )}
          </div>
        )}
      </div>

      {activeProject && (
        <DomainSettings
          pageId={activeProject.id}
          domain={activeProject.custom_domain}
          editable={domainEditable}
          t={t}
        />
      )}
    </div>
  );
}
