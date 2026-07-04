import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem, Page } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { acceptOrder, cancelOrder, fulfillOrder } from "./actions";
import styles from "./commandes.module.css";

export const metadata = { title: "Mes commandes" };

type OrderWithItems = Order & { order_items: OrderItem[] };

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "À traiter",
  accepted: "Acceptée",
  fulfilled: "Terminée",
  cancelled: "Annulée",
};

const STATUS_CLASS: Record<Order["status"], string> = {
  pending: styles.badgePending,
  accepted: styles.badgeAccepted,
  fulfilled: styles.badgeFulfilled,
  cancelled: styles.badgeCancelled,
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.customer}>{order.first_name}</p>
          <p className={styles.meta}>
            {order.phone}
            {order.email ? ` · ${order.email}` : ""} · {formatDate(order.created_at)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`${styles.badge} ${STATUS_CLASS[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
          <p className={styles.total}>{formatPrice(order.total_cents)}</p>
        </div>
      </div>

      <div className={styles.items}>
        {order.order_items.map((item) => (
          <div key={item.id} className={styles.item}>
            <span>
              <b>{item.quantity}×</b> {item.name}
            </span>
            <span>{formatPrice(item.line_total_cents)}</span>
          </div>
        ))}
      </div>

      {order.note && <p className={styles.note}>« {order.note} »</p>}

      {(order.status === "pending" || order.status === "accepted") && (
        <div className={styles.actions}>
          {order.status === "pending" && (
            <form action={acceptOrder.bind(null, order.id)}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Accepter
              </button>
            </form>
          )}
          {order.status === "accepted" && (
            <form action={fulfillOrder.bind(null, order.id)}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Marquer comme terminée
              </button>
            </form>
          )}
          <form action={cancelOrder.bind(null, order.id)}>
            <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
              {order.status === "pending" ? "Refuser" : "Annuler"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export default async function CommandesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<Pick<Page, "id">>();

  let orders: OrderWithItems[] = [];
  if (page) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false });
    orders = (data ?? []) as OrderWithItems[];
  }

  const pending = orders.filter((o) => o.status === "pending");
  const accepted = orders.filter((o) => o.status === "accepted");
  const past = orders.filter((o) => o.status === "fulfilled" || o.status === "cancelled");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Ta boutique</p>
      <h1 className={styles.title}>Mes commandes</h1>
      <p className={styles.subtitle}>
        Les commandes passées depuis ta vitrine. Accepte-les, puis encaisse en
        boutique ou à la livraison.
      </p>

      {!page && (
        <div className={styles.empty} style={{ marginTop: 34 }}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> pour recevoir des
          commandes.
        </div>
      )}

      {page && orders.length === 0 && (
        <div className={styles.empty} style={{ marginTop: 34 }}>
          Aucune commande pour l&apos;instant. Ajoute des produits dans ta{" "}
          <Link href="/ma-page">vitrine</Link> et partage ton lien.
        </div>
      )}

      {pending.length > 0 && (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h2>À traiter</h2>
            <span className={styles.groupCount}>{pending.length}</span>
          </div>
          <div className={styles.list}>
            {pending.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h2>Acceptées</h2>
            <span className={styles.groupCount}>{accepted.length}</span>
          </div>
          <div className={styles.list}>
            {accepted.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h2>Historique</h2>
            <span className={styles.groupCount}>{past.length}</span>
          </div>
          <div className={styles.list}>
            {past.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
