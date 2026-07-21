import { formatPrice } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import {
  baseLayout,
  emailButton,
  emailColors,
  emailFonts,
  escapeHtml,
} from "./layout";

// Templates transactionnels FLUX. Chaque fonction retourne { subject, html }.
// Tous les champs dynamiques passent par escapeHtml. `locale` détermine la
// langue du texte fixe (chrome de l'email) — jamais les données métier.

const { MUTED, LINE, TEXT } = emailColors;
const { SANS } = emailFonts;

function tpl(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    text
  );
}

export type OrderEmailItem = {
  name: string;
  quantity: number;
  unit_price_cents: number;
};

export type OrderEmailData = {
  orderId: string;
  firstName: string;
  totalCents: number;
  items: OrderEmailItem[];
  shopName: string;
  address?: string | null;
  note?: string | null;
};

function itemsTable(items: OrderEmailItem[], totalCents: number, totalLabel: string): string {
  const rows = items
    .map(
      (it) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${TEXT};">${escapeHtml(it.name)} × ${it.quantity}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${TEXT};">${escapeHtml(formatPrice(it.unit_price_cents * it.quantity))}</td>
    </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${rows}
    <tr>
      <td style="padding:12px 0;font-family:${SANS};font-size:15px;font-weight:700;color:${TEXT};">${escapeHtml(totalLabel)}</td>
      <td align="right" style="padding:12px 0;font-family:${SANS};font-size:15px;font-weight:700;color:${TEXT};">${escapeHtml(formatPrice(totalCents))}</td>
    </tr>
  </table>`;
}

function shortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export async function buyerOrderConfirmation(
  d: OrderEmailData,
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.order.buyerConfirmation;
  const id = shortId(d.orderId);
  const total = formatPrice(d.totalCents);
  const body = `
    <p>${escapeHtml(tpl(o.greeting, { firstName: d.firstName }))}</p>
    <p>${tpl(o.body, { orderId: escapeHtml(id), shopName: escapeHtml(d.shopName) })}</p>
    ${itemsTable(d.items, d.totalCents, t.total)}
    ${d.address ? `<p style="color:${MUTED};font-size:13px;">${escapeHtml(tpl(o.addressLabel, { address: d.address }))}</p>` : ""}
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.paymentNote)}</p>`;
  return {
    subject: tpl(o.subject, { shopName: d.shopName }),
    html: baseLayout({
      title: o.title,
      preheader: tpl(o.preheader, { orderId: id, total }),
      bodyHtml: body,
      locale,
      footerTagline: t.footer.tagline,
    }),
  };
}

export async function sellerNewOrder(
  d: OrderEmailData & { buyerPhone: string; buyerEmail?: string | null },
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.order.sellerNewOrder;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const contact = [
    tpl(o.contactName, { value: escapeHtml(d.firstName) }),
    tpl(o.contactPhone, { value: escapeHtml(d.buyerPhone) }),
    d.buyerEmail ? tpl(o.contactEmail, { value: escapeHtml(d.buyerEmail) }) : null,
    d.address ? tpl(o.contactAddress, { value: escapeHtml(d.address) }) : null,
    d.note ? tpl(o.contactNote, { value: escapeHtml(d.note) }) : null,
  ]
    .filter(Boolean)
    .join("<br>");
  const id = shortId(d.orderId);
  const total = formatPrice(d.totalCents);
  const body = `
    <p>${tpl(o.body, { orderId: escapeHtml(id) })}</p>
    ${itemsTable(d.items, d.totalCents, t.total)}
    <p style="margin:16px 0 4px;font-weight:600;">${escapeHtml(o.contactTitle)}</p>
    <p style="color:${MUTED};">${contact}</p>
    ${emailButton(o.viewOrders, `${siteUrl}/commandes`)}`;
  return {
    subject: tpl(o.subject, { firstName: d.firstName, total }),
    html: baseLayout({
      title: o.title,
      preheader: tpl(o.preheader, { firstName: d.firstName, total }),
      bodyHtml: body,
      locale,
      footerTagline: t.footer.tagline,
      footerNote: d.buyerEmail ? o.footerReply : o.footerAuto,
    }),
  };
}

type StatusEmailData = {
  firstName: string;
  shopName: string;
  orderId: string;
};

export async function buyerOrderAccepted(
  d: StatusEmailData,
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.order.buyerAccepted;
  const id = shortId(d.orderId);
  const body = `
    <p>${escapeHtml(tpl(o.greeting, { firstName: d.firstName }))}</p>
    <p>${tpl(o.body, { orderId: escapeHtml(id), shopName: escapeHtml(d.shopName) })}</p>
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.note)}</p>`;
  return {
    subject: tpl(o.subject, { shopName: d.shopName }),
    html: baseLayout({ title: o.title, bodyHtml: body, locale, footerTagline: t.footer.tagline }),
  };
}

// --- Emails de compte / sécurité (envoyés par le code via Resend) ---

// Notification post-changement de mot de passe. Rôle anti-fraude : si l'utilisateur
// n'est pas à l'origine du changement, il doit réagir immédiatement.
export async function passwordChangedSecurity(
  d: { firstName: string },
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.account.passwordChanged;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const body = `
    <p>${escapeHtml(tpl(o.greeting, { firstName: d.firstName }))}</p>
    <p>${o.body}</p>
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.note)}</p>
    ${emailButton(o.cta, `${siteUrl}/mot-de-passe-oublie`)}`;
  return {
    subject: o.subject,
    html: baseLayout({
      title: o.title,
      preheader: o.preheader,
      bodyHtml: body,
      locale,
      footerTagline: t.footer.tagline,
    }),
  };
}

// Invitation d'un ami (partage simple, sans suivi). Met en avant le gain de temps.
export async function friendInvite(
  d: { fromName: string; signupUrl: string },
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.account.friendInvite;
  const from = escapeHtml(d.fromName);
  const body = `
    <p>${tpl(o.intro, { fromName: from })}</p>
    <p>${o.pitch}</p>
    <p style="color:${MUTED};font-size:14px;">${tpl(o.gainsIntro, { fromName: from })}</p>
    <ul style="margin:8px 0 4px;padding-left:20px;color:${TEXT};font-size:14px;line-height:1.7;">
      <li>${escapeHtml(o.gain1)}</li>
      <li>${escapeHtml(o.gain2)}</li>
      <li>${escapeHtml(o.gain3)}</li>
    </ul>
    ${emailButton(o.cta, d.signupUrl)}
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.trial)}</p>`;
  return {
    subject: tpl(o.subject, { fromName: d.fromName }),
    html: baseLayout({
      title: o.title,
      preheader: tpl(o.preheader, { fromName: d.fromName }),
      bodyHtml: body,
      locale,
      footerTagline: t.footer.tagline,
      footerNote: o.footer,
    }),
  };
}

export async function buyerOrderReady(
  d: StatusEmailData,
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.order.buyerReady;
  const id = shortId(d.orderId);
  const body = `
    <p>${escapeHtml(tpl(o.greeting, { firstName: d.firstName }))}</p>
    <p>${tpl(o.body, { orderId: escapeHtml(id), shopName: escapeHtml(d.shopName) })}</p>
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.note)}</p>`;
  return {
    subject: tpl(o.subject, { shopName: d.shopName }),
    html: baseLayout({
      title: o.title,
      preheader: tpl(o.preheader, { orderId: id }),
      bodyHtml: body,
      locale,
      footerTagline: t.footer.tagline,
    }),
  };
}

export async function buyerOrderCancelled(
  d: StatusEmailData,
  locale: Locale = "fr"
): Promise<{ subject: string; html: string }> {
  const t = await getDictionary(locale, "emails");
  const o = t.order.buyerCancelled;
  const id = shortId(d.orderId);
  const body = `
    <p>${escapeHtml(tpl(o.greeting, { firstName: d.firstName }))}</p>
    <p>${tpl(o.body, { orderId: escapeHtml(id), shopName: escapeHtml(d.shopName) })}</p>
    <p style="color:${MUTED};font-size:13px;">${escapeHtml(o.note)}</p>`;
  return {
    subject: tpl(o.subject, { shopName: d.shopName }),
    html: baseLayout({ title: o.title, bodyHtml: body, locale, footerTagline: t.footer.tagline }),
  };
}
