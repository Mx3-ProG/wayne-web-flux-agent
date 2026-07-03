"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { VoiceProfile } from "@/lib/types";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Draft = Omit<VoiceProfile, "user_id" | "updated_at">;

const EMPTY: Draft = {
  tone: "",
  address_form: "",
  emojis: "",
  specialty: "",
  often_told: "",
  story: "",
  vals: "",
};

const TONES = [
  "Complice et chaleureux",
  "Pro et expert",
  "Doux et posé",
  "Solaire et pétillant",
  "Chic et raffiné",
  "Direct et sans détour",
];

const SPECIALTIES = [
  "Le rendu naturel, on ne voit que le résultat",
  "La précision, le travail propre",
  "La qualité qui dure",
  "Le sur-mesure, jamais deux fois pareil",
  "Le rapport qualité-prix imbattable",
  "La rapidité sans bâcler",
];

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(value === option ? "" : option)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === option
              ? "border-primary bg-primary/10"
              : "border-border hover:bg-secondary"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// Profil de voix : plus il en sait sur toi, plus les contenus te ressemblent.
export function VoiceForm({
  initialVoice,
  completion,
}: {
  initialVoice: VoiceProfile | null;
  completion: number;
}) {
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, ...initialVoice });
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveVoiceProfile(draft);
      if (result.error) toast.error(result.error);
      else toast.success("C'est noté. Tes prochains contenus auront ta voix.");
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Apprends-lui à parler comme toi</h1>
        <p className="text-muted-foreground">
          Réponds à ce qui te parle, ignore le reste. Chaque réponse affine tes
          contenus.
        </p>
      </div>

      <div className="rounded-xl border border-border px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>
            J&apos;écris comme toi à{" "}
            <strong className="text-red-bright">{completion}%</strong>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Et toi, tu parles comment ?</CardTitle>
          <CardDescription>
            À tes clients, en story, en message. Sois honnête, c&apos;est ce qui
            te rend reconnaissable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Ton ton</Label>
            <Chips options={TONES} value={draft.tone} onChange={(v) => set("tone", v)} />
          </div>
          <div className="space-y-2">
            <Label>Tu dis « tu » ou « vous » à tes clients ?</Label>
            <Chips
              options={["tu", "vous"]}
              value={draft.address_form}
              onChange={(v) => set("address_form", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Les emojis, tu en mets ?</Label>
            <Chips
              options={["beaucoup", "parfois", "jamais"]}
              value={draft.emojis}
              onChange={(v) => set("emojis", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>C&apos;est quoi, ta signature ?</CardTitle>
          <CardDescription>
            Ce pour quoi on vient te voir TOI, et pas un autre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Ta spécialité</Label>
            <Chips
              options={SPECIALTIES}
              value={draft.specialty}
              onChange={(v) => set("specialty", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Une chose qu&apos;on te dit souvent ? (facultatif)</Label>
            <Input
              value={draft.often_told}
              maxLength={150}
              placeholder="Ex : « on sent que tu prends le temps »"
              onChange={(e) => set("often_told", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ton histoire et tes valeurs</CardTitle>
          <CardDescription>
            C&apos;est ce qui fait que tes mots ne ressembleront à personne
            d&apos;autre. Quelques lignes suffisent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Ton parcours (facultatif)</Label>
            <Textarea
              rows={3}
              maxLength={800}
              placeholder="Ce qui t'a mené à ce métier, depuis combien de temps tu exerces…"
              value={draft.story}
              onChange={(e) => set("story", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ce qui compte avant tout pour toi (facultatif)</Label>
            <Textarea
              rows={3}
              maxLength={800}
              placeholder="La qualité, l'écoute, la ponctualité, le naturel…"
              value={draft.vals}
              onChange={(e) => set("vals", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" disabled={isPending} onClick={save}>
        {isPending ? "Enregistrement…" : "Enregistrer ma voix"}
      </Button>
    </div>
  );
}
