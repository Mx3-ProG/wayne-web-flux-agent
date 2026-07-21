"use client";

import { useTransition } from "react";
import { ExternalLink, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { webmail } from "@/lib/email-hints-constants";
import { resendVerificationEmail } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

// Le tunnel ouvre la session sans attendre le clic sur l'email (createAccount) :
// l'utilisateur arrive donc à la publication avec une adresse non prouvée, et
// publish_page le refuse (email_not_verified). Un toast ne suffisait pas — c'est
// un mur, pas une notification : on l'explique, on ouvre sa boîte mail, et on
// prévient pour les spams, sans quoi il conclut que la publication est cassée.
export function EmailVerifyDialog({
  dict,
  email,
  open,
  onOpenChange,
}: {
  dict: TunnelDict["emailVerify"];
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const provider = webmail(email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailWarning aria-hidden="true" className="h-4 w-4" />
            {dict.title}
          </DialogTitle>
          <DialogDescription>
            {dict.description.replace("{email}", email)} {dict.spamHint}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start">
          {/* Un domaine que l'on ne sait pas router (adresse pro, hébergeur
              perso) n'affiche pas de bouton : mieux vaut rien qu'un lien qui
              tombe sur le mauvais webmail. */}
          {provider && (
            <Button asChild>
              <a href={provider.url} target="_blank" rel="noreferrer">
                {dict.openWebmail.replace("{label}", provider.label)} <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await resendVerificationEmail();
                if (result.error) {
                  toast.error(dict.errors[result.error as keyof typeof dict.errors] ?? dict.errors.unknown);
                } else if (result.message === "already_verified") {
                  toast.success(dict.errors.already_verified);
                } else if (result.message === "sent") {
                  toast.success(`${dict.sent} ${dict.spamHint}`);
                }
              })
            }
          >
            {pending ? dict.resending : dict.resend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
