"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { publishPage } from "@/app/(app)/ma-page/actions";
import { PUBLISH_COST } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/i18n-provider";

type Props = {
  pageId: string;
  balance: number;
  hasDraft: boolean;
  nextVersion: number;
  // Destination après publication réussie (ex : fin du tunnel FLUX → éditeur).
  redirectTo?: string;
};

// Publier une nouvelle version du site : confirmation obligatoire, coût
// affiché (5 crédits ≈ 5 €), débit atomique côté SQL (publish_page).
// C'est la seule porte de sortie du brouillon vers la vitrine publique.
export function PublishButton({ pageId, balance, hasDraft, nextVersion, redirectTo }: Props) {
  const router = useRouter();
  const { editor } = useI18n();
  const t = editor.publish;
  const [open, setOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [trialOver, setTrialOver] = useState(false);
  const [pending, startTransition] = useTransition();
  // Suivre la balance en état local pour refléter les mises à jour du parent
  // (ex. après router.refresh() suite à une action qui dépense des crédits).
  const [liveBalance, setLiveBalance] = useState(balance);
  useEffect(() => {
    setLiveBalance(balance);
  }, [balance]);

  const enough = liveBalance >= PUBLISH_COST;

  function confirm() {
    startTransition(async () => {
      const result = await publishPage(pageId);
      if (result.error === "insufficient_credits") {
        setOutOfCredits(true);
        return;
      }
      if (result.error === "subscription_required") {
        setTrialOver(true);
        return;
      }
      if (result.error === "email_not_verified") {
        setOpen(false);
        toast.error(t.toastEmailUnverified);
        return;
      }
      if (result.error === "nothing_to_publish") {
        setOpen(false);
        toast.info(t.toastNothingToPublish);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
        return;
      }
      if (result.error === "content_blocked") {
        toast.error(t.toastContentBlocked);
        return;
      }
      if (result.error === "path_taken") {
        toast.error(t.toastPathTaken);
        return;
      }
      if (result.error === "account_suspended") {
        toast.error(t.toastSuspended);
        return;
      }
      if (result.error === "invalid_appearance") {
        toast.error(t.toastInvalidAppearance);
        return;
      }
      if (result.error) {
        toast.error(t.toastGenericError);
        return;
      }
      setOpen(false);
      toast.success(
        t.toastSuccess.replace("{version}", String(nextVersion)).replace("{balance}", String(result.balance))
      );
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setOutOfCredits(false);
          setTrialOver(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={!hasDraft} title={hasDraft ? undefined : t.noDraft}>
          <Rocket aria-hidden="true" /> {t.cta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {trialOver ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.trialOverTitle}</DialogTitle>
              <DialogDescription>{t.trialOverText}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">{t.later}</Button>
              </DialogClose>
              <Button asChild>
                <Link href="/formules">{t.choosePlan}</Link>
              </Button>
            </DialogFooter>
          </>
        ) : outOfCredits || !enough ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.insufficientTitle}</DialogTitle>
              <DialogDescription>
                {t.insufficientText
                  .replace("{cost}", String(PUBLISH_COST))
                  .replace("{balance}", String(liveBalance))}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t.plansHint}</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">{t.later}</Button>
              </DialogClose>
              <Button asChild variant="secondary">
                <Link href="/credits">{t.viewCredits}</Link>
              </Button>
              <Button asChild>
                <Link href="/formules">{t.discoverPlans}</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.confirmTitle.replace("{version}", String(nextVersion))}</DialogTitle>
              <DialogDescription>
                {t.confirmText.replace("{cost}", String(PUBLISH_COST))}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t.balance}</span>
              <span>
                {liveBalance} cr. → <strong>{liveBalance - PUBLISH_COST} cr.</strong>
              </span>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">{t.notNow}</Button>
              </DialogClose>
              <Button onClick={confirm} disabled={pending}>
                {pending ? t.publishing : t.publishCta.replace("{cost}", String(PUBLISH_COST))}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
