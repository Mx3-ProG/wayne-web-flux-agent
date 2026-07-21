"use client";

import { useActionState } from "react";
import { changeEmail, inviteFriend } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountDict } from "@/lib/i18n/get-dictionary";

export function EmailChangeForm({ currentEmail, t }: { currentEmail: string; t: AccountDict }) {
  const [state, action, pending] = useActionState(changeEmail, {});
  const f = t.emailForm;
  const [before, after] = f.text.split("{email}");

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{f.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {before}
          <strong className="text-foreground">{currentEmail}</strong>
          {after}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-email">{f.newEmailLabel}</Label>
        <Input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={f.newEmailPlaceholder}
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? f.sending : f.cta}
      </Button>
    </form>
  );
}

export function InviteFriendForm({ t }: { t: AccountDict }) {
  const [state, action, pending] = useActionState(inviteFriend, {});
  const f = t.invite;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">{f.emailLabel}</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder={f.emailPlaceholder}
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? f.sending : f.send}
      </Button>
    </form>
  );
}
