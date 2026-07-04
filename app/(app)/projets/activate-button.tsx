"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { setActiveProject } from "./actions";

export function ActivateButton({
  pageId,
  active,
  className,
}: {
  pageId: string;
  active: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (active) {
    return (
      <span className={className} data-active="true">
        <Check aria-hidden="true" /> Projet actif
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await setActiveProject(pageId);
          if (r.error) toast.error(r.error);
          else router.refresh();
        })
      }
    >
      {pending ? "…" : "Activer ce projet"}
    </button>
  );
}
