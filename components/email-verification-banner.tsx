"use client";

import { useTransition } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/app/(app)/actions";

// Le tunnel ouvre la session sans attendre le clic sur l'email : l'utilisateur
// travaille donc dans son espace avec une adresse non prouvée. Ce bandeau est le
// rappel de la seule chose qui reste bloquée (publier, encaisser, acheter).
export function EmailVerificationBanner() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive/15 px-4 py-2 text-xs text-foreground">
      <MailWarning aria-hidden="true" className="h-3.5 w-3.5" />
      <span>
        Vérifie ton adresse email pour publier ta vitrine et encaisser tes
        clients.
      </span>
      <button
        type="button"
        disabled={pending}
        className="font-semibold underline underline-offset-4 disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            const result = await resendVerificationEmail();
            if (result.error) toast.error(result.error);
            else if (result.message) toast.success(result.message);
          })
        }
      >
        {pending ? "Envoi…" : "Renvoyer l'email"}
      </button>
    </div>
  );
}
