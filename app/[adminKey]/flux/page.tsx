import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAdminDate } from "@/lib/admin/format";
import { reviewGeneration, reviewKarlmada } from "../admin-actions";
import styles from "../admin.module.css";

export default async function FluxAdminPage({ params }: { params: Promise<{ adminKey: string }> }) {
  await requireAdmin("flux.review");
  const { adminKey } = await params;
  const admin = createAdminClient();
  const [{ data: generations }, { data: reviews }, { data: alerts }] = await Promise.all([
    admin.from("generations").select("id, user_id, page_id, tool_slug, inputs, output, credits_spent, ai_usage_event_id, created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("generation_reviews").select("*").order("reviewed_at", { ascending: false }).limit(200),
    admin.from("karlmada_events").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const reviewByGeneration = new Map((reviews ?? []).map((review) => [review.generation_id, review]));

  return (
    <>
      <h1 className={styles.title}>Qualité FLUX</h1>
      <p className={styles.muted}>Revue a posteriori des créations et alertes KarlMada. Un rejet n’altère jamais automatiquement le brouillon.</p>
      <section className={styles.section}>
        <div className={styles.sectionHeader}><h2>Générations</h2><span>{(generations ?? []).filter((item) => !reviewByGeneration.has(item.id)).length} à revoir</span></div>
        <div style={{ display: "grid", gap: 14 }}>{(generations ?? []).map((generation) => {
          const review = reviewByGeneration.get(generation.id);
          return <article key={generation.id} className={styles.card}>
            <div className={styles.sectionHeader}><div><strong>{generation.tool_slug}</strong> · {generation.credits_spent} crédits<br /><small>{formatAdminDate(generation.created_at)} · <Link href={`/${adminKey}/utilisateurs/${generation.user_id}`}>{generation.user_id}</Link></small></div>{review ? <span className={`${styles.badge} ${review.status === "approved" ? styles.good : styles.danger}`}>{review.status} · {review.score}/5</span> : <span className={`${styles.badge} ${styles.warn}`}>À revoir</span>}</div>
            <details><summary>Entrées et sortie</summary><pre className={styles.pre}>{JSON.stringify(generation.inputs, null, 2)}{"\n\n"}{generation.output}</pre></details>
            <form action={reviewGeneration} className={styles.form}>
              <input type="hidden" name="generationId" value={generation.id} />
              <label>Décision<select name="status" defaultValue={review?.status ?? "approved"}><option value="approved">Approuver</option><option value="rejected">Rejeter</option></select></label>
              <label>Note<select name="score" defaultValue={review?.score ?? 4}>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select></label>
              <label>Commentaire<input name="note" maxLength={1000} defaultValue={review?.note ?? ""} /></label>
              <button type="submit">Enregistrer</button>
            </form>
          </article>;
        })}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><h2>Alertes KarlMada</h2><span>{(alerts ?? []).filter((event) => !event.review_status).length} non traitée(s)</span></div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Alerte</th><th>Compte</th><th>État</th><th>Revue</th></tr></thead><tbody>
          {(alerts ?? []).map((event) => <tr key={event.id}><td>{event.category} · {event.rule_code}<br /><small>{event.surface} · {formatAdminDate(event.created_at)}</small></td><td>{event.user_id ? <Link href={`/${adminKey}/utilisateurs/${event.user_id}`}>{event.user_id}</Link> : "Anonyme"}</td><td>{event.review_status ?? "à revoir"}</td><td><form action={reviewKarlmada} className={styles.form}><input type="hidden" name="eventId" value={event.id} /><select name="status" defaultValue={event.review_status ?? "reviewed"}><option value="reviewed">Traitée</option><option value="dismissed">Classer sans suite</option></select><input name="note" maxLength={1000} defaultValue={event.review_note ?? ""} placeholder="Note interne" /><button type="submit">Valider</button></form></td></tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}

