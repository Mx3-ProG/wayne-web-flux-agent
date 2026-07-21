"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/home.module.css";

// Décalage du header fixe : les sections sont amenées juste sous la nav.
const HEADER_OFFSET = 76;

// Flèche en pointillés (double chevron vers le bas), inspirée de la DA Flux.
// Le bouton "haut" la retourne en CSS.
function DotArrow() {
  const chevrons = [
    [5, 7], [8.5, 10], [12, 13], [15.5, 10], [19, 7],
    [5, 13], [8.5, 16], [12, 19], [15.5, 16], [19, 13],
  ];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {chevrons.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.75" fill="currentColor" />
      ))}
    </svg>
  );
}

export function SectionScroller({
  upAria = "Remonter à la section précédente",
  downAria = "Descendre à la section suivante",
}: {
  upAria?: string;
  downAria?: string;
} = {}) {
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const [glitching, setGlitching] = useState<"up" | "down" | null>(null);
  const glitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      const sections = document.querySelectorAll<HTMLElement>("main > section");
      if (sections.length < 2) return;
      const y = window.scrollY;
      const doc = document.documentElement;
      const atBottom = y + window.innerHeight >= doc.scrollHeight - 60;
      setCanDown(!atBottom);
      // Le bouton "haut" apparaît dès qu'on atteint la deuxième section.
      setCanUp(y >= sections[1].offsetTop - HEADER_OFFSET - 40);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (glitchTimer.current) clearTimeout(glitchTimer.current);
    };
  }, []);

  function step(direction: "up" | "down") {
    const sections = [
      ...document.querySelectorAll<HTMLElement>("main > section"),
    ];
    if (!sections.length) return;
    const y = window.scrollY;
    // Position de référence : le haut de la zone visible sous le header.
    const cursor = y + HEADER_OFFSET + 4;

    let target: number | null = null;
    if (direction === "down") {
      const next = sections.find((s) => s.offsetTop > cursor + 8);
      if (next) target = next.offsetTop - HEADER_OFFSET;
    } else {
      const prev = [...sections]
        .reverse()
        .find((s) => s.offsetTop < cursor - 8);
      target = prev ? Math.max(0, prev.offsetTop - HEADER_OFFSET) : 0;
    }
    if (target === null) return;

    setGlitching(direction);
    if (glitchTimer.current) clearTimeout(glitchTimer.current);
    glitchTimer.current = setTimeout(() => setGlitching(null), 340);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className={styles.scroller}>
      <button
        type="button"
        aria-label={upAria}
        className={[
          styles.scrollerBtn,
          styles.scrollerUp,
          canUp ? styles.scrollerVisible : "",
          glitching === "up" ? styles.scrollerGlitching : "",
        ].join(" ")}
        onClick={() => step("up")}
        tabIndex={canUp ? 0 : -1}
      >
        <DotArrow />
      </button>
      <button
        type="button"
        aria-label={downAria}
        className={[
          styles.scrollerBtn,
          styles.scrollerDown,
          canDown ? styles.scrollerVisible : "",
          glitching === "down" ? styles.scrollerGlitching : "",
        ].join(" ")}
        onClick={() => step("down")}
        tabIndex={canDown ? 0 : -1}
      >
        <DotArrow />
      </button>
    </div>
  );
}
