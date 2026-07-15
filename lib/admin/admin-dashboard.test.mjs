import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("la migration amorce les deux superadmins et protège les opérations", async () => {
  const sql = await read("supabase/migrations/00026_admin_dashboard.sql");
  assert.match(sql, /deffontainesmathieu@gmail\.com/);
  assert.match(sql, /thomasdufeal@gmail\.com/);
  assert.match(sql, /revoke execute on function public\.publish_page_unchecked\(uuid\)/);
  assert.match(sql, /moderation_fields_are_server_managed/);
  assert.match(sql, /admin_audit_logs_are_immutable/);
  assert.match(sql, /admin_adjust_credit/);
});

test("le dashboard impose clé secrète, appartenance et MFA AAL2", async () => {
  const [config, auth, layout] = await Promise.all([
    read("lib/admin/config.ts"),
    read("lib/admin/auth.ts"),
    read("app/[adminKey]/layout.tsx"),
  ]);
  assert.match(config, /key\.length >= 24/);
  assert.match(auth, /admin_memberships/);
  assert.match(auth, /currentLevel === "aal2"/);
  assert.match(layout, /adminKey !== configuredKey/);
  assert.match(layout, /MfaGate/);
});

test("les crédits restent un ledger et les tokens IA restent séparés", async () => {
  const [sql, usage] = await Promise.all([
    read("supabase/migrations/00026_admin_dashboard.sql"),
    read("lib/ai-usage.ts"),
  ]);
  assert.match(sql, /insert into public\.credit_ledger/);
  assert.match(sql, /delta_value := target_balance - current_balance/);
  assert.match(sql, /create table public\.ai_usage_events/);
  assert.match(usage, /input_tokens/);
  assert.match(usage, /output_tokens/);
});

test("l’archivage bloque la publication et une publication invalide le badge", async () => {
  const sql = await read("supabase/migrations/00026_admin_dashboard.sql");
  assert.match(sql, /moderation_status = 'archived'/);
  assert.match(sql, /raise exception 'page_archived'/);
  assert.match(sql, /set moderation_status = 'unverified'/);
  assert.match(sql, /moderation_was_published/);
});

