import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("confirmationEmail accepts the generated signup link", async () => {
  const templates = await readFile(
    new URL("./auth-templates.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    templates,
    /confirmationEmail\(confirmationUrl = CONFIRMATION_URL\)/,
  );
  assert.match(
    templates,
    /emailButton\("Confirmer mon adresse", confirmationUrl\)/,
  );
});

// Le compte se crée désormais dans le tunnel (app/commencer/actions.ts,
// createAccount), pas dans app/login/actions.ts : le tunnel ouvre la session
// et enchaîne sur le Parcours sans coupure « va voir tes emails ». Ce test a
// suivi ce déplacement d'architecture.
test("signup creates the user via the admin API and sends through the configured transactional email provider", async () => {
  const action = await readFile(
    new URL("../../app/commencer/actions.ts", import.meta.url),
    "utf8",
  );

  // Création directe via l'API admin (email_confirm: true), pas signUp() :
  // évite le blocage email_not_confirmed que déclencherait signUp si le
  // projet Supabase exige la confirmation.
  assert.match(action, /admin\.auth\.admin\.createUser\(/);
  assert.doesNotMatch(action, /supabase\.auth\.signUp\(/);

  // Vérification d'adresse : jeton maison (pas admin.auth.admin.generateLink),
  // envoyé par le fournisseur transactionnel configuré.
  assert.match(action, /createVerificationToken\(/);
  assert.match(action, /emailVerificationEmail\(/);
  assert.match(action, /sendEmailWithResult\(/);

  // Décision assumée (voir le commentaire au-dessus de l'appel) : contrairement
  // à l'ancien flux signUp, un échec d'envoi de l'email de vérification ne
  // supprime PAS le compte — la session existe déjà, le tunnel continue, et le
  // bandeau du dashboard permet de renvoyer l'email plus tard.
  assert.doesNotMatch(action, /admin\.auth\.admin\.deleteUser\(/);
});
