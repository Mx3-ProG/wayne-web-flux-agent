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
import type { OrdersDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { formatDate as formatDateIntl } from "@/lib/i18n/format";

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

const STATUS_CLASS: Record<Order["status"], string> = {
  pending: styles.badgePending,
  accepted: styles.badgeAccepted,
  fulfilled: styles.badgeFulfilled,
  cancelled: styles.badgeCancelled,
};

function formatDate(locale: Locale, iso: string): string {
  return formatDateIntl(locale, iso, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBookingDate(locale: Locale, booking: Booking): string {
  return formatDateIntl(locale, `${booking.date}T${booking.start_time}`, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function itemKindLabel(t: OrdersDict, item: OrderItemWithCatalog): string {
  if (item.offer_id) return t.itemKind.offer;
  if (item.products?.kind === "reservation") return t.itemKind.reservation;
  return t.itemKind.product;
}

function ClientSheet({
  firstName,
  phone,
  email,
  address,
  interactions,
  t,
}: {
  firstName?: string;
  phone: string;
  email: string | null;
  address: string;
  interactions: number;
  t: OrdersDict;
}) {
  return (
    <section className={styles.clientSheet} aria-label={t.clientSheet.aria}>
      <div className={styles.sheetHead}>
        <h3>{firstName ? t.clientSheet.titleWithName.replace("{name}", firstName) : t.clientSheet.titleDefault}</h3>
        <span>{t.clientSheet.interactions.replace("{count}", String(interactions))}</span>
      </div>
      <dl className={styles.contactGrid}>
        <div>
          <dt>{t.clientSheet.phone}</dt>
          <dd>{phone || t.clientSheet.notProvided}</dd>
        </div>
        <div>
          <dt>{t.clientSheet.email}</dt>
          <dd>{email || t.clientSheet.notProvided}</dd>
        </div>
        <div className={styles.contactWide}>
          <dt>{t.clientSheet.address}</dt>
          <dd>{address || t.clientSheet.addressNotProvided}</dd>
        </div>
      </dl>
    </section>
  );
}

function ClientHistoryList({ history, locale, t }: { history: ClientHistory; locale: Locale; t: OrdersDict }) {
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
        <h3>{t.history.title}</h3>
        <span>{t.history.purchases.replace("{count}", String(allOrderItems.length + history.bookings.length))}</span>
      </div>
      <div className={styles.historyList}>
        {allOrderItems.map((item) => (
          <div key={`item-${item.id}`} className={styles.historyRow}>
            <span className={styles.historyType}>{itemKindLabel(t, item)}</span>
            <span className={styles.historyName}>
              {item.quantity}x {item.name}
            </span>
            <span className={styles.historyMeta}>
              {t.status[item.orderStatus]} · {formatDate(locale, item.orderDate)} ·{" "}
              {formatPrice(item.line_total_cents, locale)}
            </span>
          </div>
        ))}
        {history.bookings.map((booking) => (
          <div key={`booking-${booking.id}`} className={styles.historyRow}>
            <span className={styles.historyType}>{t.history.reservation}</span>
            <span className={styles.historyName}>{booking.service_name}</span>
            <span className={styles.historyMeta}>
              {booking.status === "cancelled" ? t.bookingStatus.cancelled : t.bookingStatus.confirmed} ·{" "}
              {formatBookingDate(locale, booking)} · {formatPrice(booking.price_cents, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  history,
  locale,
  t,
}: {
  order: OrderWithItems;
  history: ClientHistory;
  locale: Locale;
  t: OrdersDict;
}) {
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
          <small>{t.orderCard.transaction}</small>
          <strong>{order.first_name || t.orderCard.defaultClient}</strong>
          <span>
            {order.phone}
            {order.email ? ` · ${order.email}` : ""} · {formatDate(locale, order.created_at)}
          </span>
        </span>
        <span className={styles.entryStats}>
          <span className={`${styles.badge} ${STATUS_CLASS[order.status]}`}>
            {t.status[order.status]}
          </span>
          <strong>{formatPrice(order.total_cents, locale)}</strong>
          <small>{orderItemsCount} {orderItemsCount > 1 ? t.orderCard.itemPlural : t.orderCard.itemSingular}</small>
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
          t={t}
        />

        <div className={styles.items}>
          {order.order_items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span>
                <b>{item.quantity}x</b> {item.name}{" "}
                <small className={styles.itemKind}>{itemKindLabel(t, item)}</small>
              </span>
              <span>{formatPrice(item.line_total_cents, locale)}</span>
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
                  {t.orderCard.accept}
                </button>
              </form>
            )}
            {order.status === "accepted" && (
              <form action={fulfillOrder.bind(null, order.id)}>
                <button type="submit" className={`flux-button-smooth ${styles.btn} ${styles.btnPrimary}`}>
                  <Banknote aria-hidden="true" />
                  {t.orderCard.markDone}
                </button>
              </form>
            )}
            <form action={cancelOrder.bind(null, order.id)}>
              <button type="submit" className={`${styles.btn} ${styles.btnGhost}`}>
                {order.status === "pending" ? t.orderCard.refuse : t.orderCard.cancel}
              </button>
            </form>
          </div>
        )}

        <ClientHistoryList history={history} locale={locale} t={t} />
      </div>
    </details>
  );
}

function ClientProfileCard({ profile, locale, t }: { profile: ClientProfile; locale: Locale; t: OrdersDict }) {
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
          <small>{t.clientProfile.dossier}</small>
          <strong>{profile.firstName || t.orderCard.defaultClient}</strong>
          <span>
            {profile.phone}
            {profile.email ? ` · ${profile.email}` : ""}
          </span>
        </span>
        <span className={styles.entryStats}>
          <strong>{formatPrice(clientRevenue, locale)}</strong>
          <small>{interactions} {interactions > 1 ? t.clientProfile.interactionPlural : t.clientProfile.interactionSingular}</small>
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
          t={t}
        />
        <ClientHistoryList history={profile.history} locale={locale} t={t} />
      </div>
    </details>
  );
}

export function CommandesLedger({
  pageExists,
  orders,
  bookings,
  locale,
  t,
}: {
  pageExists: boolean;
  orders: OrderWithItems[];
  bookings: Booking[];
  locale: Locale;
  t: OrdersDict;
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
          {t.hero.kicker}
        </span>
        <div className={styles.vaultMark} aria-hidden="true">
          <WalletCards />
        </div>
        <h1>
          {t.hero.titleStart}<span>{t.hero.titleEm}</span>
        </h1>
        <p>{t.hero.text}</p>
        <div className={styles.vaultCount}>
          <Sparkles aria-hidden="true" />
          <strong>{formatPrice(portfolioTotal, locale)}</strong>
          <span>{orders.length} {orders.length > 1 ? t.hero.movementPlural : t.hero.movementSingular}</span>
        </div>
      </header>

      {pageExists && (orders.length > 0 || bookings.length > 0) && (
        <section className={styles.metrics} aria-label={t.metrics.aria}>
          <div>
            <span>{t.metrics.toProcess}</span>
            <strong>{pending.length}</strong>
          </div>
          <div>
            <span>{t.metrics.accepted}</span>
            <strong>{accepted.length}</strong>
          </div>
          <div>
            <span>{t.metrics.history}</span>
            <strong>{past.length}</strong>
          </div>
          <div>
            <span>{t.metrics.clientSheets}</span>
            <strong>{clientProfiles.length}</strong>
          </div>
        </section>
      )}

      {!pageExists && (
        <div className={styles.empty}>
          {t.empty.noPageStart} <Link href="/ma-page">{t.empty.noPageLink}</Link>{" "}
          {t.empty.noPageEnd}
        </div>
      )}

      {pageExists && orders.length === 0 && bookings.length === 0 && (
        <div className={styles.empty}>
          {t.empty.noOrdersStart}{" "}
          <Link href="/ma-page">{t.empty.noOrdersLink}</Link> {t.empty.noOrdersEnd}
        </div>
      )}

      {pending.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>{t.sections.incoming}</p>
              <h2>{t.sections.toProcess}</h2>
            </div>
            <span>{t.sections.toProcessCount.replace("{count}", String(pending.length))}</span>
          </div>
          <div className={styles.grid}>
            {pending.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>{t.sections.openLabel}</p>
              <h2>{t.sections.accepted}</h2>
            </div>
            <span>{t.sections.acceptedCount.replace("{count}", String(accepted.length))}</span>
          </div>
          <div className={styles.grid}>
            {accepted.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>{t.sections.ledger}</p>
              <h2>{t.sections.history}</h2>
            </div>
            <span>{t.sections.historyCount.replace("{count}", String(past.length))}</span>
          </div>
          <div className={styles.grid}>
            {past.map((order) => (
              <OrderCard key={order.id} order={order} history={historyFor(order)} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}

      {pageExists && clientProfiles.length > 0 && (
        <section className={styles.collection}>
          <div className={styles.collectionHead}>
            <div>
              <p className={styles.greenLabel}>{t.sections.book}</p>
              <h2>{t.sections.clientSheets}</h2>
            </div>
            <span>{t.sections.clientSheetsCount.replace("{count}", String(clientProfiles.length))}</span>
          </div>
          <div className={styles.grid}>
            {clientProfiles.map((profile) => (
              <ClientProfileCard key={profile.key} profile={profile} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
