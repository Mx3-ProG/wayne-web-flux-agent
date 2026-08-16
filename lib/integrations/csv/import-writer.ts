import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { transformRow } from "@/lib/integrations/csv/transform";
import type { ImportEntityType } from "@/lib/integrations/csv/fields";

type Admin = ReturnType<typeof createAdminClient>;

type ImportJob = {
  id: string;
  page_id: string;
  entity_type: ImportEntityType;
  column_mapping: Record<string, string | null>;
};

type ImportRow = {
  id: number;
  row_number: number;
  raw_row: Record<string, string>;
};

export type RowOutcome = { status: "imported" | "merged" | "skipped" | "error"; reason?: string };

async function upsertCustomer(
  admin: Admin,
  pageId: string,
  fields: {
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    birthday?: string;
    notes?: string;
  }
): Promise<{ customerId: string; merged: boolean }> {
  const { data: existing } = await admin
    .from("customers")
    .select("id, email, note")
    .eq("page_id", pageId)
    .eq("phone", fields.phone)
    .maybeSingle();

  if (existing) {
    await admin
      .from("customers")
      .update({
        first_name: fields.firstName,
        last_name: fields.lastName ?? null,
        email: fields.email ?? existing.email,
        birthday: fields.birthday ?? null,
        note: existing.note || fields.notes || "",
      })
      .eq("id", existing.id);
    return { customerId: existing.id, merged: true };
  }

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      page_id: pageId,
      first_name: fields.firstName,
      last_name: fields.lastName ?? null,
      phone: fields.phone,
      email: fields.email ?? null,
      birthday: fields.birthday ?? null,
      note: fields.notes ?? "",
      source: "csv",
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "customer_insert_failed");
  return { customerId: created.id, merged: false };
}

async function getOrCreateDefaultServiceFamily(admin: Admin, pageId: string): Promise<string> {
  const { data: existing } = await admin
    .from("service_families")
    .select("id")
    .eq("page_id", pageId)
    .eq("name", "Importé")
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("service_families")
    .insert({ page_id: pageId, name: "Importé", position: 999 })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "family_creation_failed");
  return created.id;
}

// Traite une ligne déjà claim (status='processing') : transforme, dédup/
// upsert vers l'entité canonique, enregistre la correspondance externe.
// Idempotent : si une correspondance existe déjà pour cette ligne (reprise
// après échec partiel), on ne réécrit rien.
export async function applyImportRow(admin: Admin, job: ImportJob, row: ImportRow): Promise<RowOutcome> {
  const externalId = `${job.id}:${row.row_number}`;

  const { data: existingMapping } = await admin
    .from("external_entity_mappings")
    .select("id")
    .eq("page_id", job.page_id)
    .eq("provider", "csv")
    .eq("external_entity_type", job.entity_type === "appointments" ? "appointment" : job.entity_type.slice(0, -1))
    .eq("external_id", externalId)
    .maybeSingle();
  if (existingMapping) return { status: "skipped", reason: "already_imported" };

  const result = transformRow(job.entity_type, job.column_mapping, row.raw_row);
  if (!result.ok) return { status: "error", reason: result.reason };
  const fields = result.fields as Record<string, unknown>;

  try {
    if (job.entity_type === "customers") {
      const { customerId, merged } = await upsertCustomer(admin, job.page_id, fields as never);
      await admin.from("external_entity_mappings").insert({
        page_id: job.page_id,
        provider: "csv",
        external_entity_type: "customer",
        external_id: externalId,
        flux_entity_type: "customer",
        flux_entity_id: customerId,
      });
      return { status: merged ? "merged" : "imported" };
    }

    if (job.entity_type === "services") {
      const name = fields.name as string;
      const durationMin = (fields.durationMin as number | undefined) ?? 60;
      const priceCents = (fields.priceCents as number | undefined) ?? 0;

      const { data: existing } = await admin
        .from("services")
        .select("id")
        .eq("page_id", job.page_id)
        .ilike("name", name)
        .maybeSingle();

      let serviceId: string;
      let merged = false;
      if (existing) {
        await admin.from("services").update({ duration_min: durationMin, price_cents: priceCents }).eq("id", existing.id);
        serviceId = existing.id;
        merged = true;
      } else {
        const familyId = await getOrCreateDefaultServiceFamily(admin, job.page_id);
        const { data: created, error } = await admin
          .from("services")
          .insert({
            page_id: job.page_id,
            family_id: familyId,
            name,
            duration_min: durationMin,
            price_cents: priceCents,
            source: "csv",
          })
          .select("id")
          .single();
        if (error || !created) throw new Error(error?.message ?? "service_insert_failed");
        serviceId = created.id;
      }

      await admin.from("external_entity_mappings").insert({
        page_id: job.page_id,
        provider: "csv",
        external_entity_type: "service",
        external_id: externalId,
        flux_entity_type: "service",
        flux_entity_id: serviceId,
      });
      return { status: merged ? "merged" : "imported" };
    }

    if (job.entity_type === "products") {
      const name = fields.name as string;
      const priceCents = (fields.priceCents as number | undefined) ?? 0;

      const { data: existing } = await admin
        .from("products")
        .select("id")
        .eq("page_id", job.page_id)
        .ilike("name", name)
        .maybeSingle();

      let productId: string;
      let merged = false;
      if (existing) {
        await admin.from("products").update({ price_cents: priceCents }).eq("id", existing.id);
        productId = existing.id;
        merged = true;
      } else {
        const { data: created, error } = await admin
          .from("products")
          .insert({ page_id: job.page_id, name, price_cents: priceCents, source: "csv" })
          .select("id")
          .single();
        if (error || !created) throw new Error(error?.message ?? "product_insert_failed");
        productId = created.id;
      }

      await admin.from("external_entity_mappings").insert({
        page_id: job.page_id,
        provider: "csv",
        external_entity_type: "product",
        external_id: externalId,
        flux_entity_type: "product",
        flux_entity_id: productId,
      });
      return { status: merged ? "merged" : "imported" };
    }

    // appointments
    const { customerId } = await upsertCustomer(admin, job.page_id, {
      firstName: fields.firstName as string,
      phone: fields.phone as string,
      email: fields.email as string | undefined,
    });

    const serviceName = fields.serviceName as string;
    const { data: matchedService } = await admin
      .from("services")
      .select("id, duration_min, price_cents")
      .eq("page_id", job.page_id)
      .ilike("name", serviceName)
      .maybeSingle();

    const { data: created, error } = await admin
      .from("bookings")
      .insert({
        page_id: job.page_id,
        service_id: matchedService?.id ?? null,
        service_name: serviceName,
        duration_min: (fields.durationMin as number | undefined) ?? matchedService?.duration_min ?? 60,
        price_cents: (fields.priceCents as number | undefined) ?? matchedService?.price_cents ?? 0,
        date: fields.isoDate,
        start_time: fields.isoTime,
        first_name: fields.firstName,
        phone: fields.phone,
        email: fields.email ?? null,
        customer_id: customerId,
        source: "csv",
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "booking_insert_failed");

    await admin.from("external_entity_mappings").insert({
      page_id: job.page_id,
      provider: "csv",
      external_entity_type: "appointment",
      external_id: externalId,
      flux_entity_type: "booking",
      flux_entity_id: created.id,
    });
    return { status: "imported" };
  } catch (error) {
    return { status: "error", reason: error instanceof Error ? error.message.slice(0, 200) : "write_failed" };
  }
}
