"use client";

import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/lib/i18n/config";
import { FluxAssistantHost } from "./flux-assistant-host";

export function MarketingAssistant() {
  const pathname = usePathname();

  // usePathname() rend l'URL du navigateur, préfixée par la langue (/en, /es…)
  // alors que le proxy a réécrit la route vers `/` côté serveur. Sans le
  // dé-préfixage, l'assistante ne se montait que sur la home française : le
  // bouton FLUX existait dans les 8 autres langues mais plus personne
  // n'écoutait `flux:assistant-open`, donc le clic ne faisait rien.
  if (stripLocalePrefix(pathname) !== "/") return null;
  return (
    <FluxAssistantHost
      surface="marketing"
      launcherVisible={false}
      spontaneousSuggestions={false}
    />
  );
}
