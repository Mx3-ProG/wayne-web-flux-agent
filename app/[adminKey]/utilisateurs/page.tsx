import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate, formatSeconds, shortId } from "@/lib/admin/format";
import styles from "../admin.module.css";

type UserSummary = {
  total_count: number;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  business_email: string | null;
  siret: string | null;
  company_name: string | null;
  plan: string;
  subscription_status: string | null;
  created_at: string;
  last_login_at: string | null;
  project_count: number;
  page_count: number;
  contact_count: number;
  credit_balance: number;
  ai_input_tokens: number;
  ai_output_tokens: number;
  authenticated_seconds: number;
  active_seconds: number;
};

export default async function UsersAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminKey: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const context = await requireAdmin("users.read");
  const [{ adminKey }, query] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(query.page) || 1);
  const search = String(query.q ?? "").trim().slice(0, 120);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_list_users", {
    actor: context.userId,
    search_text: search,
    row_offset: (page - 1) * 50,
    row_limit: 50,
  });
  if (error) throw new Error("Impossible de charger les utilisateurs.");
  const users = (data ?? []) as UserSummary[];
  const total = Number(users[0]?.total_count ?? 0);
  const base = `/${adminKey}/utilisateurs`;

  return (
    <>
      <h1 className={styles.title}>Utilisateurs</h1>
      <p className={styles.muted}>{total} compte{total > 1 ? "s" : ""} · données commerciales et activité consolidées.</p>
      <form className={styles.form} action={base}>
        <label>Rechercher<input name="q" defaultValue={search} placeholder="Email, téléphone, SIRET, ID…" /></label>
        <button type="submit">Rechercher</button>
      </form>
      <section className={styles.section}>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Compte</th><th>Connexion</th><th>Activité</th><th>Clients / contenu</th><th>Formule</th><th>Crédits / tokens</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td><Link href={`${base}/${user.user_id}`}>{user.name || user.company_name || user.email || shortId(user.user_id)}</Link><br /><span className={styles.muted}>{user.email ?? "—"}</span><br /><small>{user.phone ?? "—"} · SIRET {user.siret ?? "—"}</small></td>
                <td>{formatAdminDate(user.last_login_at)}<br /><small>Créé {formatAdminDate(user.created_at)}</small></td>
                <td>Auth. {formatSeconds(user.authenticated_seconds)}<br />Actif {formatSeconds(user.active_seconds)}</td>
                <td>{user.contact_count} contacts<br />{user.project_count} sites · {user.page_count} pages</td>
                <td><span className={styles.badge}>{user.plan}</span><br /><small>{user.subscription_status ?? "essai"}</small></td>
                <td>{user.credit_balance} crédits<br /><small>{Number(user.ai_input_tokens) + Number(user.ai_output_tokens)} tokens IA</small></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className={styles.empty}>Aucun utilisateur.</td></tr>}
          </tbody>
        </table></div>
      </section>
      <div className={styles.tabs}>
        {page > 1 && <Link href={`${base}?q=${encodeURIComponent(search)}&page=${page - 1}`}>Précédent</Link>}
        {page * 50 < total && <Link href={`${base}?q=${encodeURIComponent(search)}&page=${page + 1}`}>Suivant</Link>}
      </div>
    </>
  );
}

