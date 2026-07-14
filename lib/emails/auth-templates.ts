import { baseLayout, emailButton, emailCode, emailColors } from "./layout";

// Templates des emails d'authentification Supabase (confirmation d'inscription,
// récupération de mot de passe, magic link), DÉRIVÉS du layout partagé pour
// rester visuellement cohérents avec les emails transactionnels Resend.
//
// Contrairement aux templates transactionnels, ceux-ci ne sont pas envoyés par
// le code : ils sont générés en HTML statique (scripts/generate-auth-emails.ts)
// puis collés dans le dashboard Supabase. Les liens sont des placeholders Go
// (`{{ .ConfirmationURL }}`) remplacés par Supabase à l'envoi — ils ne
// contiennent aucun caractère échappé par escapeHtml, donc survivent intacts.

const { MUTED } = emailColors;

// Placeholders substitués par Supabase au moment de l'envoi.
const CONFIRMATION_URL = "{{ .ConfirmationURL }}";

function note(text: string): string {
  return `<p style="color:${MUTED};font-size:13px;">${text}</p>`;
}

export type AuthEmail = { subject: string; html: string };

export function confirmationEmail(confirmationUrl = CONFIRMATION_URL): AuthEmail {
  return {
    subject: "Confirmez votre adresse — FLUX",
    html: baseLayout({
      title: "Confirmez votre adresse",
      preheader: "Activez votre compte FLUX",
      bodyHtml: `
        <p>Bienvenue sur FLUX ! Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.</p>
        ${emailButton("Confirmer mon adresse", confirmationUrl)}
        ${note("Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement cet email.")}`,
    }),
  };
}

export function recoveryEmail(): AuthEmail {
  return {
    subject: "Réinitialisez votre mot de passe — FLUX",
    html: baseLayout({
      title: "Réinitialisez votre mot de passe",
      preheader: "Choisissez un nouveau mot de passe FLUX",
      bodyHtml: `
        <p>Une demande de réinitialisation de mot de passe a été faite pour votre compte FLUX. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
        ${emailButton("Réinitialiser mon mot de passe", CONFIRMATION_URL)}
        ${note("Si vous n’êtes pas à l’origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.")}`,
    }),
  };
}

export function emailChangeEmail(): AuthEmail {
  return {
    subject: "Confirmez votre nouvelle adresse — FLUX",
    html: baseLayout({
      title: "Confirmez le changement d’adresse",
      preheader: "Validez votre nouvelle adresse email FLUX",
      bodyHtml: `
        <p>Une demande de changement d’adresse email a été faite pour votre compte FLUX. Cliquez sur le bouton ci-dessous pour la confirmer.</p>
        ${emailButton("Confirmer mon adresse", CONFIRMATION_URL)}
        ${note("Si vous n’êtes pas à l’origine de cette demande, ignorez cet email et changez votre mot de passe par précaution — votre adresse actuelle reste active tant que ce lien n’est pas validé.")}`,
    }),
  };
}

// La réauthentification transmet un CODE à 6 chiffres ({{ .Token }}), pas un
// lien : l'utilisateur le saisit dans l'app pour confirmer une action sensible.
export function reauthenticationEmail(): AuthEmail {
  return {
    subject: "Votre code de confirmation — FLUX",
    html: baseLayout({
      title: "Confirmez votre identité",
      preheader: "Votre code de confirmation FLUX",
      bodyHtml: `
        <p>Pour confirmer cette action sur votre compte FLUX, saisissez le code ci-dessous dans l’application :</p>
        ${emailCode("{{ .Token }}")}
        ${note("Ce code est à usage unique et expire rapidement. Si vous n’avez rien demandé, ignorez cet email.")}`,
    }),
  };
}

export function magicLinkEmail(): AuthEmail {
  return {
    subject: "Votre lien de connexion — FLUX",
    html: baseLayout({
      title: "Votre lien de connexion",
      preheader: "Connectez-vous à votre espace FLUX",
      bodyHtml: `
        <p>Cliquez sur le bouton ci-dessous pour vous connecter à votre espace FLUX. Ce lien est valable un court instant et à usage unique.</p>
        ${emailButton("Me connecter", CONFIRMATION_URL)}
        ${note("Si vous n’avez pas demandé ce lien, ignorez simplement cet email.")}`,
    }),
  };
}

// Table nom de fichier → contenu, consommée par le script de génération.
// Fonction (et non constante) pour que le pied de page lise NEXT_PUBLIC_SITE_URL
// au moment de l'appel — le script le fixe sur `{{ .SiteURL }}` avant d'appeler.
export function authEmailFiles(): Record<string, AuthEmail> {
  return {
    "confirmation.html": confirmationEmail(),
    "recovery.html": recoveryEmail(),
    "magic-link.html": magicLinkEmail(),
    "email-change.html": emailChangeEmail(),
    "reauthentication.html": reauthenticationEmail(),
  };
}
