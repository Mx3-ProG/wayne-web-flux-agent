"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/sections";
import styles from "../vitrine.module.css";

type Props = {
  items: FaqItem[];
  title?: string;
  first?: boolean;
};

export function FaqSection({ items, title, first = false }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const filled = items.filter((i) => i.question.trim());
  if (filled.length === 0) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>Questions fréquentes</p>
        <h2>{title || "FAQ"}</h2>
        <span>Les réponses aux questions qu&apos;on me pose le plus.</span>
      </div>
      <div className={styles.familyList}>
        {filled.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={styles.family}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className={`${styles.familyButton} ${styles.faqButton}`}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={isOpen ? styles.chevronOpen : ""}
                  aria-hidden="true"
                />
              </button>
              {isOpen && <p className={styles.faqAnswer}>{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
