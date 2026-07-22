"use client";

import { useEffect } from "react";
import { publishAssistantMenuState } from "@/lib/assistant/menu-presence";

export function useAssistantMenuPresence(id: string, open: boolean) {
  useEffect(() => {
    publishAssistantMenuState(id, open);
    return () => publishAssistantMenuState(id, false);
  }, [id, open]);
}
