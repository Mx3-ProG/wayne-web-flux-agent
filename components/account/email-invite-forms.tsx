"use client";

import { useActionState } from "react";
import { changeEmail, inviteFriend } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(changeEmail, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Adresse email</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ton adresse actuelle est <strong className="text-foreground">{currentEmail}</strong>.
          Le changement exige une confirmation depuis l’ancienne et la nouvelle adresse.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-email">Nouvelle adresse email</Label>
        <Input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nouvelle@adresse.fr"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Envoi des confirmations…" : "Envoyer les confirmations"}
      </Button>
    </form>
  );
}

export function InviteFriendForm() {
  const [state, action, pending] = useActionState(inviteFriend, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email de ton ami</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="ami@email.fr"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer l’invitation"}
      </Button>
    </form>
  );
}
