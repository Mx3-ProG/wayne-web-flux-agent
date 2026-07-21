"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { setActiveProject } from "./actions";
import type { ProjectsDict } from "@/lib/i18n/get-dictionary";

export function ActivateButton({
  pageId,
  active,
  className,
  t,
}: {
  pageId: string;
  active: boolean;
  className?: string;
  t: ProjectsDict;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (active) {
    return (
      <span className={className} data-active="true">
        <Check aria-hidden="true" /> {t.activeProject}
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
          if (r.error) toast.error(t.errors[r.error as keyof typeof t.errors] ?? t.errors.unknown);
          else router.refresh();
        })
      }
    >
      {pending ? t.activating : t.activate}
    </button>
  );
}
