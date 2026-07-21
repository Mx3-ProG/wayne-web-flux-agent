import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account password changes can only start from an emailed recovery link", async () => {
  const form = await readFile(new URL("./password-form.tsx", import.meta.url), "utf8");
  const actions = await readFile(
    new URL("../../app/(app)/compte/actions.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(form, /name="new_password"/);
  assert.match(form, /requestAccountPasswordReset/);
  assert.match(actions, /resetPasswordForEmail\(user\.email/);
  assert.match(actions, /auth\/confirm\?next=\/reinitialiser-mot-de-passe/);
});

test("email changes require confirmations and are rate limited", async () => {
  const actions = await readFile(
    new URL("../../app/(app)/compte/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actions, /account-email-change:\$\{user\.id\}/);
  assert.match(actions, /supabase\.auth\.updateUser\(/);
  assert.match(actions, /emailRedirectTo:/);
  // Le message vit désormais dans le dictionnaire i18n (fr = source de
  // vérité) plutôt qu'en dur dans le code ; on vérifie les deux bouts.
  assert.match(actions, /t\.messages\.email_change_requested/);
  const accountDict = JSON.parse(
    await readFile(
      new URL("../../lib/i18n/dictionaries/fr/account.json", import.meta.url),
      "utf8",
    ),
  );
  assert.match(accountDict.messages.email_change_requested, /adresse actuelle et la nouvelle/);
});
