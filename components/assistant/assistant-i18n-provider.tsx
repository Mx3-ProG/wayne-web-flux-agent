"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { ASSISTANT_COPY, localizeDestinations } from "@/lib/assistant/i18n";
import { ASSISTANT_DESTINATIONS } from "@/lib/assistant/catalog";
import { ASSISTANT_MESSAGES_EXPANDED_KEY, parseAssistantMessagesExpanded } from "@/lib/assistant/display";

type AssistantI18nContext = {
  locale: Locale;
  copy: typeof ASSISTANT_COPY.fr;
  destinations: typeof ASSISTANT_DESTINATIONS;
  messagesExpanded: boolean;
  setMessagesExpanded: (expanded: boolean) => void;
};

const Context = createContext<AssistantI18nContext>({
  locale: "fr",
  copy: ASSISTANT_COPY.fr,
  destinations: ASSISTANT_DESTINATIONS,
  messagesExpanded: true,
  setMessagesExpanded: () => undefined,
});

export function AssistantI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [messagesExpanded, setMessagesExpandedState] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMessagesExpandedState(parseAssistantMessagesExpanded(localStorage.getItem(ASSISTANT_MESSAGES_EXPANDED_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setMessagesExpanded = useCallback((expanded: boolean) => {
    setMessagesExpandedState(expanded);
    try {
      localStorage.setItem(ASSISTANT_MESSAGES_EXPANDED_KEY, String(expanded));
    } catch {
      // Le choix reste actif pour la session si le stockage local est bloqué.
    }
  }, []);

  const value = useMemo(() => ({
    locale,
    copy: ASSISTANT_COPY[locale],
    destinations: localizeDestinations(ASSISTANT_DESTINATIONS, locale),
    messagesExpanded,
    setMessagesExpanded,
  }), [locale, messagesExpanded, setMessagesExpanded]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAssistantI18n() { return useContext(Context); }
