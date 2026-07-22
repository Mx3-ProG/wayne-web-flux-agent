import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate, formatSeconds } from "@/lib/admin/format";
import { CreditAdjustForm } from "@/components/admin/credit-adjust-form";
import { setAccountSuspension } from "../../admin-actions";
import type { Profile } from "@/lib/types";
import styles from "../../admin.module.css";

type ContactRow = { key: string; pageId: string; name: string; phone: string | null; email: string | null; sources: Set<string>; lastActivity: string };

function normalizedKey(phone: string | null, email: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits) return `p:${digits}`;
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return normalizedEmail ? `e:${normalizedEmail}` : null;
}

export default async function UserAdminDetail({ params }: { params: Promise<{ adminKey: string; userId: string }> }) {
  const context = await requireAdmin("users.read");
  const { adminKey, userId } = await params;
  const admin = createAdminClient();
  const [{ data: profile }, authResult, { data: pages }] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", userId).maybeSingle<Profile>(),
    admin.auth.admin.getUserById(userId),
    admin.from("pages").select("*").eq("user_id", userId).order("created_at"),
  ]);
  if (!profile || authResult.error) notFound();
  const pageIds = (pages ?? []).map((page) => page.id);
  const empty = { data: [] as Array<Record<string, unknown>> };
  const [sitePagesResult, customersResult, bookingsResult, subscribersResult, ordersResult, ledgerResult, generationsResult, usageResult, sessionsResult] = pageIds.length
    ? await Promise.all([
        admin.from("site_pages").select("id, page_id, title, path, published, created_at").in("page_id", pageIds),
        admin.from("customers").select("*").in("page_id", pageIds).order("created_at", { ascending: false }),
        admin.from("bookings").select("*").in("page_id", pageIds).order("created_at", { ascending: false }),
        admin.from("page_subscribers").select("*").in("page_id", pageIds).order("created_at", { ascending: false }),
        admin.from("orders").select("*").in("page_id", pageIds).order("created_at", { ascending: false }),
        admin.from("credit_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(300),
        admin.from("generations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        admin.from("ai_usage_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(300),
        admin.from("user_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(100),
      ])
    : [empty, empty, empty, empty, empty, await admin.from("credit_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(300), await admin.from("generations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100), await admin.from("ai_usage_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(300), await admin.from("user_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(100)];

  const ledger = ledgerResult.data ?? [];
  const balance = ledger.reduce((sum, entry) => sum + Number(entry.delta), 0);
  const sessions = sessionsResult.data ?? [];
  const authenticated = sessions.reduce((sum, session) => sum + Number(session.authenticated_seconds), 0);
  const active = sessions.reduce((sum, session) => sum + Number(session.active_seconds), 0);
  const usage = usageResult.data ?? [];
  const inputTokens = usage.reduce((sum, event) => sum + Number(event.input_tokens), 0);
  const outputTokens = usage.reduce((sum, event) => sum + Number(event.output_tokens), 0);

  const contacts = new Map<string, ContactRow>();
  function addContact(source: string, row: Record<string, unknown>) {
    const pageId = String(row.page_id ?? "");
    const phone = row.phone ? String(row.phone) : null;
    const email = row.email ? String(row.email) : null;
    const key = normalizedKey(phone, email);
    if (!key || !pageId) return;
    const mapKey = `${pageId}:${key}`;
    const date = String(row.created_at ?? "");
    const current = contacts.get(mapKey);
    if (current) {
      current.sources.add(source);
      if (date > current.lastActivity) current.lastActivity = date;
      if (!current.email && email) current.email = email;
      if (!current.phone && phone) current.phone = phone;
    } else {
      contacts.set(mapKey, {
        key: mapKey,
        pageId,
        name: String(row.first_name ?? "Contact"),
        phone,
        email,
        sources: new Set([source]),
        lastActivity: date,
      });
    }
  }
  (customersResult.data ?? []).forEach((row) => addContact("CRM", row));
  (bookingsResult.data ?? []).forEach((row) => addContact("Réservation", row));
  (subscribersResult.data ?? []).forEach((row) => addContact("Newsletter", row));
  (ordersResult.data ?? []).forEach((row) => addContact("Commande", row));
  const contactRows = [...contacts.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  const canSeeCustomers = can(context.membership, "customers.read");
  const canManageCredits = can(context.membership, "credits.manage");
  const canModerate = can(context.membership, "sites.moderate");
  const pageById = new Map((pages ?? []).map((page) => [page.id, page.business_name || page.slug]));

  return (
    <>
      <Link href={`/${adminKey}/utilisateurs`}>← Utilisateurs</Link>
      <h1 className={styles.title}>{profile.name || profile.company_name || profile.email || userId}</h1>
      <p className={styles.muted}>{userId}</p>
      <div className={styles.grid}>
        <div className={styles.card}><span className={styles.label}>Contact</span><p>{authResult.data.user.email}<br />{profile.phone ?? "—"}<br />{profile.business_email ?? "—"}</p></div>
        <div className={styles.card}><span className={styles.label}>Entreprise</span><p>{profile.company_name ?? "—"}<br />SIRET {profile.siret ?? "—"}<br />{profile.address ?? "—"}</p></div>
        <div className={styles.card}><span className={styles.label}>Abonnement</span><p className={styles.metric}>{profile.plan}</p><small>{profile.subscription_status ?? "essai"}</small></div>
        <div className={styles.card}><span className={styles.label}>Dernière connexion</span><p>{formatAdminDate(profile.last_login_at ?? authResult.data.user.last_sign_in_at)}</p><small>Auth. {formatSeconds(authenticated)} · actif {formatSeconds(active)}</small></div>
        <div className={styles.card}><span className={styles.label}>Crédits</span><p className={styles.metric}>{balance}</p></div>
        <div className={styles.card}><span className={styles.label}>Tokens IA</span><p className={styles.metric}>{inputTokens + outputTokens}</p><small>{inputTokens} entrée · {outputTokens} sortie</small></div>
      </div>

      {profile.suspended_at && (
        <section className={`${styles.section} ${styles.card}`} style={{ borderLeft: "3px solid #c0392b" }}>
          <h2>⛔ Compte suspendu</h2>
          <p>Suspendu le {formatAdminDate(profile.suspended_at)}. IA et publication coupées.</p>
          {profile.suspended_reason && <p className={styles.muted}>{profile.suspended_reason}</p>}
        </section>
      )}

      {canModerate && <section className={`${styles.section} ${styles.card}`}>
        <h2>{profile.suspended_at ? "Réactiver le compte" : "Suspendre le compte"}</h2>
        <form action={setAccountSuspension} className={styles.form}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="suspend" value={profile.suspended_at ? "false" : "true"} />
          {!profile.suspended_at && <input name="reason" maxLength={500} placeholder="Motif de la suspension" required />}
          <button type="submit">{profile.suspended_at ? "Réactiver" : "Suspendre"}</button>
        </form>
      </section>}

      {canManageCredits && <section className={`${styles.section} ${styles.card}`}><h2>Ajuster les crédits</h2><CreditAdjustForm userId={userId} balance={balance} /></section>}

      <section className={styles.section}>
        <div className={styles.sectionHeader}><h2>Boutiques et pages</h2><span>{(pages ?? []).length} boutique(s) · {(pages ?? []).length + (sitePagesResult.data ?? []).length} page(s)</span></div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Boutique</th><th>État</th><th>Pages</th><th>Mise à jour</th></tr></thead><tbody>
          {(pages ?? []).map((page) => <tr key={page.id}><td><Link href={`/${adminKey}/boutiques#${page.id}`}>{page.business_name || page.slug}</Link><br /><small>/p/{page.slug}</small></td><td>{page.moderation_status} · {page.published ? "en ligne" : "hors ligne"}</td><td>1 + {(sitePagesResult.data ?? []).filter((subpage) => subpage.page_id === page.id).length}</td><td>{formatAdminDate(page.updated_at)}</td></tr>)}
        </tbody></table></div>
      </section>

      {canSeeCustomers && <section className={styles.section}>
        <div className={styles.sectionHeader}><h2>Clients et contacts</h2><span>{contactRows.length} contact(s) dédupliqué(s) par boutique</span></div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Contact</th><th>Boutique</th><th>Origines</th><th>Dernière activité</th></tr></thead><tbody>
          {contactRows.map((contact) => <tr key={contact.key}><td>{contact.name}<br /><small>{contact.phone ?? "—"} · {contact.email ?? "—"}</small></td><td>{pageById.get(contact.pageId) ?? contact.pageId}</td><td>{[...contact.sources].join(", ")}</td><td>{formatAdminDate(contact.lastActivity)}</td></tr>)}
          {contactRows.length === 0 && <tr><td colSpan={4} className={styles.empty}>Aucun contact.</td></tr>}
        </tbody></table></div>
      </section>}

      <div className={styles.twoColumns}>
        <section className={styles.section}><h2>Derniers mouvements de crédits</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Delta</th><th>Motif</th><th>Date</th></tr></thead><tbody>{ledger.slice(0, 30).map((entry) => <tr key={entry.id}><td>{entry.delta > 0 ? "+" : ""}{entry.delta}</td><td>{entry.reason}</td><td>{formatAdminDate(entry.created_at)}</td></tr>)}</tbody></table></div></section>
        <section className={styles.section}><h2>Dernières générations</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Outil</th><th>Crédits</th><th>Date</th></tr></thead><tbody>{(generationsResult.data ?? []).slice(0, 30).map((generation) => <tr key={generation.id}><td>{generation.tool_slug}</td><td>{generation.credits_spent}</td><td>{formatAdminDate(generation.created_at)}</td></tr>)}</tbody></table></div></section>
      </div>
    </>
  );
}

