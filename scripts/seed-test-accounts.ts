import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis."
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const domain = process.env.TEST_ACCOUNT_DOMAIN ?? "wayne-web.test";
const password = process.env.TEST_ACCOUNT_PASSWORD ?? "Flux-Test-2026!";
const definitions = [
  { key: "abonne", status: "active", plan: "pro" },
  { key: "resilie", status: "canceled", plan: "pro" },
  { key: "pastdue", status: "past_due", plan: "pro" },
  { key: "pack-recent", status: null, plan: "basique", purchaseMonthsAgo: 1 },
  { key: "pack-perime", status: null, plan: "basique", purchaseMonthsAgo: 7 },
  { key: "essai-expire", status: null, plan: "basique" },
] as const;
const emails = definitions.map(({ key }) => `test+${key}@${domain}`);

function isoMonthsAgo(months: number): string {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString();
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function listMatchingUsers(): Promise<Map<string, User>> {
  const found = new Map<string, User>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email && emails.includes(user.email as (typeof emails)[number])) {
        found.set(user.email, user);
      }
    }
    if (data.users.length < 1000) break;
  }
  return found;
}

async function clean(): Promise<void> {
  const users = await listMatchingUsers();
  for (const email of emails) {
    const user = users.get(email);
    if (!user) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    console.log(`Supprimé : ${email}`);
  }
}

async function ensureUser(email: string, existing?: User): Promise<User> {
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Compte de test FLUX" },
  });
  if (error) throw error;
  return data.user;
}

async function seed(): Promise<void> {
  const existing = await listMatchingUsers();
  for (const definition of definitions) {
    const email = `test+${definition.key}@${domain}`;
    const user = await ensureUser(email, existing.get(email));

    const { error: purchasesError } = await admin
      .from("credit_purchases")
      .delete()
      .eq("user_id", user.id);
    if (purchasesError) throw purchasesError;

    // Le quota d'essai doit lui aussi repartir de zéro lors d'un nouveau seed.
    const { error: generationsError } = await admin
      .from("generations")
      .delete()
      .eq("user_id", user.id)
      .like("tool_slug", "flux-%");
    if (generationsError) throw generationsError;

    const subscribed = definition.status === "active";
    const trialExpired = definition.key === "resilie" || definition.key === "essai-expire";
    const subscriptionId =
      definition.status === "active" ||
      definition.status === "canceled" ||
      definition.status === "past_due"
        ? `sub_test_${definition.key.replaceAll("-", "_")}_${user.id.slice(0, 8)}`
        : null;
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan: definition.plan,
        trial_ends_at: trialExpired ? isoDaysFromNow(-1) : isoDaysFromNow(7),
        subscribed_at:
          definition.status === "canceled" || subscribed
            ? isoMonthsAgo(2)
            : null,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: subscribed ? "price_test_pro" : null,
        subscription_status: definition.status,
        current_period_end:
          definition.status === "active" || definition.status === "past_due"
            ? isoDaysFromNow(20)
            : null,
        cancel_at_period_end: false,
        upsell_last_shown_at: null,
      })
      .eq("user_id", user.id);
    if (profileError) throw profileError;

    if ("purchaseMonthsAgo" in definition) {
      const { error } = await admin.from("credit_purchases").insert({
        user_id: user.id,
        stripe_session_id: `cs_test_${definition.key.replaceAll("-", "_")}_${user.id}`,
        pack_id: "pack150",
        credits: 150,
        amount_cents: 5000,
        created_at: isoMonthsAgo(definition.purchaseMonthsAgo),
      });
      if (error) throw error;
    }

    console.log(`Prêt : ${email} (${definition.key})`);
  }
  console.log(`Mot de passe commun : ${password}`);
}

if (process.argv.includes("--clean")) {
  await clean();
} else {
  await seed();
}
