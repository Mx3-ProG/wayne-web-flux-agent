"use client";

import { useTransition } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/app/(app)/actions";
import { useI18n } from "@/components/i18n-provider";

// Le tunnel ouvre la session sans attendre le clic sur l'email : l'utilisateur
// travaille donc dans son espace avec une adresse non prouvée. Ce bandeau est le
// rappel de la seule chose qui reste bloquée (publier, encaisser, acheter).
export function EmailVerificationBanner() {
  const { dictionary } = useI18n();
  const t = dictionary.emailVerification;
  const [pending, startTransition] = useTransition();

  function translate(code: string): string {
    return t.errors[code as keyof typeof t.errors] ?? t.errors.unknown;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive/15 px-4 py-2 text-xs text-foreground">
      <MailWarning aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{t.banner}</span>
      <button
        type="button"
        disabled={pending}
        className="font-semibold underline underline-offset-4 disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            const result = await resendVerificationEmail();
            if (result.error) toast.error(translate(result.error));
            else if (result.message === "already_verified") toast.success(t.errors.already_verified);
            else if (result.message === "sent") toast.success(`${t.sent} ${t.spamHint}`);
          })
        }
      >
        {pending ? t.resending : t.resend}
      </button>
    </div>
  );
}
