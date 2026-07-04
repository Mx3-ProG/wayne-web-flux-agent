import Link from "next/link";
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

export const metadata = { title: "Mes projets" };

export default async function ProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: pages }, activePageId] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    getActivePageId(supabase, user.id),
  ]);

  const projects = (pages ?? []) as Page[];
  const plan = (profile?.plan as Plan) ?? "free";
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
      <p className={styles.eyebrow}>Ton compte</p>
      <h1 className={styles.title}>Mes projets</h1>
      <p className={styles.subtitle}>
        Chaque projet est une boutique complète : sa vitrine, ses produits, ses
        commandes, son chiffre d&apos;affaires. Choisis le projet actif pour piloter
        tout ton espace dessus.
      </p>

      <div className={styles.counter}>
        <b>{projects.length}</b> / {limit} projet{limit > 1 ? "s" : ""} — forfait{" "}
        {PLAN_LABEL[plan]}
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
                  <strong>{project.business_name || "Sans nom"}</strong>
                  <small>/{project.slug}</small>
                </div>
              </div>
              <div className={styles.stat}>
                <span>Chiffre d&apos;affaires</span>
                <b>{formatPrice(revenues[i])}</b>
              </div>
              <div className={styles.cardActions}>
                <ActivateButton
                  pageId={project.id}
                  active={active}
                  className={styles.activate}
                />
                <Link href="/ma-page" className={styles.openLink}>
                  Ouvrir ↗
                </Link>
              </div>
            </article>
          );
        })}

        {canCreate ? (
          <Link href="/projets/nouveau" className={styles.addCard}>
            <Plus aria-hidden="true" />
            <span>Nouveau projet</span>
          </Link>
        ) : (
          <div className={styles.upsell}>
            <Lock aria-hidden="true" />
            <strong>Plusieurs boutiques</strong>
            <p>
              {plan === "free"
                ? "Gère plusieurs boutiques (jusqu'à 3) avec le forfait Plus."
                : "Tu as atteint la limite de projets de ton forfait."}
            </p>
            {plan === "free" && (
              <span className={styles.upsellCta}>
                <Store aria-hidden="true" /> Passer au forfait Plus (bientôt)
              </span>
            )}
          </div>
        )}
      </div>

      {activeProject && (
        <DomainSettings
          pageId={activeProject.id}
          domain={activeProject.custom_domain}
          editable={domainEditable}
        />
      )}
    </div>
  );
}
