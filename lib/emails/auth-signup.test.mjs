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

test("signup uses a generated link and the configured transactional email provider", async () => {
  const action = await readFile(
    new URL("../../app/login/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(action, /admin\.auth\.admin\.generateLink\(/);
  assert.match(action, /sendEmailWithResult\(/);
  assert.doesNotMatch(action, /supabase\.auth\.signUp\(/);
  assert.match(action, /admin\.auth\.admin\.deleteUser\(data\.user\.id\)/);
});
