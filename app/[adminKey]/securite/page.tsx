import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate } from "@/lib/admin/format";
import styles from "../admin.module.css";

export default async function SecurityAdminPage({ params }: { params: Promise<{ adminKey: string }> }) {
  await requireAdmin("security.read");
  const { adminKey } = await params;
  const admin = createAdminClient();
  const [{ data: audits }, { data: activity }, { data: stripeFailures }, { data: sessions }] = await Promise.all([
    admin.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("activity_events").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("stripe_webhook_events").select("*").eq("status", "failed").order("updated_at", { ascending: false }).limit(100),
    admin.from("user_sessions").select("id, user_id, started_at, last_seen_at, ended_at, explicit_logout").order("started_at", { ascending: false }).limit(100),
  ]);
  return (
    <>
      <h1 className={styles.title}>Sécurité et activité</h1>
      <p className={styles.muted}>Audit administratif immuable, incidents et connexions récentes.</p>
      <div className={styles.grid}>
        <div className={styles.card}><span className={styles.label}>Audits chargés</span><p className={styles.metric}>{audits?.length ?? 0}</p></div>
        <div className={styles.card}><span className={styles.label}>Événements applicatifs</span><p className={styles.metric}>{activity?.length ?? 0}</p></div>
        <div className={styles.card}><span className={styles.label}>Webhooks Stripe en erreur</span><p className={styles.metric}>{stripeFailures?.length ?? 0}</p></div>
        <div className={styles.card}><span className={styles.label}>Sessions récentes</span><p className={styles.metric}>{sessions?.length ?? 0}</p></div>
      </div>
      <section className={styles.section}><h2>Audit administratif</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Action</th><th>Acteur</th><th>Cible</th><th>Motif</th><th>Date</th></tr></thead><tbody>{(audits ?? []).map((event) => <tr key={event.id}><td>{event.action}</td><td>{event.actor_id ?? "système"}</td><td>{event.target_type} · {event.target_id ?? "—"}</td><td>{event.reason ?? "—"}</td><td>{formatAdminDate(event.created_at)}</td></tr>)}</tbody></table></div></section>
      <section className={styles.section}><h2>Connexions récentes</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Utilisateur</th><th>Début</th><th>Dernière présence</th><th>Fin</th></tr></thead><tbody>{(sessions ?? []).map((session) => <tr key={session.id}><td><Link href={`/${adminKey}/utilisateurs/${session.user_id}`}>{session.user_id}</Link></td><td>{formatAdminDate(session.started_at)}</td><td>{formatAdminDate(session.last_seen_at)}</td><td>{formatAdminDate(session.ended_at)} {session.explicit_logout ? "(logout)" : ""}</td></tr>)}</tbody></table></div></section>
      <section className={styles.section}><h2>Événements applicatifs</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Type</th><th>Source</th><th>Utilisateur</th><th>Détails</th><th>Date</th></tr></thead><tbody>{(activity ?? []).map((event) => <tr key={event.id}><td>{event.kind}</td><td>{event.source}</td><td>{event.user_id ?? "—"}</td><td><code>{JSON.stringify(event.metadata)}</code></td><td>{formatAdminDate(event.created_at)}</td></tr>)}</tbody></table></div></section>
    </>
  );
}

