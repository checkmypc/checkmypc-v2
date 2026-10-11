import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AdminSnapshot, PublicSnapshot } from "./server/repo";
import type { Booking, OpsSettings, Product, Technician } from "./types";
import type { InspectionReport, UsedListing } from "./used";
import type { PrebuiltRecipe } from "./prebuilts";

const stockZ = z.enum(["in_stock", "low_stock", "out_of_stock", "unknown"]);
const offerZ = z.object({
  store: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  price: z.number().min(0).max(2_000_000),
  stock: stockZ,
  checked_minutes_ago: z.number().min(0).max(10_000_000),
  url: z.string().max(500),
});

const productZ = z.object({
  id: z.string().min(1).max(80),
  category: z.enum([
    "cpu",
    "cooler",
    "motherboard",
    "ram",
    "storage",
    "gpu",
    "psu",
    "case",
    "display",
    "peripheral",
  ]),
  name: z.string().min(1).max(160),
  brand: z.string().min(1).max(80),
  image: z.string().max(400),
  images: z.array(z.string().max(400)).max(12).optional(),
  description: z.string().max(4000).optional(),
  msrp: z.number().min(0).max(2_000_000),
  best_price: z.number().min(0).max(2_000_000),
  used_price: z.number().min(0).max(2_000_000),
  in_stock: z.boolean(),
  store_count: z.number().min(0).max(50),
  power_draw: z.number().min(0).max(2000),
  specs: z.record(z.string(), z.string()),
  offers: z.array(offerZ).max(20),
  history: z.array(z.object({ d: z.string().max(20), p: z.number() })).max(48),
});

const bookingStatusZ = z.enum(["new", "confirmed", "scheduled", "in_progress", "done", "cancelled"]);
const kindZ = z.enum(["inspection", "assembly", "cleaning"]);

const publicBookingZ = z.object({
  kind: kindZ,
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[0-9+\s()-]+$/),
  email: z.union([z.literal(""), z.string().email().max(120)]).optional(),
  city: z.string().trim().min(2).max(80),
  packageId: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  listingUrl: z.string().max(500).optional(),
  machineType: z.string().max(80).optional(),
  preferredDate: z.string().max(20).optional(),
  preferredTime: z.string().max(20).optional(),
});

const bookingZ = publicBookingZ.extend({
  id: z.string().min(1).max(80),
  createdAt: z.string().max(40).optional(),
  status: bookingStatusZ.optional(),
  assignedTo: z.string().max(80).optional(),
  quotedPrice: z.number().min(0).max(100000).optional(),
  paidAmount: z.number().min(0).max(100000).optional(),
  scheduledAt: z.string().max(40).optional(),
  internalNotes: z.string().max(4000).optional(),
});

const listingZ = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  city: z.string().min(1).max(80),
  asking: z.number().min(0).max(2_000_000),
  fairValue: z.number().min(0).max(2_000_000),
  condition: z.string().max(120),
  cpu: z.string().max(120),
  gpu: z.string().max(120),
  ram: z.string().max(120),
  storage: z.string().max(120),
  inspected: z.boolean(),
  verdict: z.enum(["BUY", "NEGOTIATE", "DONT"]).optional(),
  risk: z.enum(["low", "medium", "high"]),
  notes: z.string().max(4000),
  temps: z.object({ cpu: z.number(), gpu: z.number() }).optional(),
  ssdHealth: z.number().min(0).max(100).optional(),
  images: z.array(z.string().max(400)).max(12).optional(),
});

const reportZ = z.object({
  id: z.string().min(1).max(80),
  publicId: z.string().max(80).optional(),
  listingId: z.string().max(80).optional(),
  bookingId: z.string().max(80).optional(),
  title: z.string().min(1).max(160),
  date: z.string().max(20),
  city: z.string().max(80),
  technician: z.string().max(80),
  customerName: z.string().max(120).optional(),
  verdict: z.enum(["BUY", "NEGOTIATE", "DONT"]),
  risk: z.enum(["low", "medium", "high"]),
  asking: z.number().min(0).max(2_000_000),
  fairValue: z.number().min(0).max(2_000_000),
  suggestOffer: z.number().min(0).max(2_000_000),
  hardware: z.array(z.tuple([z.string(), z.string(), z.string()])).max(20),
  temps: z.object({
    cpuIdle: z.number(),
    cpuLoad: z.number(),
    gpuIdle: z.number(),
    gpuLoad: z.number(),
  }),
  issues: z.array(z.string().max(400)).max(30),
  tests: z
    .array(
      z.object({
        id: z.string(),
        result: z.enum(["pass", "fail", "warn", "na"]),
        note: z.string().max(400).optional(),
      }),
    )
    .optional(),
  photos: z.array(z.string().max(400)).max(16).optional(),
  notes: z.string().max(4000).optional(),
  published: z.boolean(),
});

const recipeZ = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  parts: z.array(z.string().max(80)).max(20),
  condition: z.enum(["new", "used"]),
  store: z.string().max(80),
  city: z.string().max(80),
  description: z.string().max(2000).optional(),
  image: z.string().max(400).optional(),
  usage: z.string().max(80).optional(),
  available: z.boolean().optional(),
});

const techZ = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  city: z.string().max(80),
  phone: z.string().max(20),
  skills: z.array(kindZ).max(6),
  active: z.boolean(),
});

const settingsZ = z.object({
  email: z.string().email().max(120),
  phone: z.string().max(30),
  hours: z.string().max(120),
  whatsapp: z.string().max(30),
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
});

const adminEmailZ = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .email()
  .transform((v) => v.toLowerCase());
const adminPasswordZ = z.string().min(8, "Password must be at least 8 characters").max(120);
const adminNameZ = z.string().trim().min(2).max(80);

function fail(message: string): never {
  throw new Error(message);
}

export const getPublicSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSnapshot> => {
  const { loadPublicSnapshot } = await import("./server/repo");
  return loadPublicSnapshot();
});

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { adminNeedsSetup, readAdminSession } = await import("./server/session");
  const session = await readAdminSession();
  return {
    ok: Boolean(session),
    email: session?.email ?? null,
    needsSetup: session ? false : await adminNeedsSetup(),
  };
});

export const adminSignup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: adminNameZ,
      email: adminEmailZ,
      password: adminPasswordZ,
    }),
  )
  .handler(async ({ data }) => {
    const { signupFirstAdmin, writeAdminSession } = await import("./server/session");
    const session = await signupFirstAdmin(data);
    await writeAdminSession(session.email);
    return { ok: true as const, email: session.email };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: adminEmailZ,
      password: adminPasswordZ,
    }),
  )
  .handler(async ({ data }) => {
    const { loginAdmin, writeAdminSession } = await import("./server/session");
    const session = await loginAdmin(data.email, data.password);
    await writeAdminSession(session.email);
    return { ok: true as const, email: session.email };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearAdminSession } = await import("./server/session");
  await clearAdminSession();
  return { ok: true as const };
});

export const listOperatorsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin, listOperators } = await import("./server/session");
  await requireAdmin();
  return listOperators();
});

export const createOperatorFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: adminNameZ,
      email: adminEmailZ,
      password: adminPasswordZ,
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin, createOperator } = await import("./server/session");
    const session = await requireAdmin();
    return createOperator(data, session.email);
  });

export const changeAdminPasswordFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      current: adminPasswordZ,
      next: adminPasswordZ,
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin, changeOwnPassword } = await import("./server/session");
    const session = await requireAdmin();
    await changeOwnPassword(session.email, data.current, data.next);
    return { ok: true as const };
  });

export const getAdminSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<AdminSnapshot> => {
  const { requireAdmin } = await import("./server/session");
  await requireAdmin();
  const { loadAdminSnapshot } = await import("./server/repo");
  return loadAdminSnapshot();
});

export const createPublicBooking = createServerFn({ method: "POST" })
  .validator(publicBookingZ)
  .handler(async ({ data }): Promise<Booking> => {
    const { upsertBooking, loadPublicSnapshot } = await import("./server/repo");
    const pub = await loadPublicSnapshot();
    const quoted = data.packageId ? (pub.packagePrices[data.packageId] ?? 0) : 0;
    return upsertBooking({
      id: "",
      createdAt: "",
      kind: data.kind,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      city: data.city,
      packageId: data.packageId,
      notes: data.notes ?? "",
      listingUrl: data.listingUrl,
      machineType: data.machineType,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      status: "new",
      quotedPrice: quoted,
    });
  });

export const saveProductFn = createServerFn({ method: "POST" })
  .validator(productZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertProduct } = await import("./server/repo");
    return upsertProduct(data as Product, session.email);
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteProduct } = await import("./server/repo");
    await deleteProduct(data.id, session.email);
    return { ok: true as const };
  });

export const touchPricesFn = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./server/session");
  await requireAdmin();
  const { touchAllOffers } = await import("./server/repo");
  await touchAllOffers();
  return { ok: true as const };
});

export const saveBookingFn = createServerFn({ method: "POST" })
  .validator(bookingZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertBooking } = await import("./server/repo");
    return upsertBooking(data as Booking, session.email);
  });

export const deleteBookingFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteBooking } = await import("./server/repo");
    await deleteBooking(data.id, session.email);
    return { ok: true as const };
  });

export const saveListingFn = createServerFn({ method: "POST" })
  .validator(listingZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertListing } = await import("./server/repo");
    await upsertListing(data as UsedListing, session.email);
    return { ok: true as const };
  });

export const deleteListingFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteListing } = await import("./server/repo");
    await deleteListing(data.id, session.email);
    return { ok: true as const };
  });

export const saveReportFn = createServerFn({ method: "POST" })
  .validator(reportZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertReport } = await import("./server/repo");
    return upsertReport(data as InspectionReport, session.email);
  });

export const deleteReportFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteReport } = await import("./server/repo");
    await deleteReport(data.id, session.email);
    return { ok: true as const };
  });

export const saveRecipeFn = createServerFn({ method: "POST" })
  .validator(recipeZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertRecipe } = await import("./server/repo");
    await upsertRecipe(data as PrebuiltRecipe, session.email);
    return { ok: true as const };
  });

export const deleteRecipeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteRecipe } = await import("./server/repo");
    await deleteRecipe(data.id, session.email);
    return { ok: true as const };
  });

export const setPackagePriceFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(40), price: z.number().min(0).max(100000) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { setPackagePrice } = await import("./server/repo");
    await setPackagePrice(data.id, data.price, session.email);
    return { ok: true as const };
  });

export const saveTechFn = createServerFn({ method: "POST" })
  .validator(techZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { upsertTech } = await import("./server/repo");
    await upsertTech(data as Technician, session.email);
    return { ok: true as const };
  });

export const deleteTechFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { deleteTech } = await import("./server/repo");
    await deleteTech(data.id, session.email);
    return { ok: true as const };
  });

export const saveSettingsFn = createServerFn({ method: "POST" })
  .validator(settingsZ)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    const { saveSettings } = await import("./server/repo");
    await saveSettings(data as OpsSettings, session.email);
    return { ok: true as const };
  });

export const reseedCatalogueFn = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./server/session");
  await requireAdmin();
  const { reseedCatalogue } = await import("./server/seed");
  await reseedCatalogue();
  return { ok: true as const };
});

export const uploadMediaFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      filename: z.string().min(1).max(180),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataBase64: z.string().min(8).max(6_000_000),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    await requireAdmin();
    const { decodeBase64Payload } = await import("./server/crypto");
    const bytes = decodeBase64Payload(data.dataBase64);
    if (bytes.length > 4_500_000) fail("Image is too large (max 4.5 MB)");
    if (bytes.length < 24) fail("Image is empty");
    const { putMedia } = await import("./server/repo");
    return putMedia({ filename: data.filename, contentType: data.contentType, bytes });
  });

export const importOpsFn = createServerFn({ method: "POST" })
  .validator(z.object({ json: z.string().min(2).max(8_000_000) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./server/session");
    const session = await requireAdmin();
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.json);
    } catch {
      fail("Invalid JSON");
    }
    if (!parsed || typeof parsed !== "object") fail("Invalid snapshot");
    const snap = parsed as Partial<AdminSnapshot>;
    const { replaceOpsSnapshot } = await import("./server/repo");
    await replaceOpsSnapshot(
      {
        products: Array.isArray(snap.products) ? snap.products : [],
        listings: Array.isArray(snap.listings) ? snap.listings : [],
        reports: Array.isArray(snap.reports) ? snap.reports : [],
        recipes: Array.isArray(snap.recipes) ? snap.recipes : [],
        packagePrices: snap.packagePrices ?? {},
        settings: snap.settings ?? { email: "hello@checkmypc.ma", phone: "", hours: "", whatsapp: "" },
        team: Array.isArray(snap.team) ? snap.team : [],
        bookings: Array.isArray(snap.bookings) ? snap.bookings : [],
        activity: [],
      },
      session.email,
    );
    return { ok: true as const };
  });
