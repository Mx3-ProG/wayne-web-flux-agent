"use client";

import { useActionState } from "react";
import { requestAccountPasswordReset } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function PasswordForm() {
  const [state, action, pending] = useActionState(
    requestAccountPasswordReset,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Mot de passe</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Reçois un lien sécurisé à ton adresse email actuelle pour choisir un
          nouveau mot de passe.
        </p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        <Mail aria-hidden="true" />
        {pending ? "Envoi…" : "J’ai oublié mon mot de passe"}
      </Button>
    </form>
  );
}
