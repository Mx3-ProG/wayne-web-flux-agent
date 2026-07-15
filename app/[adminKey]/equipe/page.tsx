import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate } from "@/lib/admin/format";
import { InviteAdminForm } from "@/components/admin/invite-admin-form";
import { ADMIN_PERMISSION_OPTIONS } from "@/components/admin/permission-options";
import { updateAdminMembership } from "../admin-actions";
import type { AdminMembership } from "@/lib/types";
import styles from "../admin.module.css";

export default async function TeamAdminPage() {
  await requireAdmin(undefined, { superadmin: true });
  const admin = createAdminClient();
  const { data } = await admin.from("admin_memberships").select("*").order("invited_at");
  const memberships = (data ?? []) as AdminMembership[];
  const users = await Promise.all(memberships.map(async (membership) => {
    const { data: authData } = await admin.auth.admin.getUserById(membership.user_id);
    return { membership, email: authData.user?.email ?? membership.user_id };
  }));

  return (
    <>
      <h1 className={styles.title}>Équipe d’administration</h1>
      <p className={styles.muted}>Seuls les superadmins peuvent inviter ou modifier les accès. La MFA reste obligatoire pour tous.</p>
      <div className={styles.twoColumns}>
        <section className={`${styles.section} ${styles.card}`}><h2>Inviter</h2><InviteAdminForm /></section>
        <section className={`${styles.section} ${styles.card}`}><h2>Règles</h2><p className={styles.muted}>Un admin ne peut ni inviter, ni modifier un rôle. Un superadmin possède toutes les permissions. Le dernier superadmin actif est protégé.</p></section>
      </div>
      <section className={styles.section}>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Membre</th><th>Accès actuel</th><th>Configuration</th></tr></thead><tbody>
          {users.map(({ membership, email }) => <tr key={membership.user_id}>
            <td><strong>{email}</strong><br /><small>{membership.user_id}<br />Invité {formatAdminDate(membership.invited_at)}</small></td>
            <td><span className={`${styles.badge} ${membership.status === "active" ? styles.good : styles.danger}`}>{membership.role} · {membership.status}</span><br /><small>{membership.role === "superadmin" ? "Toutes les permissions" : membership.permissions.join(", ") || "Aucune permission"}</small></td>
            <td><form action={updateAdminMembership} className={styles.form}>
              <input type="hidden" name="userId" value={membership.user_id} />
              <label>Rôle<select name="role" defaultValue={membership.role}><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></label>
              <label>État<select name="status" defaultValue={membership.status === "suspended" ? "suspended" : "active"}><option value="active">Actif</option><option value="suspended">Suspendu</option></select></label>
              <fieldset style={{ border: "1px solid #343a48", borderRadius: 10 }}><legend>Permissions admin</legend>{ADMIN_PERMISSION_OPTIONS.map((item) => <label key={item.value} style={{ display: "flex", gap: 6 }}><input type="checkbox" name="permissions" value={item.value} defaultChecked={membership.permissions.includes(item.value)} />{item.label}</label>)}</fieldset>
              <button type="submit">Enregistrer</button>
            </form></td>
          </tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}

