import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePage } from "@/lib/active-project";
import type { PageEventKind, PageSubscriber } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Statistiques" };

const DAY_MS = 86_400_000;

type EventRow = { kind: PageEventKind; created_at: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function countSince(
  events: EventRow[],
  kind: PageEventKind,
  days: number,
  now: number
): number {
  const since = now - days * DAY_MS;
  return events.filter(
    (e) => e.kind === kind && new Date(e.created_at).getTime() >= since
  ).length;
}

// Chargement + agrégats hors du composant (la règle de pureté React interdit
// Date.now() dans le rendu, même côté serveur).
async function loadStats(supabase: SupabaseServer, pageId: string) {
  const now = Date.now();
  const since = new Date(now - 30 * DAY_MS).toISOString();
  const [{ data: rawEvents }, { data: rawSubscribers }] = await Promise.all([
    supabase
      .from("page_events")
      .select("kind, created_at")
      .eq("page_id", pageId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000),
    supabase
      .from("page_subscribers")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false }),
  ]);
  const events = (rawEvents ?? []) as EventRow[];
  const subscribers = (rawSubscribers ?? []) as PageSubscriber[];

  // Visites par jour sur 14 jours, pour la petite barre.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = start.getTime() + DAY_MS;
    days.push({
      label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count: events.filter((e) => {
        if (e.kind !== "view") return false;
        const t = new Date(e.created_at).getTime();
        return t >= start.getTime() && t < end;
      }).length,
    });
  }

  return { now, events, subscribers, days };
}

export default async function StatistiquesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const page = await getActivePage(supabase, user.id);
  if (!page) redirect("/ma-page");

  const { now, events, subscribers, days } = await loadStats(supabase, page.id);

  const cards = [
    { label: "Visites (7 j)", value: countSince(events, "view", 7, now) },
    { label: "Visites (30 j)", value: countSince(events, "view", 30, now) },
    {
      label: "Clics téléphone (30 j)",
      value: countSince(events, "phone_click", 30, now),
    },
    {
      label: "Clics WhatsApp (30 j)",
      value: countSince(events, "whatsapp_click", 30, now),
    },
    {
      label: "Clics réseaux (30 j)",
      value: countSince(events, "social_click", 30, now),
    },
    { label: "Abonnés newsletter", value: subscribers.length },
  ];
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const csv = [
    "email;inscrit_le",
    ...subscribers.map(
      (s) => `${s.email};${new Date(s.created_at).toLocaleDateString("fr-FR")}`
    ),
  ].join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Tes statistiques</h1>
        <p className="text-muted-foreground">
          Ce qui se passe sur{" "}
          <Link href={`/p/${page.slug}`} target="_blank" className="underline">
            ta vitrine
          </Link>{" "}
          : visites, contacts et abonnés.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-1">
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visites des 14 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pas encore de données : elles arrivent dès que ta vitrine reçoit
              ses premières visites.
            </p>
          ) : (
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {days.map((day) => (
                <div
                  key={day.label}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  title={`${day.label} : ${day.count} visite${day.count > 1 ? "s" : ""}`}
                >
                  <div
                    className="w-full rounded-t bg-foreground/80"
                    style={{
                      height: `${Math.round((day.count / maxDay) * 96)}px`,
                      minHeight: day.count > 0 ? 3 : 1,
                      opacity: day.count > 0 ? 1 : 0.15,
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground truncate">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Tes abonnés newsletter</CardTitle>
            <CardDescription>
              Récoltés par le bloc « Newsletter » de ta vitrine.
            </CardDescription>
          </div>
          {subscribers.length > 0 && (
            <Button asChild variant="secondary" size="sm">
              <a href={csvHref} download={`abonnes-${page.slug}.csv`}>
                Exporter (CSV)
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Personne pour l&apos;instant. Ajoute le bloc « Newsletter » dans
              l&apos;éditeur de ta vitrine (section « Sections de ma page ») pour
              récolter des emails.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {subscribers.map((s) => (
                <li key={s.id} className="flex justify-between gap-4 py-2">
                  <span className="flex-1 truncate">{s.email}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
