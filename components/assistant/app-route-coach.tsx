"use client";

import { usePathname } from "next/navigation";
import { APP_ROUTE_GUIDANCE } from "@/lib/assistant/guidance";
import { FluxContextCard } from "./flux-context-card";
import styles from "./flux-guidance.module.css";

export function AppRouteCoach() {
  const pathname = usePathname();
  const route = APP_ROUTE_GUIDANCE.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!route) return null;
  return (
    <div className={styles.routeCoach}>
      <FluxContextCard messageId={route.messageId} firstVisitOnly dismissible />
    </div>
  );
}
