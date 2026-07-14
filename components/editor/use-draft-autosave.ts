"use client";

// Autosave débouncé vers le brouillon : l'état local est mis à jour tout de
// suite (preview live), la sauvegarde serveur part 800 ms après la dernière
// frappe. Utilisé par l'éditeur de la home (savePageFields) et celui des
// sous-pages (saveSitePageFields).

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useDraftAutosave<T>(
  initial: T,
  save: (fields: Partial<T>) => Promise<{ error?: string }>,
  options?: { delay?: number; initiallyDirty?: boolean }
) {
  const delay = options?.delay ?? 800;
  const [state, setState] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  // Modif locale non publiée : dès qu'on touche un champ, il y a un brouillon.
  const [dirty, setDirty] = useState(options?.initiallyDirty ?? false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Champs en attente d'envoi : on les accumule pour ne rien perdre quand
  // deux champs différents sont modifiés dans la même fenêtre de débounce.
  const pending = useRef<Partial<T>>({});

  const patch = useCallback(
    (fields: Partial<T>) => {
      setDirty(true);
      setState((prev) => ({ ...prev, ...fields }));
      pending.current = { ...pending.current, ...fields };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const toSave = pending.current;
        pending.current = {};
        setSaving(true);
        const result = await save(toSave);
        setSaving(false);
        if (result.error) toast.error(result.error);
      }, delay);
    },
    [save, delay]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { state, setState, patch, saving, dirty };
}
