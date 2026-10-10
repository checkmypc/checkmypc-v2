import { env } from "@/lib/env.server";
import { catalog, recomputeProduct } from "@/lib/catalog";
import { RECIPES } from "@/lib/prebuilts";
import { ALL_PACKAGES, CONTACT } from "@/lib/services";
import { SEED_REPORTS, SEED_TEAM, seedListings } from "@/lib/ops-seed";
import galleryFile from "../../../public/parts/products/manifest.json";
import type { Sql } from "@/lib/db";

const CATEGORY_STUDIO: Record<string, string[]> = {
  cpu: ["/parts/studio/cpu-front.jpg", "/parts/studio/cpu-side.jpg", "/parts/studio/cpu-rear.jpg", "/parts/studio/cpu-detail.jpg"],
  cooler: ["/parts/studio/cooler-front.jpg", "/parts/studio/cooler-side.jpg", "/parts/studio/cooler-rear.jpg", "/parts/studio/cooler-detail.jpg"],
  motherboard: ["/parts/studio/cpu-detail.jpg", "/parts/studio/cpu-front.jpg", "/parts/studio/cpu-side.jpg", "/parts/studio/cpu-rear.jpg"],
  ram: ["/parts/studio/ram-front.jpg", "/parts/studio/ram-side.jpg", "/parts/studio/ram-rear.jpg", "/parts/studio/ram-detail.jpg"],
  storage: ["/parts/studio/storage-front.jpg", "/parts/studio/storage-side.jpg", "/parts/studio/storage-rear.jpg", "/parts/studio/storage-detail.jpg"],
  gpu: ["/parts/studio/gpu-front.jpg", "/parts/studio/gpu-side.jpg", "/parts/studio/gpu-rear.jpg", "/parts/studio/gpu-detail.jpg"],
  psu: ["/parts/studio/psu-front.jpg", "/parts/studio/psu-side.jpg", "/parts/studio/psu-rear.jpg", "/parts/studio/psu-detail.jpg"],
  case: ["/parts/studio/case-front.jpg", "/parts/studio/case-side.jpg", "/parts/studio/case-rear.jpg", "/parts/studio/case-detail.jpg"],
  display: ["/parts/studio/display-front.jpg", "/parts/studio/display-side.jpg", "/parts/studio/display-rear.jpg", "/parts/studio/display-detail.jpg"],
  peripheral: ["/parts/studio/peripheral-front.jpg", "/parts/studio/peripheral-side.jpg", "/parts/studio/peripheral-rear.jpg", "/parts/studio/peripheral-detail.jpg"],
};

function galleryFor(id: string, category: string, image: string): string[] {
  const fromManifest = (galleryFile as { manifest?: Record<string, string[]> }).manifest?.[id] ?? [];
  const studio = CATEGORY_STUDIO[category] ?? [];
  return [...new Set([image, ...fromManifest, ...studio].filter(Boolean))];
}

let seeding: Promise<void> | null = null;

export async function ensureSeeded(sql: Sql): Promise<void> {
  if (!seeding) {
    seeding = seedIfNeeded(sql).finally(() => {
      seeding = null;
    });
  }
  await seeding;
}

async function seedIfNeeded(sql: Sql): Promise<void> {
  const flagged = await sql<{ value: string }>`select value from app_meta where key = ${"seeded"}`;
  if (flagged[0]?.value === "1") return;

  for (const raw of catalog.products) {
    const p = recomputeProduct({
      ...raw,
      images: galleryFor(raw.id, raw.category, raw.image),
    });
    await sql.query(
      `insert into products (
        id, category, name, brand, image, images, description, msrp, best_price, used_price,
        in_stock, store_count, power_draw, specs, offers, history
      ) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb)
      on conflict (id) do nothing`,
      [
        p.id,
        p.category,
        p.name,
        p.brand,
        p.image,
        JSON.stringify(p.images ?? []),
        p.description ?? "",
        p.msrp,
        p.best_price,
        p.used_price,
        p.in_stock,
        p.store_count,
        p.power_draw,
        JSON.stringify(p.specs ?? {}),
        JSON.stringify(p.offers ?? []),
        JSON.stringify(p.history ?? []),
      ],
    );
  }

  for (const r of RECIPES) {
    await sql.query(
      `insert into prebuilts (id, title, parts, condition, store, city, available)
       values ($1,$2,$3::jsonb,$4,$5,$6, true)
       on conflict (id) do nothing`,
      [r.id, r.title, JSON.stringify(r.parts), r.condition, r.store, r.city],
    );
  }

  for (const l of seedListings()) {
    await sql.query(
      `insert into used_listings (
        id, title, city, asking, fair_value, condition, cpu, gpu, ram, storage,
        inspected, verdict, risk, notes, temps, ssd_health, images
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17::jsonb)
      on conflict (id) do nothing`,
      [
        l.id,
        l.title,
        l.city,
        l.asking,
        l.fairValue,
        l.condition,
        l.cpu,
        l.gpu,
        l.ram,
        l.storage,
        l.inspected,
        l.verdict ?? null,
        l.risk,
        l.notes,
        l.temps ? JSON.stringify(l.temps) : null,
        l.ssdHealth ?? null,
        JSON.stringify(l.images ?? []),
      ],
    );
  }

  for (const r of SEED_REPORTS) {
    await sql.query(
      `insert into inspection_reports (
        id, public_id, listing_id, booking_id, title, date, city, technician, customer_name,
        verdict, risk, asking, fair_value, suggest_offer, hardware, temps, issues, tests,
        photos, notes, published
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,
        $19::jsonb,$20,$21
      ) on conflict (id) do nothing`,
      [
        r.id,
        r.publicId ?? r.id,
        r.listingId ?? null,
        r.bookingId ?? null,
        r.title,
        r.date,
        r.city,
        r.technician,
        r.customerName ?? "",
        r.verdict,
        r.risk,
        r.asking,
        r.fairValue,
        r.suggestOffer,
        JSON.stringify(r.hardware),
        JSON.stringify(r.temps),
        JSON.stringify(r.issues),
        r.tests ? JSON.stringify(r.tests) : null,
        JSON.stringify(r.photos ?? []),
        r.notes ?? "",
        r.published,
      ],
    );
  }

  for (const t of SEED_TEAM) {
    await sql.query(
      `insert into technicians (id, name, city, phone, skills, active)
       values ($1,$2,$3,$4,$5::jsonb,$6)
       on conflict (id) do nothing`,
      [t.id, t.name, t.city, t.phone, JSON.stringify(t.skills), t.active],
    );
  }

  for (const pkg of ALL_PACKAGES) {
    await sql.query(
      `insert into service_prices (id, price) values ($1,$2) on conflict (id) do nothing`,
      [pkg.id, pkg.price],
    );
  }

  await sql.query(
    `insert into site_settings (id, email, phone, hours, whatsapp, instagram, tiktok, facebook)
     values ('default', $1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do nothing`,
    [
      CONTACT.email,
      "",
      CONTACT.hours,
      "",
      CONTACT.instagram,
      CONTACT.tiktok,
      CONTACT.facebook,
    ],
  );

  const envEmail = env("ADMIN_EMAIL")?.trim().toLowerCase();
  const envPassword = env("ADMIN_PASSWORD");
  if (envEmail && envPassword && envPassword.length >= 8) {
    const { hashPassword } = await import("./crypto");
    const passwordHash = await hashPassword(envPassword);
    await sql.query(
      `insert into admins (id, email, name, role, password_hash, updated_at)
       values ($1,$2,$3,'admin',$4, now())
       on conflict (email) do update set
         password_hash = excluded.password_hash,
         name = excluded.name,
         updated_at = now()
       where admins.password_hash = ''`,
      ["admin-primary", envEmail, "Operator", passwordHash],
    );
    await sql.query(
      `insert into app_meta (key, value) values ('admin_owner', $1) on conflict (key) do nothing`,
      [envEmail],
    );
  }

  await sql.query(`insert into app_meta (key, value) values ('seeded', '1') on conflict (key) do nothing`);
}

export async function reseedCatalogue(): Promise<void> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql.query(`delete from app_meta where key = $1`, ["seeded"]);
  await sql.query(`delete from products`);
  await sql.query(`delete from prebuilts`);
  await sql.query(`delete from used_listings`);
  await sql.query(`delete from inspection_reports`);
  await sql.query(`delete from technicians`);
  await sql.query(`delete from service_prices`);
  await seedIfNeeded(sql);
}
