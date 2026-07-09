import { formatPrice } from "@/lib/types";
import {
  baseLayout,
  emailButton,
  emailColors,
  emailFonts,
  escapeHtml,
} from "./layout";

// Templates transactionnels FLUX. Chaque fonction retourne { subject, html }.
// Tous les champs dynamiques passent par escapeHtml.

const { MUTED, LINE, TEXT } = emailColors;
const { SANS } = emailFonts;

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

function itemsTable(items: OrderEmailItem[], totalCents: number): string {
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
      <td style="padding:12px 0;font-family:${SANS};font-size:15px;font-weight:700;color:${TEXT};">Total</td>
      <td align="right" style="padding:12px 0;font-family:${SANS};font-size:15px;font-weight:700;color:${TEXT};">${escapeHtml(formatPrice(totalCents))}</td>
    </tr>
  </table>`;
}

function shortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export function buyerOrderConfirmation(d: OrderEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    <p>Bonjour ${escapeHtml(d.firstName)},</p>
    <p>Votre commande <strong>#${escapeHtml(shortId(d.orderId))}</strong> chez <strong>${escapeHtml(d.shopName)}</strong> a bien été enregistrée. Le vendeur va la traiter et vous recontacter si besoin.</p>
    ${itemsTable(d.items, d.totalCents)}
    ${d.address ? `<p style="color:${MUTED};font-size:13px;">Adresse indiquée : ${escapeHtml(d.address)}</p>` : ""}
    <p style="color:${MUTED};font-size:13px;">Le paiement s'effectue directement auprès du vendeur.</p>`;
  return {
    subject: `Votre commande chez ${d.shopName} est confirmée`,
    html: baseLayout({
      title: "Commande confirmée",
      preheader: `Commande #${shortId(d.orderId)} · ${formatPrice(d.totalCents)}`,
      bodyHtml: body,
    }),
  };
}

export function sellerNewOrder(
  d: OrderEmailData & { buyerPhone: string; buyerEmail?: string | null }
): { subject: string; html: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const contact = [
    `Prénom : ${escapeHtml(d.firstName)}`,
    `Téléphone : ${escapeHtml(d.buyerPhone)}`,
    d.buyerEmail ? `Email : ${escapeHtml(d.buyerEmail)}` : null,
    d.address ? `Adresse : ${escapeHtml(d.address)}` : null,
    d.note ? `Note : ${escapeHtml(d.note)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");
  const body = `
    <p>Vous avez reçu une nouvelle commande <strong>#${escapeHtml(shortId(d.orderId))}</strong>.</p>
    ${itemsTable(d.items, d.totalCents)}
    <p style="margin:16px 0 4px;font-weight:600;">Coordonnées du client</p>
    <p style="color:${MUTED};">${contact}</p>
    ${emailButton("Voir mes commandes", `${siteUrl}/commandes`)}`;
  return {
    subject: `Nouvelle commande — ${d.firstName} · ${formatPrice(d.totalCents)}`,
    html: baseLayout({
      title: "Nouvelle commande",
      preheader: `${d.firstName} · ${formatPrice(d.totalCents)}`,
      bodyHtml: body,
      footerNote: d.buyerEmail
        ? "Répondez à cet email pour contacter directement votre client."
        : "Email transactionnel envoyé automatiquement.",
    }),
  };
}

type StatusEmailData = {
  firstName: string;
  shopName: string;
  orderId: string;
};

export function buyerOrderAccepted(d: StatusEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    <p>Bonjour ${escapeHtml(d.firstName)},</p>
    <p>Bonne nouvelle : votre commande <strong>#${escapeHtml(shortId(d.orderId))}</strong> chez <strong>${escapeHtml(d.shopName)}</strong> a été acceptée et est en cours de préparation.</p>
    <p style="color:${MUTED};font-size:13px;">Le vendeur vous contactera pour la suite si nécessaire.</p>`;
  return {
    subject: `Commande acceptée ✓ — ${d.shopName}`,
    html: baseLayout({ title: "Commande acceptée", bodyHtml: body }),
  };
}

export function buyerOrderCancelled(d: StatusEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    <p>Bonjour ${escapeHtml(d.firstName)},</p>
    <p>Votre commande <strong>#${escapeHtml(shortId(d.orderId))}</strong> chez <strong>${escapeHtml(d.shopName)}</strong> a été annulée.</p>
    <p style="color:${MUTED};font-size:13px;">Pour toute question, contactez directement le vendeur.</p>`;
  return {
    subject: `Commande annulée — ${d.shopName}`,
    html: baseLayout({ title: "Commande annulée", bodyHtml: body }),
  };
}
