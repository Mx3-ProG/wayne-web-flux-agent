import { z } from "zod";
import type { ImportEntityType } from "@/lib/integrations/csv/fields";
import { normalizeEmail, normalizePhone } from "@/lib/integrations/csv/dedupe";

export type TransformResult =
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; reason: string };

function parsePriceCents(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return undefined;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return undefined;
  return Math.round(value * 100);
}

function parseDurationMin(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(value) ? undefined : value;
}

// Accepte JJ/MM/AAAA, JJ-MM-AAAA ou AAAA-MM-JJ.
function parseDateParts(raw: string): { year: number; month: number; day: number } | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const fr = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (fr) return { year: Number(fr[3]), month: Number(fr[2]), day: Number(fr[1]) };
  return null;
}

function parseTimeParts(raw: string): { hour: number; minute: number } | null {
  const match = raw.match(/^(\d{1,2})[h:](\d{2})?/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2] ?? 0) };
}

const CustomerFields = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  birthday: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const ServiceFields = z.object({
  name: z.string().min(1).max(80),
  durationMin: z.number().int().min(5).max(600).optional(),
  priceCents: z.number().int().min(0).optional(),
});

const ProductFields = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(0).optional(),
});

const AppointmentFields = z.object({
  firstName: z.string().min(1).max(60),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  serviceName: z.string().min(1).max(80),
  date: z.string(),
  startTime: z.string(),
  durationMin: z.number().int().min(5).max(600).optional(),
  priceCents: z.number().int().min(0).optional(),
});

// Applique le mapping colonne->champ, convertit les types (prix, durée,
// date+heure), puis valide avec le schéma Zod de l'entité. Pure : aucune
// I/O, aucune dépendance à la base — testable indépendamment du worker.
export function transformRow(
  entityType: ImportEntityType,
  mapping: Record<string, string | null>,
  rawRow: Record<string, string>
): TransformResult {
  const byField: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field && rawRow[header]) byField[field] = rawRow[header];
  }

  try {
    if (entityType === "customers") {
      const phone = normalizePhone(byField.phone ?? "");
      if (!phone) return { ok: false, reason: "invalid_phone" };
      const parsed = CustomerFields.parse({
        firstName: byField.firstName,
        lastName: byField.lastName || undefined,
        phone,
        email: byField.email ? (normalizeEmail(byField.email) ?? undefined) : undefined,
        birthday: byField.birthday || undefined,
        notes: byField.notes || undefined,
      });
      return { ok: true, fields: parsed };
    }

    if (entityType === "services") {
      const parsed = ServiceFields.parse({
        name: byField.name,
        durationMin: parseDurationMin(byField.durationMin),
        priceCents: parsePriceCents(byField.priceCents),
      });
      return { ok: true, fields: parsed };
    }

    if (entityType === "products") {
      const parsed = ProductFields.parse({
        name: byField.name,
        priceCents: parsePriceCents(byField.priceCents),
      });
      return { ok: true, fields: parsed };
    }

    // appointments
    const phone = normalizePhone(byField.phone ?? "");
    if (!phone) return { ok: false, reason: "invalid_phone" };
    const dateParts = parseDateParts(byField.date ?? "");
    if (!dateParts) return { ok: false, reason: "invalid_date" };
    const timeParts = parseTimeParts(byField.startTime ?? "");
    if (!timeParts) return { ok: false, reason: "invalid_time" };

    const parsed = AppointmentFields.parse({
      firstName: byField.firstName,
      phone,
      email: byField.email ? (normalizeEmail(byField.email) ?? undefined) : undefined,
      serviceName: byField.serviceName,
      date: byField.date,
      startTime: byField.startTime,
      durationMin: parseDurationMin(byField.durationMin),
      priceCents: parsePriceCents(byField.priceCents),
    });

    const pad = (n: number) => String(n).padStart(2, "0");
    const isoDate = `${dateParts.year}-${pad(dateParts.month)}-${pad(dateParts.day)}`;
    const isoTime = `${pad(timeParts.hour)}:${pad(timeParts.minute)}`;

    return {
      ok: true,
      fields: { ...parsed, phone, isoDate, isoTime },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, reason: `validation:${error.issues[0]?.path.join(".")}` };
    }
    return { ok: false, reason: "unknown_error" };
  }
}
