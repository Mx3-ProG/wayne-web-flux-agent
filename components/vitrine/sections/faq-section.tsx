"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/sections";
import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  items: FaqItem[];
  title?: string;
  first?: boolean;
  t?: StorefrontDict["sections"]["faq"];
};

export function FaqSection({ items, title, first = false, t = frStorefront.sections.faq }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const filled = items.filter((i) => i.question.trim());
  if (filled.length === 0) return null;
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.sectionHeading}>
        <p>{t.eyebrow}</p>
        <h2>{title || t.title}</h2>
        <span>{t.subtitle}</span>
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
