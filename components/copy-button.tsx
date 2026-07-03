"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success("Lien copié.");
      }}
    >
      {label}
    </Button>
  );
}
