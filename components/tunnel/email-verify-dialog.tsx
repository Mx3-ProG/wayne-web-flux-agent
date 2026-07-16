"use client";

import { useTransition } from "react";
import { ExternalLink, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { SPAM_HINT_SELF, webmail } from "@/lib/email-hints";
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

// Le tunnel ouvre la session sans attendre le clic sur l'email (createAccount) :
// l'utilisateur arrive donc à la publication avec une adresse non prouvée, et
// publish_page le refuse (email_not_verified). Un toast ne suffisait pas — c'est
// un mur, pas une notification : on l'explique, on ouvre sa boîte mail, et on
// prévient pour les spams, sans quoi il conclut que la publication est cassée.
export function EmailVerifyDialog({
  email,
  open,
  onOpenChange,
}: {
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
            Confirme ton adresse pour publier
          </DialogTitle>
          <DialogDescription>
            On a envoyé un lien de confirmation à <strong>{email}</strong>. Clique
            dessus, puis reviens ici : ta vitrine partira en ligne. {SPAM_HINT_SELF}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start">
          {/* Un domaine que l'on ne sait pas router (adresse pro, hébergeur
              perso) n'affiche pas de bouton : mieux vaut rien qu'un lien qui
              tombe sur le mauvais webmail. */}
          {provider && (
            <Button asChild>
              <a href={provider.url} target="_blank" rel="noreferrer">
                Ouvrir {provider.label} <ExternalLink aria-hidden="true" />
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
                if (result.error) toast.error(result.error);
                else if (result.message) toast.success(result.message);
              })
            }
          >
            {pending ? "Envoi…" : "Renvoyer l'email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
