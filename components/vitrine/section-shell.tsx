// Enveloppe d'une section à l'apparence personnalisée (section.style) :
// fond pleine largeur (couleur, dégradé, image ou vidéo + voile), espacement
// vertical, largeur du contenu et alignement. Utilisée par vitrine-view et
// vitrine-subpage pour les items « styled » du plan de rendu.

import Image from "next/image";
import type { SectionStyle, SectionType } from "@/lib/sections";
import styles from "./vitrine.module.css";

// Luminance approximative d'une couleur hex pour choisir la couleur du texte.
function isDarkColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

type Props = {
  id?: string;
  style?: SectionStyle;
  children: React.ReactNode;
  sectionType: SectionType;
  recipe: string;
};

export function SectionShell({ id, style, children, sectionType, recipe }: Props) {
  const bg = style?.background;
  const spacing = style?.spacing ?? "normal";
  const width = style?.width ?? "normal";
  const align = style?.align ?? "left";

  const requestedOverlay =
    bg && (bg.kind === "image" || bg.kind === "video")
      ? (bg.overlay ?? 0.35)
      : 0;
  const overlay = bg && (bg.kind === "image" || bg.kind === "video")
    ? Math.max(requestedOverlay, 0.42)
    : requestedOverlay;
  const surface = !bg
    ? undefined
    : bg.kind === "image" || bg.kind === "video"
      ? "dark"
      : bg.kind === "gradient"
        ? isDarkColor(bg.from) === isDarkColor(bg.to)
          ? isDarkColor(bg.from) ? "dark" : "light"
          : "mixed"
        : isDarkColor(bg.color) ? "dark" : "light";

  const inline: React.CSSProperties = {};
  if (bg?.kind === "color") inline.background = bg.color;
  if (bg?.kind === "gradient") {
    inline.background = `linear-gradient(${bg.angle ?? 160}deg, ${bg.from}, ${bg.to})`;
  }

  return (
    <section
      id={id}
      className={styles.sectionShell}
      data-spacing={spacing}
      data-align={align}
      data-section-type={sectionType}
      data-section-recipe={recipe}
      data-surface={surface}
      style={inline}
    >
      {bg?.kind === "image" && bg.url && (
        <>
          <Image
            src={bg.url}
            alt=""
            fill
            className={styles.sectionShellMedia}
            sizes="100vw"
          />
          <div
            className={styles.sectionShellOverlay}
            style={{ opacity: overlay }}
          />
        </>
      )}
      {bg?.kind === "video" && bg.url && (
        <>
          <video
            className={styles.sectionShellMedia}
            src={bg.url}
            poster={bg.posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div
            className={styles.sectionShellOverlay}
            style={{ opacity: overlay }}
          />
        </>
      )}
      <div className={styles.sectionShellInner} data-width={width}>
        {children}
      </div>
    </section>
  );
}
