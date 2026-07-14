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
      <div className="space-y-2">
        <Label htmlFor="new-email">Nouvelle adresse email</Label>
        <Input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={currentEmail || "ton@email.fr"}
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Envoi du lien…" : "Changer d’adresse"}
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
