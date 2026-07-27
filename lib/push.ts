import "server-only";

import webpush from "web-push";

// Configuration Web Push (VAPID). Les clés vivent uniquement côté serveur ;
// seule NEXT_PUBLIC_VAPID_PUBLIC_KEY est exposée au navigateur (pour souscrire).
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:contact@flux-wayne.com";

export const pushConfigured = Boolean(publicKey && privateKey);

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey as string, privateKey as string);
}

export { webpush };
