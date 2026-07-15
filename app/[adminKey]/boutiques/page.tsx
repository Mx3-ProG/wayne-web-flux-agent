import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate } from "@/lib/admin/format";
import { moderatePage } from "../admin-actions";
import styles from "../admin.module.css";

export default async function ShopsAdminPage({ params }: { params: Promise<{ adminKey: string }> }) {
  await requireAdmin("sites.moderate");
  const { adminKey } = await params;
  const admin = createAdminClient();
  const { data: pages, error } = await admin
    .from("pages")
    .select("id, user_id, slug, business_name, city, published, moderation_status, verified_at, archived_at, archive_reason, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Impossible de charger les boutiques.");
  const userIds = [...new Set((pages ?? []).map((page) => page.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("user_id, name, email, company_name").in("user_id", userIds)
    : { data: [] };
  const owners = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  return (
    <>
      <h1 className={styles.title}>Boutiques</h1>
      <p className={styles.muted}>Vérification publique, archivage et restauration. Toute action est auditée.</p>
      <section className={styles.section}>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Boutique</th><th>Propriétaire</th><th>État</th><th>Dernière modification</th><th>Actions</th></tr></thead>
          <tbody>{(pages ?? []).map((page) => {
            const owner = owners.get(page.user_id);
            return <tr key={page.id} id={page.id}>
              <td><strong>{page.business_name || page.slug}</strong><br /><Link href={`/p/${page.slug}`} target="_blank">/p/{page.slug}</Link><br /><small>{page.city || "—"}</small></td>
              <td><Link href={`/${adminKey}/utilisateurs/${page.user_id}`}>{owner?.name || owner?.company_name || owner?.email || page.user_id}</Link></td>
              <td><span className={`${styles.badge} ${page.moderation_status === "verified" ? styles.good : page.moderation_status === "archived" ? styles.danger : styles.warn}`}>{page.moderation_status}</span><br /><small>{page.published ? "En ligne" : "Hors ligne"}</small>{page.archive_reason && <><br /><small>{page.archive_reason}</small></>}</td>
              <td>{formatAdminDate(page.updated_at)}<br /><small>Vérifiée {formatAdminDate(page.verified_at)} · archivée {formatAdminDate(page.archived_at)}</small></td>
              <td>
                {page.moderation_status !== "archived" ? <div style={{ display: "grid", gap: 8 }}>
                  {page.moderation_status !== "verified" && <form action={moderatePage}><input type="hidden" name="pageId" value={page.id} /><input type="hidden" name="status" value="verified" /><button className={styles.button} type="submit">Vérifier</button></form>}
                  <form action={moderatePage} className={styles.form}><input type="hidden" name="pageId" value={page.id} /><input type="hidden" name="status" value="archived" /><input name="reason" minLength={3} maxLength={500} placeholder="Motif d’archivage" required /><button className={styles.dangerButton} type="submit">Archiver</button></form>
                </div> : <form action={moderatePage}><input type="hidden" name="pageId" value={page.id} /><input type="hidden" name="status" value="unverified" /><button className={styles.button} type="submit">Restaurer</button></form>}
              </td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
    </>
  );
}

