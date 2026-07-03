"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  label: string;
  onUploaded: (url: string) => void;
  multiple?: boolean;
};

export function PhotoUpload({ userId, label, onUploaded, multiple }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files).slice(0, multiple ? 8 : 1)) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo trop lourde (5 Mo max).");
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("page-photos")
        .upload(path, file, { cacheControl: "31536000" });
      if (uploadError) {
        setError("L'envoi a échoué. Réessaie.");
        continue;
      }
      const { data } = supabase.storage.from("page-photos").getPublicUrl(path);
      onUploaded(data.publicUrl);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Envoi…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
