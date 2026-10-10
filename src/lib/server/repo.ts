import { getSql, type Sql } from "@/lib/db";
import { recomputeProduct } from "@/lib/catalog";
import type {
  ActivityItem,
  Booking,
  BookingStatus,
  CategorySlug,
  Offer,
  OpsSettings,
  PricePoint,
  Product,
  ServiceKind,
  Technician,
} from "@/lib/types";
import type { InspectionReport, UsedListing, Verdict } from "@/lib/used";
import type { PrebuiltRecipe } from "@/lib/prebuilts";
import { asBool, asInt, asIso, asJson, asString } from "./coerce";
import { newId } from "./crypto";

export type PublicSnapshot = {
  products: Product[];
  listings: UsedListing[];
  reports: InspectionReport[];
  recipes: PrebuiltRecipe[];
  packagePrices: Record<string, number>;
  settings: OpsSettings;
  team: Technician[];
};

export type AdminSnapshot = PublicSnapshot & {
  bookings: Booking[];
  activity: ActivityItem[];
};

type ProductRow = Record<string, unknown>;
type BookingRow = Record<string, unknown>;
type ListingRow = Record<string, unknown>;
type ReportRow = Record<string, unknown>;
type RecipeRow = Record<string, unknown>;
type TechRow = Record<string, unknown>;
type SettingsRow = Record<string, unknown>;
type ActivityRow = Record<string, unknown>;

function mapProduct(row: ProductRow): Product {
  return recomputeProduct({
    id: asString(row.id),
    category: asString(row.category) as CategorySlug,
    name: asString(row.name),
    brand: asString(row.brand),
    image: asString(row.image),
    images: asJson<string[]>(row.images, []),
    description: asString(row.description),
    msrp: asInt(row.msrp),
    best_price: asInt(row.best_price),
    used_price: asInt(row.used_price),
    in_stock: asBool(row.in_stock),
    store_count: asInt(row.store_count),
    power_draw: asInt(row.power_draw),
    specs: asJson<Record<string, string>>(row.specs, {}),
    offers: asJson<Offer[]>(row.offers, []),
    history: asJson<PricePoint[]>(row.history, []),
  });
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: asString(row.id),
    kind: asString(row.kind) as ServiceKind,
    createdAt: asIso(row.created_at),
    name: asString(row.name),
    phone: asString(row.phone),
    email: asString(row.email) || undefined,
    city: asString(row.city),
    packageId: asString(row.package_id) || undefined,
    notes: asString(row.notes),
    listingUrl: asString(row.listing_url) || undefined,
    machineType: asString(row.machine_type) || undefined,
    status: (asString(row.status) || "new") as BookingStatus,
    assignedTo: asString(row.assigned_to) || undefined,
    quotedPrice: row.quoted_price == null ? undefined : asInt(row.quoted_price),
    paidAmount: row.paid_amount == null ? undefined : asInt(row.paid_amount),
    scheduledAt: asString(row.scheduled_at) || undefined,
    preferredDate: asString(row.preferred_date) || undefined,
    preferredTime: asString(row.preferred_time) || undefined,
    internalNotes: asString(row.internal_notes) || undefined,
  };
}

function mapListing(row: ListingRow): UsedListing {
  return {
    id: asString(row.id),
    title: asString(row.title),
    city: asString(row.city),
    asking: asInt(row.asking),
    fairValue: asInt(row.fair_value),
    condition: asString(row.condition),
    cpu: asString(row.cpu),
    gpu: asString(row.gpu),
    ram: asString(row.ram),
    storage: asString(row.storage),
    inspected: asBool(row.inspected),
    verdict: (asString(row.verdict) || undefined) as Verdict | undefined,
    risk: (asString(row.risk) || "medium") as UsedListing["risk"],
    notes: asString(row.notes),
    temps: asJson<UsedListing["temps"]>(row.temps, undefined),
    ssdHealth: row.ssd_health == null ? undefined : asInt(row.ssd_health),
    images: asJson<string[]>(row.images, []),
  };
}

function mapReport(row: ReportRow): InspectionReport {
  return {
    id: asString(row.id),
    publicId: asString(row.public_id) || asString(row.id),
    listingId: asString(row.listing_id) || undefined,
    bookingId: asString(row.booking_id) || undefined,
    title: asString(row.title),
    date: asString(row.date),
    city: asString(row.city),
    technician: asString(row.technician),
    customerName: asString(row.customer_name) || undefined,
    verdict: asString(row.verdict) as Verdict,
    risk: (asString(row.risk) || "medium") as InspectionReport["risk"],
    asking: asInt(row.asking),
    fairValue: asInt(row.fair_value),
    suggestOffer: asInt(row.suggest_offer),
    hardware: asJson<[string, string, string][]>(row.hardware, []),
    temps: asJson(row.temps, { cpuIdle: 0, cpuLoad: 0, gpuIdle: 0, gpuLoad: 0 }),
    issues: asJson<string[]>(row.issues, []),
    tests: asJson(row.tests, undefined),
    photos: asJson<string[]>(row.photos, []),
    notes: asString(row.notes) || undefined,
    published: asBool(row.published),
  };
}

function mapRecipe(row: RecipeRow): PrebuiltRecipe {
  return {
    id: asString(row.id),
    title: asString(row.title),
    parts: asJson<string[]>(row.parts, []),
    condition: (asString(row.condition) || "new") as "new" | "used",
    store: asString(row.store),
    city: asString(row.city),
    description: asString(row.description) || undefined,
    image: asString(row.image) || undefined,
    usage: asString(row.usage) || undefined,
    available: asBool(row.available),
  };
}

function mapTech(row: TechRow): Technician {
  return {
    id: asString(row.id),
    name: asString(row.name),
    city: asString(row.city),
    phone: asString(row.phone),
    skills: asJson<ServiceKind[]>(row.skills, []),
    active: asBool(row.active),
  };
}

function mapSettings(row: SettingsRow | undefined): OpsSettings {
  if (!row) {
    return {
      email: "hello@checkmypc.ma",
      phone: "",
      hours: "Mon–Sat 10:00–19:00",
      whatsapp: "",
    };
  }
  return {
    email: asString(row.email),
    phone: asString(row.phone),
    hours: asString(row.hours),
    whatsapp: asString(row.whatsapp),
    instagram: asString(row.instagram) || undefined,
    tiktok: asString(row.tiktok) || undefined,
    facebook: asString(row.facebook) || undefined,
  };
}

async function sqlClient(): Promise<Sql> {
  const { ensureSeeded } = await import("./seed");
  const sql = await getSql();
  await ensureSeeded(sql);
  return sql;
}

export async function loadPublicSnapshot(): Promise<PublicSnapshot> {
  const sql = await sqlClient();
  const [products, listings, reports, recipes, prices, settings, team] = await Promise.all([
    sql<ProductRow>`select * from products order by category, name`,
    sql<ListingRow>`select * from used_listings order by title`,
    sql<ReportRow>`select * from inspection_reports where published = true order by date desc`,
    sql<RecipeRow>`select * from prebuilts order by title`,
    sql<{ id: string; price: unknown }>`select id, price from service_prices`,
    sql<SettingsRow>`select * from site_settings where id = ${"default"}`,
    sql<TechRow>`select * from technicians where active = true order by name`,
  ]);
  return {
    products: products.map(mapProduct),
    listings: listings.map(mapListing),
    reports: reports.map(mapReport),
    recipes: recipes.map(mapRecipe),
    packagePrices: Object.fromEntries(prices.map((p) => [p.id, asInt(p.price)])),
    settings: mapSettings(settings[0]),
    team: team.map(mapTech),
  };
}

export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  const sql = await sqlClient();
  const pub = await loadPublicSnapshot();
  const [bookings, activity, allReports, allTeam] = await Promise.all([
    sql<BookingRow>`select * from bookings order by created_at desc`,
    sql<ActivityRow>`select * from activity_logs order by at desc limit 80`,
    sql<ReportRow>`select * from inspection_reports order by date desc`,
    sql<TechRow>`select * from technicians order by name`,
  ]);
  return {
    ...pub,
    reports: allReports.map(mapReport),
    team: allTeam.map(mapTech),
    bookings: bookings.map(mapBooking),
    activity: activity.map((row) => ({
      id: asString(row.id),
      at: asIso(row.at),
      text: asString(row.text),
    })),
  };
}

export async function logActivity(sql: Sql, text: string, actor = ""): Promise<void> {
  await sql.query(`insert into activity_logs (id, text, actor) values ($1, $2, $3)`, [
    newId("act"),
    text.slice(0, 280),
    actor,
  ]);
}

export async function upsertProduct(product: Product, actor?: string): Promise<Product> {
  const sql = await sqlClient();
  const next = recomputeProduct(product);
  await sql.query(
    `insert into products (
      id, category, name, brand, image, images, description, msrp, best_price, used_price,
      in_stock, store_count, power_draw, specs, offers, history, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb, now()
    )
    on conflict (id) do update set
      category = excluded.category, name = excluded.name, brand = excluded.brand,
      image = excluded.image, images = excluded.images, description = excluded.description,
      msrp = excluded.msrp, best_price = excluded.best_price, used_price = excluded.used_price,
      in_stock = excluded.in_stock, store_count = excluded.store_count, power_draw = excluded.power_draw,
      specs = excluded.specs, offers = excluded.offers, history = excluded.history, updated_at = now()`,
    [
      next.id,
      next.category,
      next.name,
      next.brand,
      next.image,
      JSON.stringify(next.images ?? []),
      next.description ?? "",
      next.msrp,
      next.best_price,
      next.used_price,
      next.in_stock,
      next.store_count,
      next.power_draw,
      JSON.stringify(next.specs ?? {}),
      JSON.stringify(next.offers ?? []),
      JSON.stringify(next.history ?? []),
    ],
  );
  if (actor) await logActivity(sql, `Catalogue — ${next.name}`, actor);
  return next;
}

export async function deleteProduct(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from products where id = $1`, [id]);
  if (actor) await logActivity(sql, `Removed SKU — ${id}`, actor);
}

export async function touchAllOffers(): Promise<void> {
  const sql = await sqlClient();
  const rows = await sql<ProductRow>`select * from products`;
  for (const row of rows) {
    const p = mapProduct(row);
    p.offers = p.offers.map((o) => ({ ...o, checked_minutes_ago: 0 }));
    await upsertProduct(p);
  }
  await logActivity(sql, "All listed prices marked as just checked");
}

export async function upsertBooking(booking: Booking, actor?: string): Promise<Booking> {
  const sql = await sqlClient();
  const id = booking.id || newId("bk");
  const createdAt = booking.createdAt || new Date().toISOString();
  await sql.query(
    `insert into bookings (
      id, kind, created_at, updated_at, name, phone, email, city, package_id, notes,
      listing_url, machine_type, status, assigned_to, quoted_price, paid_amount,
      scheduled_at, preferred_date, preferred_time, internal_notes
    ) values (
      $1,$2,$3, now(), $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    on conflict (id) do update set
      kind = excluded.kind, name = excluded.name, phone = excluded.phone, email = excluded.email,
      city = excluded.city, package_id = excluded.package_id, notes = excluded.notes,
      listing_url = excluded.listing_url, machine_type = excluded.machine_type, status = excluded.status,
      assigned_to = excluded.assigned_to, quoted_price = excluded.quoted_price, paid_amount = excluded.paid_amount,
      scheduled_at = excluded.scheduled_at, preferred_date = excluded.preferred_date,
      preferred_time = excluded.preferred_time, internal_notes = excluded.internal_notes, updated_at = now()`,
    [
      id,
      booking.kind,
      createdAt,
      booking.name,
      booking.phone,
      booking.email ?? "",
      booking.city,
      booking.packageId ?? null,
      booking.notes ?? "",
      booking.listingUrl ?? "",
      booking.machineType ?? "",
      booking.status ?? "new",
      booking.assignedTo ?? null,
      booking.quotedPrice ?? null,
      booking.paidAmount ?? null,
      booking.scheduledAt ?? null,
      booking.preferredDate ?? null,
      booking.preferredTime ?? null,
      booking.internalNotes ?? "",
    ],
  );
  if (actor) await logActivity(sql, `Booking — ${booking.name}`, actor);
  const rows = await sql<BookingRow>`select * from bookings where id = ${id}`;
  return mapBooking(rows[0]!);
}

export async function deleteBooking(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from bookings where id = $1`, [id]);
  if (actor) await logActivity(sql, `Deleted booking — ${id}`, actor);
}

export async function upsertListing(listing: UsedListing, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(
    `insert into used_listings (
      id, title, city, asking, fair_value, condition, cpu, gpu, ram, storage,
      inspected, verdict, risk, notes, temps, ssd_health, images, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17::jsonb, now()
    )
    on conflict (id) do update set
      title = excluded.title, city = excluded.city, asking = excluded.asking, fair_value = excluded.fair_value,
      condition = excluded.condition, cpu = excluded.cpu, gpu = excluded.gpu, ram = excluded.ram,
      storage = excluded.storage, inspected = excluded.inspected, verdict = excluded.verdict, risk = excluded.risk,
      notes = excluded.notes, temps = excluded.temps, ssd_health = excluded.ssd_health, images = excluded.images,
      updated_at = now()`,
    [
      listing.id,
      listing.title,
      listing.city,
      listing.asking,
      listing.fairValue,
      listing.condition,
      listing.cpu,
      listing.gpu,
      listing.ram,
      listing.storage,
      listing.inspected,
      listing.verdict ?? null,
      listing.risk,
      listing.notes,
      listing.temps ? JSON.stringify(listing.temps) : null,
      listing.ssdHealth ?? null,
      JSON.stringify(listing.images ?? []),
    ],
  );
  if (actor) await logActivity(sql, `Listing — ${listing.title}`, actor);
}

export async function deleteListing(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from used_listings where id = $1`, [id]);
  if (actor) await logActivity(sql, "Listing removed", actor);
}

export async function upsertReport(report: InspectionReport, actor?: string): Promise<InspectionReport> {
  const sql = await sqlClient();
  const id = report.id || newId("rep");
  const publicId = report.publicId || id;
  await sql.query(
    `insert into inspection_reports (
      id, public_id, listing_id, booking_id, title, date, city, technician, customer_name,
      verdict, risk, asking, fair_value, suggest_offer, hardware, temps, issues, tests,
      photos, notes, published, updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,
      $19::jsonb,$20,$21, now()
    )
    on conflict (id) do update set
      public_id = excluded.public_id, listing_id = excluded.listing_id, booking_id = excluded.booking_id,
      title = excluded.title, date = excluded.date, city = excluded.city, technician = excluded.technician,
      customer_name = excluded.customer_name, verdict = excluded.verdict, risk = excluded.risk,
      asking = excluded.asking, fair_value = excluded.fair_value, suggest_offer = excluded.suggest_offer,
      hardware = excluded.hardware, temps = excluded.temps, issues = excluded.issues, tests = excluded.tests,
      photos = excluded.photos, notes = excluded.notes, published = excluded.published, updated_at = now()`,
    [
      id,
      publicId,
      report.listingId ?? null,
      report.bookingId ?? null,
      report.title,
      report.date,
      report.city,
      report.technician,
      report.customerName ?? "",
      report.verdict,
      report.risk,
      report.asking,
      report.fairValue,
      report.suggestOffer,
      JSON.stringify(report.hardware ?? []),
      JSON.stringify(report.temps ?? {}),
      JSON.stringify(report.issues ?? []),
      report.tests ? JSON.stringify(report.tests) : null,
      JSON.stringify(report.photos ?? []),
      report.notes ?? "",
      report.published,
    ],
  );
  if (actor) await logActivity(sql, `Report ${report.published ? "published" : "saved"} — ${report.title}`, actor);
  return { ...report, id, publicId };
}

export async function deleteReport(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from inspection_reports where id = $1`, [id]);
  if (actor) await logActivity(sql, "Report removed", actor);
}

export async function findPublicReport(id: string): Promise<InspectionReport | null> {
  const sql = await sqlClient();
  const rows = await sql<ReportRow>`
    select * from inspection_reports
    where published = true and (id = ${id} or public_id = ${id})
    limit 1
  `;
  return rows[0] ? mapReport(rows[0]) : null;
}

export async function upsertRecipe(recipe: PrebuiltRecipe, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(
    `insert into prebuilts (
      id, title, parts, condition, store, city, description, image, usage, available, updated_at
    ) values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10, now())
    on conflict (id) do update set
      title = excluded.title, parts = excluded.parts, condition = excluded.condition, store = excluded.store,
      city = excluded.city, description = excluded.description, image = excluded.image, usage = excluded.usage,
      available = excluded.available, updated_at = now()`,
    [
      recipe.id,
      recipe.title,
      JSON.stringify(recipe.parts ?? []),
      recipe.condition,
      recipe.store,
      recipe.city,
      recipe.description ?? "",
      recipe.image ?? "",
      recipe.usage ?? "",
      recipe.available !== false,
    ],
  );
  if (actor) await logActivity(sql, `Prebuilt — ${recipe.title}`, actor);
}

export async function deleteRecipe(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from prebuilts where id = $1`, [id]);
  if (actor) await logActivity(sql, "Prebuilt removed", actor);
}

export async function setPackagePrice(id: string, price: number, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(
    `insert into service_prices (id, price) values ($1,$2)
     on conflict (id) do update set price = excluded.price`,
    [id, price],
  );
  if (actor) await logActivity(sql, "Service price updated", actor);
}

export async function upsertTech(tech: Technician, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(
    `insert into technicians (id, name, city, phone, skills, active)
     values ($1,$2,$3,$4,$5::jsonb,$6)
     on conflict (id) do update set
       name = excluded.name, city = excluded.city, phone = excluded.phone,
       skills = excluded.skills, active = excluded.active`,
    [tech.id, tech.name, tech.city, tech.phone, JSON.stringify(tech.skills ?? []), tech.active],
  );
  if (actor) await logActivity(sql, `Technician — ${tech.name}`, actor);
}

export async function deleteTech(id: string, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from technicians where id = $1`, [id]);
  if (actor) await logActivity(sql, "Technician removed", actor);
}

export async function saveSettings(settings: OpsSettings, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(
    `insert into site_settings (id, email, phone, hours, whatsapp, instagram, tiktok, facebook, updated_at)
     values ('default', $1,$2,$3,$4,$5,$6,$7, now())
     on conflict (id) do update set
       email = excluded.email, phone = excluded.phone, hours = excluded.hours, whatsapp = excluded.whatsapp,
       instagram = excluded.instagram, tiktok = excluded.tiktok, facebook = excluded.facebook, updated_at = now()`,
    [
      settings.email,
      settings.phone,
      settings.hours,
      settings.whatsapp,
      settings.instagram ?? "",
      settings.tiktok ?? "",
      settings.facebook ?? "",
    ],
  );
  if (actor) await logActivity(sql, "Settings saved", actor);
}

export async function replaceOpsSnapshot(snap: AdminSnapshot, actor?: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from products`);
  await sql.query(`delete from prebuilts`);
  await sql.query(`delete from used_listings`);
  await sql.query(`delete from inspection_reports`);
  await sql.query(`delete from technicians`);
  await sql.query(`delete from bookings`);
  await sql.query(`delete from service_prices`);
  for (const p of snap.products) await upsertProduct(p);
  for (const r of snap.recipes) await upsertRecipe(r);
  for (const l of snap.listings) await upsertListing(l);
  for (const r of snap.reports) await upsertReport(r);
  for (const t of snap.team) await upsertTech(t);
  for (const b of snap.bookings) await upsertBooking(b);
  for (const [id, price] of Object.entries(snap.packagePrices)) await setPackagePrice(id, price);
  await saveSettings(snap.settings);
  if (actor) await logActivity(sql, "Ops snapshot imported", actor);
}

export async function putMedia(input: {
  filename: string;
  contentType: string;
  bytes: Buffer;
}): Promise<{ id: string; url: string }> {
  const sql = await sqlClient();
  const id = newId("media");
  await sql.query(
    `insert into media (id, filename, content_type, bytes, byte_size) values ($1,$2,$3,$4,$5)`,
    [id, input.filename.slice(0, 180), input.contentType, input.bytes, input.bytes.length],
  );
  return { id, url: `/api/media/${id}` };
}

export async function getMedia(id: string): Promise<{
  contentType: string;
  bytes: Buffer;
  filename: string;
} | null> {
  const sql = await getSql();
  const rows = await sql.query<{ content_type: string; bytes: unknown; filename: string }>(
    `select content_type, bytes, filename from media where id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const raw = row.bytes;
  const bytes = Buffer.isBuffer(raw)
    ? raw
    : raw instanceof Uint8Array
      ? Buffer.from(raw)
      : Buffer.from(raw as ArrayBuffer);
  return { contentType: row.content_type, bytes, filename: row.filename };
}

export type PublicAdmin = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export type AdminRow = PublicAdmin & { passwordHash: string };

function mapAdmin(row: Record<string, unknown>): AdminRow {
  return {
    id: asString(row.id),
    email: asString(row.email),
    name: asString(row.name) || "Operator",
    role: asString(row.role) || "admin",
    createdAt: asIso(row.created_at),
    passwordHash: asString(row.password_hash),
  };
}

export async function countPasswordedAdmins(): Promise<number> {
  const sql = await sqlClient();
  const rows = await sql<{ n: unknown }>`select count(*)::int as n from admins where password_hash <> ${""}`;
  return asInt(rows[0]?.n);
}

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`select * from admins where email = ${email} limit 1`;
  return rows[0] ? mapAdmin(rows[0]) : null;
}

export async function listPublicAdmins(): Promise<PublicAdmin[]> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`
    select id, email, name, role, created_at
    from admins
    where password_hash <> ${""}
    order by created_at asc
  `;
  return rows.map((row) => {
    const mapped = mapAdmin({ ...row, password_hash: "x" });
    return {
      id: mapped.id,
      email: mapped.email,
      name: mapped.name,
      role: mapped.role,
      createdAt: mapped.createdAt,
    };
  });
}

export async function claimFirstAdmin(email: string): Promise<boolean> {
  const sql = await sqlClient();
  const rows = await sql.query<{ key: string }>(
    `insert into app_meta (key, value) values ($1, $2) on conflict (key) do nothing returning key`,
    ["admin_owner", email],
  );
  return Boolean(rows[0]);
}

export async function releaseFirstAdminClaim(): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`delete from app_meta where key = $1`, ["admin_owner"]);
}

export async function insertAdminAccount(input: {
  email: string;
  name: string;
  passwordHash: string;
  allowReplaceEmpty?: boolean;
  actor?: string;
}): Promise<PublicAdmin> {
  const sql = await sqlClient();
  const id = newId("adm");
  const rows = input.allowReplaceEmpty
    ? await sql.query<Record<string, unknown>>(
        `insert into admins (id, email, name, role, password_hash, updated_at)
         values ($1,$2,$3,'admin',$4, now())
         on conflict (email) do update set
           password_hash = excluded.password_hash,
           name = excluded.name,
           updated_at = now()
         where admins.password_hash = ''
         returning id, email, name, role, created_at`,
        [id, input.email, input.name, input.passwordHash],
      )
    : await sql.query<Record<string, unknown>>(
        `insert into admins (id, email, name, role, password_hash, updated_at)
         values ($1,$2,$3,'admin',$4, now())
         returning id, email, name, role, created_at`,
        [id, input.email, input.name, input.passwordHash],
      );
  const row = rows[0];
  if (!row) throw new Error("That email is already an operator.");
  if (input.actor) await logActivity(sql, `Operator added — ${input.email}`, input.actor);
  else await logActivity(sql, `Admin account created — ${input.email}`, input.email);
  const mapped = mapAdmin({ ...row, password_hash: "x" });
  return {
    id: mapped.id,
    email: mapped.email,
    name: mapped.name,
    role: mapped.role,
    createdAt: mapped.createdAt,
  };
}

export async function updateAdminPassword(email: string, passwordHash: string): Promise<void> {
  const sql = await sqlClient();
  await sql.query(`update admins set password_hash = $2, updated_at = now() where email = $1`, [
    email,
    passwordHash,
  ]);
  await logActivity(sql, "Admin password changed", email);
}
