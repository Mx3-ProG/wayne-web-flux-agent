"use client";

import { useActionState } from "react";
import { requestAccountPasswordReset } from "@/app/(app)/compte/actions";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import type { AccountDict } from "@/lib/i18n/get-dictionary";

export function PasswordForm({ t }: { t: AccountDict }) {
  const [state, action, pending] = useActionState(
    requestAccountPasswordReset,
    {}
  );
  const f = t.passwordForm;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{f.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        <Mail aria-hidden="true" />
        {pending ? f.sending : f.cta}
      </Button>
    </form>
  );
}
