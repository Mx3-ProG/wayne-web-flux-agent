"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Composant générique (utilisé par le dashboard ET le tunnel pré-compte
// /commencer, qui n'a pas I18nProvider) : aucun texte en dur, tout vient de
// l'appelant, déjà résolu dans la bonne locale.
type UploadMessages = {
  uploading: string;
  tooLarge: string; // avec placeholder {max}
  failed: string;
};

type Props = {
  userId: string;
  label: string;
  onUploaded: (url: string) => void;
  messages: UploadMessages;
  multiple?: boolean;
  accept?: string; // ex. "video/mp4,video/webm" — image/* par défaut
  maxMb?: number;
};

export function PhotoUpload({
  userId,
  label,
  onUploaded,
  messages,
  multiple,
  accept = "image/*",
  maxMb = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files).slice(0, multiple ? 8 : 1)) {
      if (file.size > maxMb * 1024 * 1024) {
        setError(messages.tooLarge.replace("{max}", String(maxMb)));
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("page-photos")
        .upload(path, file, { cacheControl: "31536000" });
      if (uploadError) {
        setError(messages.failed);
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
        accept={accept}
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
        {uploading ? messages.uploading : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
