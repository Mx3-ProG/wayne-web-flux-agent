"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { dictionary } = useI18n();
  const t = dictionary.copyButton;
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success(t.copied);
      }}
    >
      {label ?? t.copy}
    </Button>
  );
}
