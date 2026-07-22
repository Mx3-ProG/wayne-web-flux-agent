"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { setActiveProject } from "@/app/(app)/projets/actions";
import { useAssistantMenuPresence } from "@/components/assistant/use-assistant-menu-presence";

type Project = { id: string; business_name: string; slug: string };

export function ProjectSwitcher({
  projects,
  activeId,
}: {
  projects: Project[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useAssistantMenuPresence("dashboard-project-switcher", open);
  const [pending, startTransition] = useTransition();

  const active = projects.find((p) => p.id === activeId) ?? projects[0];
  if (!active) return null;

  function choose(id: string) {
    setOpen(false);
    if (id === active?.id) return;
    startTransition(async () => {
      const r = await setActiveProject(id);
      if (r.error) toast.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-white/90 hover:bg-white/[0.07]"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--ww-red)] text-[11px] font-bold text-white">
          {(active.business_name || "P").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {active.business_name || "Mon projet"}
          </span>
          <span className="block truncate text-[10px] text-white/45">
            {pending ? "changement…" : `/${active.slug}`}
          </span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="h-4 w-4 text-white/40" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#141418] shadow-[0_20px_60px_rgb(0_0_0_/_55%)]"
          >
            <div className="max-h-64 overflow-y-auto py-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(p.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {p.business_name || `/${p.slug}`}
                  </span>
                  {p.id === active.id && <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--ww-success)]" />}
                </button>
              ))}
            </div>
            <Link
              href="/projets"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.06]"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Gérer mes projets
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
