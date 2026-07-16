/**
 * Génère les templates d'emails d'authentification Supabase à partir du layout
 * partagé (lib/emails/layout.ts), pour garantir une seule source de vérité de
 * design entre les emails Resend et les emails d'auth Supabase.
 *
 * Lancement (aucune dépendance à installer) :
 *
 *     npx tsx scripts/generate-auth-emails.ts
 *
 * Recolle ensuite les .html générés dans le dashboard Supabase
 * (Authentication → Email Templates). Voir supabase/email-templates/README.md.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { authEmailFiles } from "../lib/emails/auth-templates";

// Le pied de page du layout lie vers process.env.NEXT_PUBLIC_SITE_URL : on le
// force sur le placeholder Go pour que Supabase substitue la vraie URL à
// l'envoi (et non l'URL locale de génération). authEmailFiles() lit l'env à
// l'appel, donc il suffit de le fixer avant d'appeler la fonction.
process.env.NEXT_PUBLIC_SITE_URL = "{{ .SiteURL }}";

const outDir = join(process.cwd(), "supabase", "email-templates");

for (const [filename, { html, subject }] of Object.entries(authEmailFiles())) {
  const path = join(outDir, filename);
  writeFileSync(path, html + "\n", "utf8");
  // Le sujet est un champ SÉPARÉ du HTML dans le dashboard Supabase : on le
  // rappelle ici, sinon il reste au libellé anglais par défaut.
  console.log(`✓ ${filename.padEnd(22)} sujet: ${subject}`);
}

console.log(
  "\nTerminé. Dans Supabase → Authentication → Emails, coller pour chaque template\nle HTML ET le sujet ci-dessus (deux champs distincts)."
);
