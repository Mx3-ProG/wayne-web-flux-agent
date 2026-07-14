"use client";

import Link from "next/link";
import {
  Banknote,
  ChevronDown,
  ContactRound,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { Booking, OfferKind, Order, OrderItem, ProductKind } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { acceptOrder, cancelOrder, fulfillOrder } from "./actions";
import styles from "./commandes.module.css";

type OrderItemWithCatalog = OrderItem & {
  products: { kind: ProductKind } | null;
  offers: { kind: OfferKind } | null;
};
type OrderWithItems = Order & { order_items: OrderItemWithCatalog[] };
type ClientHistory = {
  orders: OrderWithItems[];
  bookings: Booking[];
};
type ClientProfile = {
  key: string;
  firstName: string;
  phone: string;
  email: string | null;
  address: string;
  history: ClientHistory;
};

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

function formatBookingDate(booking: Booking): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(`${booking.date}T${booking.start_time}`));
}

function sameCustomer(
  a: Pick<Order, "phone" | "email">,
  b: Pick<Order, "phone" | "email">
): boolean {
  const phoneA = a.phone.trim();
  const phoneB = b.phone.trim();
  const emailA = a.email?.trim().toLowerCase();
  const emailB = b.email?.trim().toLowerCase();
  return (phoneA !== "" && phoneA === phoneB) || (!!emailA && emailA === emailB);
}

function customerKey(contact: Pick<Order, "phone" | "email">): string {
  const phone = contact.phone.trim();
  const email = contact.email?.trim().toLowerCase();
  return phone || email || "client-sans-contact";
}

function itemKindLabel(item: OrderItemWithCatalog): string {
  if (item.offer_id) return "Offre";
  if (item.products?.kind === "reservation") return "Réservation";
  return "Produit";
}

function ClientSheet({
  firstName,
  phone,
  email,
  address,
  interactions,
}: {
  firstName?: string;
  phone: string;
  email: string | null;
  address: string;
  interactions: number;
}) {
  return (
    <section className={styles.clientSheet} aria-label="Fiche client">
      <div className={styles.sheetHead}>
        <h3>{firstName ? `Fiche client · ${firstName}` : "Fiche client"}</h3>
        <span>{interactions} interaction(s)</span>
      </div>
      <dl className={styles.contactGrid}>
        <div>
          <dt>Téléphone</dt>
          <dd>{phone || "Non renseigné"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{email || "Non renseigné"}</dd>
        </div>
        <div className={styles.contactWide}>
          <dt>Adresse physique</dt>
          <dd>{address || "Non renseignée"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ClientHistoryList({ history }: { history: ClientHistory }) {
  const allOrderItems = history.orders.flatMap((clientOrder) =>
    clientOrder.order_items.map((item) => ({
      ...item,
      orderStatus: clientOrder.status,
      orderDate: clientOrder.created_at,
    }))
  );

  return (
    <div className={styles.history}>
      <div className={styles.historyHead}>
        <h3>Historique client</h3>
        <span>{allOrderItems.length + history.bookings.length} achat(s)</span>
      </div>
      <div className={styles.historyList}>
        {allOrderItems.map((item) => (
          <div key={`item-${item.id}`} className={styles.historyRow}>
            <span className={styles.historyType}>{itemKindLabel(item)}</span>
            <span className={styles.historyName}>
              {item.quantity}x {item.name}
            </span>
            <span className={styles.historyMeta}>
              {STATUS_LABEL[item.orderStatus]} · {formatDate(item.orderDate)} ·{" "}
              {formatPrice(item.line_total_cents)}
            </span>
          </div>
        ))}
        {history.bookings.map((booking) => (
          <div key={`booking-${booking.id}`} className={styles.historyRow}>
            <span className={styles.historyType}>Réservation</span>
            <span className={styles.historyName}>{booking.service_name}</span>
            <span className={styles.historyMeta}>
              {booking.status === "cancelled" ? "Annulée" : "Confirmée"} ·{" "}
              {formatBookingDate(booking)} · {formatPrice(booking.price_cents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, history }: { order: OrderWithItems; history: ClientHistory }) {
  const address =
    order.address?.trim() ||
    history.orders.find((clientOrder) => clientOrder.address?.trim())?.address?.trim() ||
    "";
  const orderItemsCount = order.order_items.reduce((total, item) => total + item.quantity, 0);
  const defaultOpen = order.status === "pending" || order.status === "accepted";

  return (
    <details className={styles.ledgerCard} open={defaultOpen}>
      <summary className={styles.ledgerTrigger}>
        <span className={styles.entryNumber}>
          <ReceiptText aria-hidden="true" />
        </span>
        <span className={styles.entryMain}>
          <small>Transaction FLUX</small>
          <strong>{order.first_name || "Client"}</strong>
          <span>
            {order.phone}
            {order.email ? ` · ${order.email}` : ""} · {formatDate(order.created_at)}
          </span>
        </span>
        <span className={styles.entryStats}>
          <span className={`${styles.badge} ${STATUS_CLASS[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
          <strong>{formatPrice(order.total_cents)}</strong>
          <small>{orderItemsCount} article{orderItemsCount > 1 ? "s" : ""}</small>
        </span>
        <span className={styles.chevron}>
          <ChevronDown aria-hidden="true" />
        </span>
      </summary>

      <div className={styles.entryBody}>
        <ClientSheet
          phone={order.phone}
          email={order.email}
          address={address}
          interactions={history.orders.length + history.bookings.length}
        />

        <div className={styles.items}>
          {order.order_items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span>
                <b>{item.quantity}x</b> {item.name}{" "}
                <small className={styles.itemKind}>{itemKindLabel(item)}</small>
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
                <button type="submit" className={`flux-button-smooth ${styles.btn} ${styles.btnPrimary}`}>
                  <ShieldCheck aria-hidden="true" />
                  Accepter
                </button>
              </form>
            )}
            {order.status === "accepted" && (
              <form action={fulfillOrder.bind(null, order.id)}>
                <button type="submit" className={`flux-button-smooth ${styles.btn} ${styles.btnPrimary}`}>
                  <Banknote aria-hidden="true" />
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

        <ClientHistoryList history={history} />
      </div>
    </details>
  );
}

function ClientProfileCard({ profile }: { profile: ClientProfile }) {
  const interactions = profile.history.orders.length + profile.history.bookings.length;
  const clientRevenue = profile.history.orders
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + order.total_cents, 0);

  return (
    <details className={styles.ledgerCard}>
      <summary className={styles.ledgerTrigger}>
        <span className={styles.entryNumber}>
          <ContactRound aria-hidden="true" />
        </span>
        <span className={styles.entryMain}>
          <small>Dossier client</small>
          <strong>{profile.firstName || "Client"}</strong>
          <span>
            {profile.phone}
            {profile.email ? ` · ${profile.email}` : ""}
          </span>
        </span>
        <span className={styles.entryStats}>
          <strong>{formatPrice(clientRevenue)}</strong>
          <small>{interactions} interaction{interactions > 1 ? "s" : ""}</small>
        </span>
        <span className={styles.chevron}>
          <ChevronDown aria-hidden="true" />
        </span>
      </summary>
      <div className={styles.entryBody}>
        <ClientSheet
          firstName={profile.firstName}
          phone={profile.phone}
          email={profile.email}
          address={profile.address}
          interactions={interactions}
        />
        <ClientHistoryList history={profile.history} />
      </div>
    </details>
  );
}

export function CommandesLedger({
  pageExists,
  orders,
  bookings,
}: {
  pageExists: boolean;
  orders: OrderWithItems[];
  bookings: Booking[];
}) {
  const pending = orders.filter((o) => o.status === "pending");
  const accepted = orders.filter((o) => o.status === "accepted");
  const past = orders.filter((o) => o.status === "fulfilled" || o.status === "cancelled");
  const portfolioTotal = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + order.total_cents, 0);
  const historyFor = (order: OrderWithItems): ClientHistory => ({
    orders: orders.filter((clientOrder) => sameCustomer(order, clientOrder)),
    bookings: bookings.filter((booking) =>
      sameCustomer(order, { phone: booking.phone, email: booking.email })
    ),
  });
  const contactSeeds = [
    ...orders.map((order) => ({
      firstName: order.first_name,
      phone: order.phone,
      email: order.email,
      address: order.address?.trim() || "",
    })),
    ...bookings.map((booking) => ({
      firstName: booking.first_name,
      phone: booking.phone,
      email: booking.email,
      address: "",
    })),
  ];
  const seenClients = new Set<string>();
  const clientProfiles: ClientProfile[] = contactSeeds.flatMap((seed) => {
    const key = customerKey(seed);
    if (seenClients.has(key)) return [];
    seenClients.add(key);
    const seedAsContact = { phone: seed.phone, email: seed.email };
    const history: ClientHistory = {
      orders: orders.filter((order) => sameCustomer(seedAsContact, order)),
      bookings: bookings.filter((booking) =>
        sameCustomer(seedAsContact, { phone: booking.phone, email: booking.email })
      ),
    };
    const address =
      seed.address ||
      history.orders.find((clientOrder) => clientOrder.address?.trim())?.address?.trim() ||
      "";
    return [{ key, ...seed, address, history }];
  });

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.overline}>
          <Landmark aria-hidden="true" />
          Portefeuille FLUX
        </span>
        <div className={styles.vaultMark} aria-hidden="true">
          <WalletCards />
        </div>
        <h1>
          Centre d&apos;<span>affaires</span>
        </h1>
        <p>
          Pilote les commandes, retrouve chaque client, puis transforme ta vitrine
          en carnet d&apos;encaissements propre et lisible.
        </p>
        <div className={styles.vaultCount}>
          <Sparkles aria-hidden="true" />
          <strong>{formatPrice(portfolioTotal)}</strong>
          <span>{orders.length} mouvement{orders.length > 1 ? "s" : ""} suivis</span>
        </div>
      </header>

      {pageExists && (orders.length > 0 || bookings.length > 0) && (
        <section className={styles.metrics} aria-label="Indicateurs commandes">
          <div>
            <span>À traiter</span>
            <strong>{pending.length}</strong>
          </div>
          <div>
            <span>Acceptées</span>
            <strong>{accepted.length}</strong>
          </div>
          <div>
            <span>Historique</span>
            <strong>{past.length}</strong>
          </div>
          <div>
            <span>Fiches clients</span>
            <strong>{clientProfiles.length}</strong>
          </div>
        </section>
      )}

      {!pageExists && (
        <div className={styles.empty}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> pour recevoir des
          commandes.
        </div>
      )}

      {pageExists && orders.length === 0 && bookings.length === 0 && (
        <div className={styles.empty}>
          Aucune commande pour l&apos;instant. Ajoute des produits dans ta{" "}
          <Link href="/ma-page">vitrine</Link> et partage ton lien.
        </div>
      )}

      {pending.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>Transactions entrantes</p>
              <h2>À traiter</h2>
            </div>
            <span>{pending.length} dossier{pending.length > 1 ? "s" : ""} à valider</span>
          </div>
          <div className={styles.grid}>
            {pending.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} />
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>Dossiers ouverts</p>
              <h2>Acceptées</h2>
            </div>
            <span>{accepted.length} encaissement{accepted.length > 1 ? "s" : ""} en cours</span>
          </div>
          <div className={styles.grid}>
            {accepted.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>Grand livre</p>
              <h2>Historique</h2>
            </div>
            <span>{past.length} transaction{past.length > 1 ? "s" : ""} classée{past.length > 1 ? "s" : ""}</span>
          </div>
          <div className={styles.grid}>
            {past.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} />
            ))}
          </div>
        </section>
      )}

      {pageExists && clientProfiles.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>Carnet d&apos;affaires</p>
              <h2>Fiches clients</h2>
            </div>
            <span>{clientProfiles.length} relation{clientProfiles.length > 1 ? "s" : ""} conservée{clientProfiles.length > 1 ? "s" : ""}</span>
          </div>
          <div className={styles.grid}>
            {clientProfiles.map((profile) => (
              <ClientProfileCard key={profile.key} profile={profile} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
