"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PUBLISH_COST } from "@/lib/plans";
import { tunnelPublish } from "@/app/commencer/actions";
import { EmailVerifyDialog } from "@/components/tunnel/email-verify-dialog";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

// Dernier écran repris de l'assistant vitrine : tout ce qui précède vit en
// brouillon, seule la publication rend la vitrine visible — et c'est elle qui
// donne un sens au lien de l'écran suivant.
//
// Publier n'est pas obligatoire pour continuer : sans crédits ou sans adresse
// vérifiée, le Parcours doit pouvoir se terminer quand même.
// Pas de `gain` : comme l'écran « style », la mise en ligne n'est pas une des 8
// étapes du Parcours (lib/journey.ts) — elle n'a pas de bénéfice à afficher.
export function StepPublish({
  email,
  balance,
  published,
  onPublished,
}: {
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
        toast.error(`Il te faut ${PUBLISH_COST} crédits pour publier.`);
        return;
      }
      if (result.error === "subscription_required") {
        toast.error("Ton essai est terminé : choisis une formule pour publier.");
        return;
      }
      if (result.error === "nothing_to_publish") {
        setDone(true);
        onPublished();
        toast.info("Ta vitrine est déjà à jour.");
        return;
      }
      if (result.error === "content_blocked") {
        toast.error(
          "Les messages de haines ou les contenus explicit sont interdit et amendé sur FLUX, veuillez respectez votre environnement et celui des autres. 3 Infractions contre nos conditions d'utilisations le compte est supprimé."
        );
        return;
      }
      if (result.error) {
        toast.error("Publication impossible. Réessaie dans un instant.");
        return;
      }

      setDone(true);
      onPublished();
      toast.success(`Ta vitrine est en ligne ! Solde : ${result.balance} cr.`);
    });
  }

  return (
    <Question
      kicker="Ton style · Mise en ligne"
      title={<>On la met <em>en ligne ?</em></>}
      subtitle="Tout ce que tu viens de régler vit en brouillon. Publier, c'est ce qui rend ta vitrine visible par tes clients — et ce qui donne un sens au lien de l'étape suivante."
    >
      <div className={styles.publishCard}>
        {done ? (
          <p className={styles.publishDone}>
            <CheckCircle2 aria-hidden="true" /> Ta vitrine est en ligne.
          </p>
        ) : (
          <>
            <p className={styles.publishCost}>
              Publier coûte {PUBLISH_COST} crédits · ton solde : {balance} cr.
            </p>
            <button
              className={`flux-button-smooth ${styles.primary}`}
              type="button"
              disabled={pending || !enough}
              onClick={publish}
            >
              {pending ? "Mise en ligne…" : "Publier ma vitrine"}
              {!pending && <Rocket aria-hidden="true" />}
            </button>
            {!enough && (
              <p className={styles.publishHint}>
                Il te manque {PUBLISH_COST - balance} crédit
                {PUBLISH_COST - balance > 1 ? "s" : ""}. Tu peux continuer et
                publier plus tard depuis ton espace.
              </p>
            )}
          </>
        )}
      </div>

      <EmailVerifyDialog email={email} open={emailDialog} onOpenChange={setEmailDialog} />
    </Question>
  );
}
