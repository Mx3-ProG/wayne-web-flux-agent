"use client";

import { usePathname } from "next/navigation";
import { FluxAssistantHost } from "./flux-assistant-host";

export function MarketingAssistant() {
  const pathname = usePathname();

  if (pathname !== "/") return null;
  return (
    <FluxAssistantHost
      surface="marketing"
      launcherVisible={false}
      spontaneousSuggestions={false}
    />
  );
}
