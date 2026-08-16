import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Adaptateur Twilio : validation de signature + génération TwiML. Pas de SDK
// `twilio` ajouté au projet — TwiML est du XML simple, la signature une
// HMAC-SHA1 documentée ; éviter une dépendance pour ça reste dans l'esprit
// « réutiliser l'existant, ne pas disperser d'appels fournisseur ailleurs
// dans le code ». Si un second provider de téléphonie arrive un jour, cette
// doctrine (fonctions pures, pas de couplage au SDK) rendra l'abstraction
// facile à généraliser.

// -------------------------------------------------------------- signature
// Algorithme Twilio : HMAC-SHA1(authToken, url + concat(sorted(key+value)))
// puis base64. `url` doit être l'URL exacte configurée dans la console
// Twilio (schéma + host + path + querystring), telle que Twilio l'a appelée.
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

// ------------------------------------------------------------------ TwiML
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Voix Twilio (Amazon Polly) autorisées par langue — allowlist stricte : la
// valeur vient de voice_agent_config.voice, saisie par le commerçant, jamais
// injectée telle quelle dans un attribut TwiML sans validation.
const ALLOWED_VOICES: Record<string, Record<string, string>> = {
  fr: { default: "Polly.Lea-Neural", homme: "Polly.Mathieu-Neural", femme: "Polly.Lea-Neural" },
  en: { default: "Polly.Joanna-Neural", homme: "Polly.Matthew-Neural", femme: "Polly.Joanna-Neural" },
  es: { default: "Polly.Lucia-Neural", homme: "Polly.Sergio-Neural", femme: "Polly.Lucia-Neural" },
};

function resolveVoice(language: string, requested: string): string {
  const voices = ALLOWED_VOICES[language] ?? ALLOWED_VOICES.fr;
  return voices[requested] ?? voices.default;
}

function langTag(language: string): string {
  return language === "en" ? "en-US" : language === "es" ? "es-ES" : "fr-FR";
}

function say(text: string, language: string, voice: string): string {
  return `<Say voice="${resolveVoice(language, voice)}" language="${langTag(language)}">${escapeXml(text)}</Say>`;
}

export type GatherOptions = {
  actionUrl: string;
  prompt: string;
  language: string;
  voice: string;
  timeoutSec?: number;
};

// <Gather input="speech"> : la reconnaissance vocale de Twilio fait le STT,
// le résultat texte arrive en POST (SpeechResult) sur actionUrl.
function gatherSpeech(opts: GatherOptions): string {
  const timeout = opts.timeoutSec ?? 5;
  return (
    `<Gather input="speech" action="${escapeXml(opts.actionUrl)}" method="POST" ` +
    `speechTimeout="auto" timeout="${timeout}" language="${langTag(opts.language)}">` +
    say(opts.prompt, opts.language, opts.voice) +
    `</Gather>`
  );
}

function dial(number: string, actionUrl?: string): string {
  const action = actionUrl ? ` action="${escapeXml(actionUrl)}" method="POST"` : "";
  return `<Dial${action}>${escapeXml(number)}</Dial>`;
}

function hangup(): string {
  return "<Hangup/>";
}

function response(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export const twilioTwiml = { say, gatherSpeech, dial, hangup, response };

// Lit le corps form-encoded d'une requête webhook Twilio et vérifie sa
// signature avant de rendre le moindre paramètre à l'appelant. `request.url`
// doit être l'URL exacte configurée dans la console Twilio ; /api/** est
// exclu du proxy i18n (proxy.ts) donc non réécrit avant d'arriver ici.
export async function verifiedTwilioParams(request: Request): Promise<Record<string, string> | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return null;

  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  if (!verifyTwilioSignature(request.url, params, signature, authToken)) return null;
  return params;
}

