import { createAdminClient } from "@/lib/supabase/admin";
import { loadAccountAccess } from "@/lib/account-status";
import { checkFluxAccess } from "@/lib/flux/access";

const domain = process.env.TEST_ACCOUNT_DOMAIN ?? "wayne-web.test";
const cases = [
  { key: "abonne", status: "subscribed", ai: true, publication: true },
  { key: "resilie", status: "trial_expired", ai: false, publication: false },
  { key: "pastdue", status: "subscribed", ai: true, publication: true },
  { key: "pack-recent", status: "credits_active", ai: true, publication: true },
  { key: "pack-perime", status: "credits_expired", ai: false, publication: true },
  { key: "essai-expire", status: "trial_expired", ai: false, publication: false },
] as const;

const admin = createAdminClient();
let failed = false;

for (const expected of cases) {
  const email = `test+${expected.key}@${domain}`;
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) {
    console.error(`MANQUANT ${email} — lance npm run seed:test-accounts`);
    failed = true;
    continue;
  }

  const [account, site, prefill, { data: publication }] = await Promise.all([
    loadAccountAccess(user.id),
    checkFluxAccess(user.id, "site"),
    checkFluxAccess(user.id, "prefill"),
    admin.rpc("has_active_access", { uid: user.id }),
  ]);
  const actual = {
    email,
    status: account.status,
    ai: account.aiAllowed,
    site: site.ok,
    prefill: prefill.ok,
    publication: publication === true,
  };
  console.log(actual);

  if (
    account.status !== expected.status ||
    account.aiAllowed !== expected.ai ||
    site.ok !== expected.ai ||
    prefill.ok !== expected.ai ||
    actual.publication !== expected.publication
  ) {
    failed = true;
    console.error("ATTENDU", expected);
  }
}

if (failed) process.exitCode = 1;
