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

// --- Emails de compte / sécurité (envoyés par le code via Resend) ---

// Notification post-changement de mot de passe. Rôle anti-fraude : si l'utilisateur
// n'est pas à l'origine du changement, il doit réagir immédiatement.
export function passwordChangedSecurity(d: { firstName: string }): {
  subject: string;
  html: string;
} {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const body = `
    <p>Bonjour ${escapeHtml(d.firstName)},</p>
    <p>Le mot de passe de votre compte FLUX vient d’être <strong>modifié</strong>. Si vous êtes à l’origine de ce changement, aucune action n’est nécessaire.</p>
    <p style="color:${MUTED};font-size:13px;">Vous ne reconnaissez pas cette action ? Réinitialisez immédiatement votre mot de passe et vérifiez la sécurité de votre boîte mail.</p>
    ${emailButton("Sécuriser mon compte", `${siteUrl}/mot-de-passe-oublie`)}`;
  return {
    subject: "Votre mot de passe FLUX a été modifié",
    html: baseLayout({
      title: "Mot de passe modifié",
      preheader: "Confirmation de sécurité — votre mot de passe a changé",
      bodyHtml: body,
    }),
  };
}

// Invitation d'un ami (partage simple, sans suivi). Met en avant le gain de temps.
export function friendInvite(d: { fromName: string; signupUrl: string }): {
  subject: string;
  html: string;
} {
  const from = escapeHtml(d.fromName);
  const body = `
    <p><strong>${from}</strong> vous invite à découvrir <strong>FLUX</strong>.</p>
    <p>FLUX réunit au même endroit votre vitrine en ligne, vos commandes, vos rendez-vous et vos contenus. Fini les dizaines d’outils éparpillés : une seule connexion, tout votre commerce sous les yeux.</p>
    <p style="color:${MUTED};font-size:14px;">Ce que ${from} y a gagné :</p>
    <ul style="margin:8px 0 4px;padding-left:20px;color:${TEXT};font-size:14px;line-height:1.7;">
      <li>Des heures économisées chaque semaine sur la gestion</li>
      <li>Une vitrine pro en ligne en quelques minutes</li>
      <li>Ses commandes et son chiffre d’affaires suivis en un coup d’œil</li>
    </ul>
    ${emailButton("Créer ma vitrine en 2 minutes", d.signupUrl)}
    <p style="color:${MUTED};font-size:13px;">7 jours d’essai offerts, sans engagement.</p>`;
  return {
    subject: `${d.fromName} vous invite à essayer FLUX`,
    html: baseLayout({
      title: "Reprenez la main sur votre commerce",
      preheader: `${d.fromName} pense que FLUX peut vous faire gagner un temps précieux`,
      bodyHtml: body,
      footerNote:
        "Vous recevez cet email car un utilisateur de FLUX vous a invité. Aucune action n’est requise si cela ne vous intéresse pas.",
    }),
  };
}

export function buyerOrderReady(d: StatusEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    <p>Bonjour ${escapeHtml(d.firstName)},</p>
    <p>Votre commande <strong>#${escapeHtml(shortId(d.orderId))}</strong> chez <strong>${escapeHtml(d.shopName)}</strong> est <strong>prête</strong> ! Vous pouvez venir la récupérer.</p>
    <p style="color:${MUTED};font-size:13px;">Le vendeur vous précisera les modalités de retrait si nécessaire.</p>`;
  return {
    subject: `Votre commande est prête ✓ — ${d.shopName}`,
    html: baseLayout({
      title: "Commande prête",
      preheader: `Commande #${shortId(d.orderId)} prête à être récupérée`,
      bodyHtml: body,
    }),
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
