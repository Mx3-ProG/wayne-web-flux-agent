"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import { PhotoUpload } from "@/components/editor/photo-upload";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

// Repris de l'écran « Tes images » de l'assistant vitrine (/ma-page), branché
// sur l'aperçu du tunnel : le logo et la couverture apparaissent dans la vitrine
// de droite dès l'upload.
export function StepImages({
  dict,
  userId,
  logoUrl,
  heroUrl,
  onChange,
}: {
  dict: TunnelDict["images"];
  userId: string;
  logoUrl: string;
  heroUrl: string;
  onChange: (patch: { logoUrl?: string; heroUrl?: string }) => void;
}) {
  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
    >
      <div className={styles.photoGrid}>
        <article className={styles.photoCard}>
          <strong>{dict.logoLabel}</strong>
          {logoUrl ? (
            <Image src={logoUrl} width={520} height={240} unoptimized alt="" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <PhotoUpload
            userId={userId}
            label={logoUrl ? dict.logoChange : dict.logoAdd}
            messages={dict}
            onUploaded={(url) => onChange({ logoUrl: url })}
          />
        </article>
        <article className={styles.photoCard}>
          <strong>{dict.heroLabel}</strong>
          {heroUrl ? (
            <Image src={heroUrl} width={520} height={240} unoptimized alt="" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          <PhotoUpload
            userId={userId}
            label={heroUrl ? dict.heroChange : dict.heroAdd}
            messages={dict}
            onUploaded={(url) => onChange({ heroUrl: url })}
          />
        </article>
      </div>
    </Question>
  );
}
