"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          name="new_password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </Button>
    </form>
  );
}
