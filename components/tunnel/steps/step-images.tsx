"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import { PhotoUpload } from "@/components/editor/photo-upload";
import styles from "@/app/commencer/tunnel.module.css";

// Repris de l'écran « Tes images » de l'assistant vitrine (/ma-page), branché
// sur l'aperçu du tunnel : le logo et la couverture apparaissent dans la vitrine
// de droite dès l'upload.
export function StepImages({
  userId,
  logoUrl,
  heroUrl,
  onChange,
}: {
  userId: string;
  logoUrl: string;
  heroUrl: string;
  onChange: (patch: { logoUrl?: string; heroUrl?: string }) => void;
}) {
  return (
    <Question
      kicker="Ton style · Tes images"
      title={<>Quelle image veux-tu <em>laisser ?</em></>}
      subtitle="Ton logo et la grande photo qui accueille tes visiteurs. Les deux sont facultatifs — tu peux les ajouter plus tard depuis l'éditeur."
    >
      <div className={styles.photoGrid}>
        <article className={styles.photoCard}>
          <strong>Logo ou portrait</strong>
          {logoUrl ? (
            <Image src={logoUrl} width={520} height={240} unoptimized alt="" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <PhotoUpload
            userId={userId}
            label={logoUrl ? "Changer le logo" : "Ajouter mon logo"}
            onUploaded={(url) => onChange({ logoUrl: url })}
          />
        </article>
        <article className={styles.photoCard}>
          <strong>Grande photo de couverture</strong>
          {heroUrl ? (
            <Image src={heroUrl} width={520} height={240} unoptimized alt="" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <PhotoUpload
            userId={userId}
            label={heroUrl ? "Changer la photo" : "Ajouter une photo"}
            onUploaded={(url) => onChange({ heroUrl: url })}
          />
        </article>
      </div>
    </Question>
  );
}
