// Layout de base des emails FLUX : table 600px, styles inline, thème sombre.
// Les clients mail n'appliquent pas les CSS externes ni les webfonts : tout
// est inline, avec des font stacks système (serif pour les titres).

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

export function baseLayout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://flux.app";
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : "";
  const footerNote =
    opts.footerNote ??
    "Email transactionnel envoyé automatiquement, merci de ne pas y répondre.";

  return `<!DOCTYPE html>
<html lang="fr">
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
      <span style="font-family:${SERIF};font-size:26px;font-weight:700;letter-spacing:1px;color:${TEXT};">FLUX<span style="color:${RED};">.</span></span>
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
        <a href="${escapeHtml(siteUrl)}" style="color:${MUTED};text-decoration:underline;">FLUX</a> — votre vitrine, vos commandes, votre chiffre d'affaires.
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
