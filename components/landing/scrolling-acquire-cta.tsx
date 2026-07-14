"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "@/app/home.module.css";

type FollowStyle = CSSProperties & {
  "--follow-y": string;
  "--follow-tilt": string;
  "--follow-glow": string;
};

export function ScrollingAcquireCta() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const section = wrapper?.closest<HTMLElement>("[data-tools-section]");
    if (!wrapper || !section) return;

    let frame = 0;

    const updatePosition = () => {
      frame = 0;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const start = sectionTop + wrapper.offsetTop - window.innerHeight * 0.34;
      const maxTravel = Math.max(
        0,
        section.offsetHeight - wrapper.offsetTop - wrapper.offsetHeight - 20
      );
      const travelled = Math.max(0, window.scrollY - start);
      const translate = Math.min(maxTravel, travelled * 1.12);
      const progress = maxTravel > 0 ? translate / maxTravel : 0;
      const tilt = Math.sin(progress * Math.PI * 3) * 0.7;

      wrapper.style.setProperty("--follow-y", `${translate}px`);
      wrapper.style.setProperty("--follow-tilt", `${tilt}deg`);
      wrapper.style.setProperty("--follow-glow", `${0.1 + progress * 0.22}`);
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const followStyle: FollowStyle = {
    "--follow-y": "0px",
    "--follow-tilt": "0deg",
    "--follow-glow": "0.1",
  };

  return (
    <div ref={wrapperRef} className={styles.desktopAcquireWrap} style={followStyle}>
      <Link className={styles.askFluxCta} href="/commencer">
        <span className={styles.askFluxFill} aria-hidden="true" />
        <span className={styles.askFluxText}>
          Acquérir{" "}
          <strong className={styles.askFluxGlitch} data-text="FLUX">FLUX</strong>
        </span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
