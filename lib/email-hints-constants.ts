// Extrait de lib/email-hints.ts (qui a "server-only") pour rester importable
// depuis des Client Components — même logique que lib/karlmada-constants.ts.

// Webmail du destinataire, déduit du domaine de son adresse. « Va voir tes
// emails » se traduit sinon par : ouvrir un onglet, chercher son fournisseur,
// se connecter — et abandonner. On ouvre la bonne boîte directement.
//
// La liste est volontairement courte : les fournisseurs grand public français,
// plus les internationaux courants. Un domaine inconnu (adresse pro, hébergeur
// perso) renvoie null — mieux vaut pas de bouton qu'un bouton qui se trompe.
const WEBMAILS: { url: string; label: string; domains: string[] }[] = [
  { url: "https://mail.google.com/mail/u/0/#search/wayne+web+flux", label: "Gmail", domains: ["gmail.com", "googlemail.com"] },
  { url: "https://outlook.live.com/mail/0/", label: "Outlook", domains: ["outlook.fr", "outlook.com", "hotmail.fr", "hotmail.com", "live.fr", "live.com", "msn.com"] },
  { url: "https://mail.yahoo.com/", label: "Yahoo Mail", domains: ["yahoo.fr", "yahoo.com", "ymail.com"] },
  { url: "https://www.icloud.com/mail", label: "iCloud Mail", domains: ["icloud.com", "me.com", "mac.com"] },
  { url: "https://mail.orange.fr/", label: "Orange", domains: ["orange.fr", "wanadoo.fr"] },
  { url: "https://zimbra.free.fr/", label: "Free", domains: ["free.fr"] },
  { url: "https://webmail.sfr.fr/", label: "SFR", domains: ["sfr.fr", "neuf.fr"] },
  { url: "https://www.laposte.net/accueil", label: "La Poste", domains: ["laposte.net"] },
  { url: "https://mail.proton.me/", label: "Proton Mail", domains: ["proton.me", "protonmail.com"] },
];

export function webmail(email: string): { url: string; label: string } | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  const match = WEBMAILS.find((entry) => entry.domains.includes(domain));
  return match ? { url: match.url, label: match.label } : null;
}
