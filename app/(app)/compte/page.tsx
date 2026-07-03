import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CreditEntry } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { PasswordForm } from "@/components/account/password-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Mon compte" };

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: lastRecharge }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("credit_ledger")
      .select("created_at, reason")
      .eq("user_id", user.id)
      .in("reason", ["signup", "monthly"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<CreditEntry, "created_at" | "reason">>(),
  ]);

  const nextRecharge = lastRecharge
    ? new Date(
        new Date(lastRecharge.created_at).getTime() + 30 * 86400_000
      ).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Mon compte</h1>

      <Card>
        <CardContent className="pt-1">
          <dl className="divide-y divide-border text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">Nom</dt>
              <dd>{profile?.name || "—"}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">Statut</dt>
              <dd>Accès gratuit</dd>
            </div>
            {nextRecharge && (
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">Crédits</dt>
                <dd>Recharge le {nextRecharge}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer mon mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Se déconnecter</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              Se déconnecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
