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
  assert.match(actions, /adresse actuelle et la nouvelle/);
});
