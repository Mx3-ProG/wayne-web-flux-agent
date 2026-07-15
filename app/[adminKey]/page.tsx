import Link from "next/link";
import { can, requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate } from "@/lib/admin/format";
import styles from "./admin.module.css";

async function exactCount(
  table: string,
  filter?: { column: string; value: string | null }
) {
  const admin = createAdminClient();
  let query = admin.from(table).select("*", { count: "exact", head: true });
  if (filter) {
    query = filter.value === null
      ? query.is(filter.column, null)
      : query.eq(filter.column, filter.value);
  }
  const { count } = await query;
  return count ?? 0;
}

export default async function AdminOverview({ params }: { params: Promise<{ adminKey: string }> }) {
  const context = await requireAdmin();
  const { adminKey } = await params;
  const base = `/${adminKey}`;
  const memberships = context.membership;
  const [users, pages, contacts, generations, archived, alerts] = await Promise.all([
    can(memberships, "users.read") ? exactCount("profiles") : Promise.resolve(null),
    can(memberships, "sites.moderate") ? exactCount("pages") : Promise.resolve(null),
    can(memberships, "customers.read") ? exactCount("customers") : Promise.resolve(null),
    can(memberships, "flux.review") ? exactCount("generations") : Promise.resolve(null),
    can(memberships, "sites.moderate") ? exactCount("pages", { column: "moderation_status", value: "archived" }) : Promise.resolve(null),
    can(memberships, "flux.review") ? exactCount("karlmada_events", { column: "review_status", value: null }) : Promise.resolve(null),
  ]);
  const admin = createAdminClient();
  const { data: recent } = can(memberships, "security.read")
    ? await admin.from("admin_audit_logs").select("id, action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(8)
    : { data: [] };

  const metrics = [
    { label: "Utilisateurs", value: users, href: `${base}/utilisateurs` },
    { label: "Boutiques", value: pages, href: `${base}/boutiques` },
    { label: "Contacts CRM", value: contacts, href: `${base}/utilisateurs` },
    { label: "Générations FLUX", value: generations, href: `${base}/flux` },
    { label: "Boutiques archivées", value: archived, href: `${base}/boutiques` },
    { label: "Alertes à revoir", value: alerts, href: `${base}/flux` },
  ].filter((item) => item.value !== null);

  return (
    <>
      <h1 className={styles.title}>Vue d’ensemble</h1>
      <p className={styles.muted}>Pilotage métier, sécurité et qualité de FLUX.</p>
      <div className={styles.grid}>
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className={styles.card} style={{ textDecoration: "none", color: "inherit" }}>
            <span className={styles.label}>{metric.label}</span>
            <p className={styles.metric}>{metric.value}</p>
          </Link>
        ))}
      </div>
      {recent && recent.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}><h2>Dernières actions sensibles</h2></div>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>Action</th><th>Cible</th><th>Date</th></tr></thead>
            <tbody>{recent.map((event) => (
              <tr key={event.id}><td>{event.action}</td><td>{event.target_type} · {event.target_id ?? "—"}</td><td>{formatAdminDate(event.created_at)}</td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
