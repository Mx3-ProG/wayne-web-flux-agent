import type { FluxGuidanceId } from "@/lib/assistant/guidance";
import { FluxContextCard } from "./flux-context-card";

export function FluxStepCoach({ messageId, errorMessageId, hasError = false }: {
  messageId: FluxGuidanceId;
  errorMessageId?: FluxGuidanceId;
  hasError?: boolean;
}) {
  return <FluxContextCard messageId={hasError && errorMessageId ? errorMessageId : messageId} />;
}
