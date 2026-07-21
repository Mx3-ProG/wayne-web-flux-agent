"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PUBLISH_COST } from "@/lib/plans";
import { tunnelPublish } from "@/app/commencer/actions";
import { EmailVerifyDialog } from "@/components/tunnel/email-verify-dialog";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

// Dernier écran repris de l'assistant vitrine : tout ce qui précède vit en
// brouillon, seule la publication rend la vitrine visible — et c'est elle qui
// donne un sens au lien de l'écran suivant.
//
// Publier n'est pas obligatoire pour continuer : sans crédits ou sans adresse
// vérifiée, le Parcours doit pouvoir se terminer quand même.
// Pas de `gain` : comme l'écran « style », la mise en ligne n'est pas une des 8
// étapes du Parcours (lib/journey.ts) — elle n'a pas de bénéfice à afficher.
export function StepPublish({
  dict,
  emailVerifyDict,
  email,
  balance,
  published,
  onPublished,
}: {
  dict: TunnelDict["publish"];
  emailVerifyDict: TunnelDict["emailVerify"];
  email: string;
  balance: number;
  published: boolean;
  onPublished: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [emailDialog, setEmailDialog] = useState(false);
  const [done, setDone] = useState(published);

  const enough = balance >= PUBLISH_COST;

  function publish() {
    startTransition(async () => {
      const result = await tunnelPublish();

      // Le verrou qu'on attend ici : le tunnel a ouvert la session sans attendre
      // le clic sur l'email, l'adresse n'est donc pas prouvée.
      if (result.error === "email_not_verified") {
        setEmailDialog(true);
        return;
      }
      if (result.error === "insufficient_credits") {
        toast.error(dict.errors.insufficientCredits.replace("{cost}", String(PUBLISH_COST)));
        return;
      }
      if (result.error === "subscription_required") {
        toast.error(dict.errors.subscriptionRequired);
        return;
      }
      if (result.error === "nothing_to_publish") {
        setDone(true);
        onPublished();
        toast.info(dict.errors.alreadyUpToDate);
        return;
      }
      if (result.error === "content_blocked") {
        toast.error(
          dict.errors.contentBlocked
        );
        return;
      }
      if (result.error) {
        toast.error(dict.errors.generic);
        return;
      }

      setDone(true);
      onPublished();
      toast.success(dict.errors.success.replace("{balance}", String(result.balance)));
    });
  }

  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
    >
      <div className={styles.publishCard}>
        {done ? (
          <p className={styles.publishDone}>
            <CheckCircle2 aria-hidden="true" /> {dict.done}
          </p>
        ) : (
          <>
            <p className={styles.publishCost}>
              {dict.cost.replace("{cost}", String(PUBLISH_COST)).replace("{balance}", String(balance))}
            </p>
            <button
              className={`flux-button-smooth ${styles.primary}`}
              type="button"
              disabled={pending || !enough}
              onClick={publish}
            >
              {pending ? dict.publishing : dict.cta}
              {!pending && <Rocket aria-hidden="true" />}
            </button>
            {!enough && (
              <p className={styles.publishHint}>
                {(PUBLISH_COST - balance === 1 ? dict.missingCredits : dict.missingCreditsPlural).replace("{missing}", String(PUBLISH_COST - balance))}
              </p>
            )}
          </>
        )}
      </div>

      <EmailVerifyDialog dict={emailVerifyDict} email={email} open={emailDialog} onOpenChange={setEmailDialog} />
    </Question>
  );
}
