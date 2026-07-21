// Layout de base des emails FLUX : table 600px, styles inline, thème sombre.
// Les clients mail n'appliquent pas les CSS externes ni les webfonts : tout
// est inline, avec des font stacks système (serif pour les titres).

import { LOCALE_BCP47, type Locale } from "@/lib/i18n/config";

const CANVAS = "#070708";
const SURFACE = "#121216";
const TEXT = "#f7f5f2";
const MUTED = "#a8a4aa";
const RED = "#ef233c";
const LINE = "rgba(255,255,255,0.10)";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${RED};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

// Bloc de code à usage unique (OTP) : grand, espacé, sélectionnable. Utilisé
// par les emails qui transmettent un code plutôt qu'un lien (reauthentication).
export function emailCode(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border:1px solid ${LINE};border-radius:12px;background:${CANVAS};padding:18px 28px;">
    <span style="font-family:${SANS};font-size:30px;font-weight:700;letter-spacing:8px;color:${TEXT};">${escapeHtml(code)}</span>
  </td></tr></table>`;
}

export function baseLayout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerNote?: string;
  locale?: Locale;
  footerTagline?: string;
}): string {
  const locale = opts.locale ?? "fr";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";
  const footerNote =
    opts.footerNote ??
    "Email transactionnel envoyé automatiquement, merci de ne pas y répondre.";
  const footerTagline = opts.footerTagline ?? "— votre vitrine, vos commandes, votre chiffre d'affaires.";

  return `<!DOCTYPE html>
<html lang="${LOCALE_BCP47[locale]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:0 8px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;vertical-align:middle;">
          <img src="${escapeHtml(siteUrl)}/flux-email-logo.png" width="48" height="32" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:48px;height:32px;">
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:${SERIF};font-size:26px;font-weight:700;letter-spacing:1px;color:${TEXT};">FLUX<span style="color:${RED};">.</span></span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${SURFACE};border:1px solid ${LINE};border-radius:16px;padding:32px 28px;">
      <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:22px;font-weight:700;color:${TEXT};">${escapeHtml(opts.title)}</h1>
      <div style="font-family:${SANS};font-size:15px;line-height:1.6;color:${TEXT};">
        ${opts.bodyHtml}
      </div>
    </td></tr>
    <tr><td style="padding:20px 8px 0;">
      <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(footerNote)}<br>
        <a href="${escapeHtml(siteUrl)}" style="color:${MUTED};text-decoration:underline;">FLUX</a> ${escapeHtml(footerTagline)}
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export const emailColors = { CANVAS, SURFACE, TEXT, MUTED, RED, LINE };
export const emailFonts = { SERIF, SANS };
