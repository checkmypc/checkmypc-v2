import { create } from "zustand";
import { toast } from "sonner";
import {
  adminLogout,
  createPublicBooking,
  deleteBookingFn,
  deleteListingFn,
  deleteProductFn,
  deleteRecipeFn,
  deleteReportFn,
  deleteTechFn,
  getAdminSession,
  getAdminSnapshot,
  getPublicSnapshot,
  importOpsFn,
  reseedCatalogueFn,
  saveBookingFn,
  saveListingFn,
  saveProductFn,
  saveRecipeFn,
  saveReportFn,
  saveSettingsFn,
  saveTechFn,
  setPackagePriceFn,
  touchPricesFn,
} from "./api";
import { catalog, recomputeProduct, bindLiveProducts } from "./catalog";
import { bindLiveRecipes, type PrebuiltRecipe } from "./prebuilts";
import { ALL_PACKAGES, CONTACT, bindLivePrices } from "./services";
import { bindLiveUsed, type InspectionReport, type UsedListing } from "./used";
import type {
  ActivityItem,
  Booking,
  BookingStatus,
  CategorySlug,
  Offer,
  OpsSettings,
  Product,
  ServiceKind,
  Stock,
  Technician,
} from "./types";
import { SEED_TEAM, seedListings } from "./ops-seed";

export const STATUSES: BookingStatus[] = [
  "new",
  "confirmed",
  "scheduled",
  "in_progress",
  "done",
  "cancelled",
];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export type OpsSnapshot = {
  bookings: Booking[];
  products: Product[];
  listings: UsedListing[];
  reports: InspectionReport[];
  recipes: PrebuiltRecipe[];
  packagePrices: Record<string, number>;
  team: Technician[];
  settings: OpsSettings;
  activity: ActivityItem[];
};

const defaultPrices = (): Record<string, number> =>
  Object.fromEntries(ALL_PACKAGES.map((p) => [p.id, p.price]));

const defaultSettings = (): OpsSettings => ({
  email: CONTACT.email,
  phone: "",
  hours: CONTACT.hours,
  whatsapp: "",
  instagram: CONTACT.instagram,
  tiktok: CONTACT.tiktok,
  facebook: CONTACT.facebook,
});

function seedSnapshot(): OpsSnapshot {
  return {
    bookings: [],
    products: catalog.products.map((p) => structuredClone(p)),
    listings: seedListings(),
    reports: [],
    recipes: [],
    packagePrices: defaultPrices(),
    team: SEED_TEAM.map((t) => ({ ...t, skills: [...t.skills] })),
    settings: defaultSettings(),
    activity: [],
  };
}

function normalizeBooking(b: Booking): Booking {
  return {
    ...b,
    status: b.status ?? "new",
  };
}

function errMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Could not save. Try again.";
}

export type OpsState = OpsSnapshot & {
  hydrated: boolean;
  unlocked: boolean;
  adminEmail: string | null;
  hydrate: () => Promise<void>;
  persist: () => void;
  log: (text: string) => void;
  lock: () => Promise<void>;
  ingestBooking: (b: Booking) => void;
  upsertBooking: (b: Booking) => void;
  patchBooking: (id: string, patch: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  upsertProduct: (p: Product) => void;
  patchProduct: (id: string, patch: Partial<Product>) => void;
  setOffers: (id: string, offers: Offer[]) => void;
  deleteProduct: (id: string) => void;
  touchPrices: () => void;
  upsertListing: (l: UsedListing) => void;
  deleteListing: (id: string) => void;
  upsertReport: (r: InspectionReport) => void;
  deleteReport: (id: string) => void;
  upsertRecipe: (r: PrebuiltRecipe) => void;
  deleteRecipe: (id: string) => void;
  setPackagePrice: (id: string, price: number) => void;
  upsertTech: (t: Technician) => void;
  deleteTech: (id: string) => void;
  patchSettings: (patch: Partial<OpsSettings>) => void;
  resetDemo: () => void;
  exportJson: () => string;
  importJson: (raw: string) => boolean;
};

const productSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let hydrateGen = 0;

export const useOps = create<OpsState>((set, get) => {
  const apply = (patch: Partial<OpsSnapshot>, activity?: string) => {
    set((s) => {
      const next = { ...s, ...patch };
      if (activity) {
        next.activity = [{ id: `act-${Date.now()}`, at: new Date().toISOString(), text: activity }, ...s.activity].slice(
          0,
          60,
        );
      }
      return next;
    });
  };

  const refreshAdmin = async () => {
    const snap = await getAdminSnapshot();
    set({ ...snap, hydrated: true, unlocked: true });
  };

  return {
    ...seedSnapshot(),
    hydrated: false,
    unlocked: false,
    adminEmail: null,
    hydrate: () => {
      if (typeof window === "undefined") return Promise.resolve();
      const gen = ++hydrateGen;
      return (async () => {
        try {
          const [pub, session] = await Promise.all([getPublicSnapshot(), getAdminSession()]);
          if (gen !== hydrateGen) return;
          if (session.ok) {
            const admin = await getAdminSnapshot();
            if (gen !== hydrateGen) return;
            set({ ...admin, hydrated: true, unlocked: true, adminEmail: session.email });
            return;
          }
          set({
            ...seedSnapshot(),
            products: pub.products.length ? pub.products : seedSnapshot().products,
            listings: pub.listings.length ? pub.listings : seedSnapshot().listings,
            reports: pub.reports,
            recipes: pub.recipes.length ? pub.recipes : seedSnapshot().recipes,
            packagePrices: { ...defaultPrices(), ...pub.packagePrices },
            settings: pub.settings,
            team: pub.team.length ? pub.team : seedSnapshot().team,
            bookings: [],
            activity: [],
            hydrated: true,
            unlocked: false,
            adminEmail: null,
          });
        } catch {
          if (gen !== hydrateGen) return;
          set({ hydrated: true, unlocked: false });
        }
      })();
    },
    persist: () => undefined,
    log: (text) => apply({}, text),
    lock: async () => {
      hydrateGen += 1;
      set({ unlocked: false, adminEmail: null, bookings: [], activity: [] });
      try {
        await adminLogout();
      } catch {
        /* still locked locally */
      }
    },
    ingestBooking: (b) => {
      const n = normalizeBooking(b);
      if (get().bookings.some((x) => x.id === n.id)) return;
      apply({ bookings: [n, ...get().bookings] }, `New ${n.kind} request — ${n.name}, ${n.city}`);
    },
    upsertBooking: (b) => {
      const n = normalizeBooking(b);
      const list = get().bookings;
      const i = list.findIndex((x) => x.id === n.id);
      const bookings = i >= 0 ? list.map((x, idx) => (idx === i ? n : x)) : [n, ...list];
      apply({ bookings }, i >= 0 ? `Booking updated — ${n.name}` : `Booking created — ${n.name}`);
      void saveBookingFn({ data: n })
        .then((saved) => {
          apply({ bookings: get().bookings.map((x) => (x.id === n.id || x.id === saved.id ? saved : x)) });
        })
        .catch((err) => toast.error(errMessage(err)));
    },
    patchBooking: (id, patch) => {
      const bookings = get().bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
      const row = bookings.find((b) => b.id === id);
      apply({ bookings }, row ? `${row.name} → ${STATUS_LABEL[row.status ?? "new"]}` : undefined);
      if (row) {
        void saveBookingFn({ data: row }).catch((err) => toast.error(errMessage(err)));
      }
    },
    deleteBooking: (id) => {
      const row = get().bookings.find((b) => b.id === id);
      apply(
        { bookings: get().bookings.filter((b) => b.id !== id) },
        row ? `Deleted booking — ${row.name}` : "Deleted booking",
      );
      void deleteBookingFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    upsertProduct: (p) => {
      const next = recomputeProduct(p);
      const list = get().products;
      const i = list.findIndex((x) => x.id === next.id);
      const products = i >= 0 ? list.map((x, idx) => (idx === i ? next : x)) : [next, ...list];
      apply({ products }, `Catalogue — ${next.name}`);
      void saveProductFn({ data: next }).catch((err) => toast.error(errMessage(err)));
    },
    patchProduct: (id, patch) => {
      const products = get().products.map((p) => (p.id === id ? recomputeProduct({ ...p, ...patch }) : p));
      apply({ products });
      const timer = productSaveTimers.get(id);
      if (timer) clearTimeout(timer);
      productSaveTimers.set(
        id,
        setTimeout(() => {
          const row = get().products.find((p) => p.id === id);
          if (row) void saveProductFn({ data: row }).catch((err) => toast.error(errMessage(err)));
        }, 450),
      );
    },
    setOffers: (id, offers) => {
      const products = get().products.map((p) => (p.id === id ? recomputeProduct({ ...p, offers }) : p));
      apply({ products }, "Offers updated");
      const row = products.find((p) => p.id === id);
      if (row) void saveProductFn({ data: row }).catch((err) => toast.error(errMessage(err)));
    },
    deleteProduct: (id) => {
      const row = get().products.find((p) => p.id === id);
      apply({ products: get().products.filter((p) => p.id !== id) }, row ? `Removed SKU — ${row.name}` : "Removed SKU");
      void deleteProductFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    touchPrices: () => {
      const products = get().products.map((p) =>
        recomputeProduct({
          ...p,
          offers: p.offers.map((o) => ({ ...o, checked_minutes_ago: 0 })),
        }),
      );
      apply({ products }, "All listed prices marked as just checked");
      void touchPricesFn().catch((err) => toast.error(errMessage(err)));
    },
    upsertListing: (l) => {
      const list = get().listings;
      const i = list.findIndex((x) => x.id === l.id);
      const listings = i >= 0 ? list.map((x, idx) => (idx === i ? l : x)) : [l, ...list];
      apply({ listings }, `Listing — ${l.title}`);
      void saveListingFn({ data: l }).catch((err) => toast.error(errMessage(err)));
    },
    deleteListing: (id) => {
      apply({ listings: get().listings.filter((l) => l.id !== id) }, "Listing removed");
      void deleteListingFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    upsertReport: (r) => {
      const list = get().reports;
      const i = list.findIndex((x) => x.id === r.id);
      const reports = i >= 0 ? list.map((x, idx) => (idx === i ? r : x)) : [r, ...list];
      apply({ reports }, `Report ${r.published ? "published" : "saved"} — ${r.title}`);
      void saveReportFn({ data: r }).catch((err) => toast.error(errMessage(err)));
    },
    deleteReport: (id) => {
      apply({ reports: get().reports.filter((r) => r.id !== id) }, "Report removed");
      void deleteReportFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    upsertRecipe: (r) => {
      const list = get().recipes;
      const i = list.findIndex((x) => x.id === r.id);
      const recipes = i >= 0 ? list.map((x, idx) => (idx === i ? r : x)) : [r, ...list];
      apply({ recipes }, `Prebuilt — ${r.title}`);
      void saveRecipeFn({ data: r }).catch((err) => toast.error(errMessage(err)));
    },
    deleteRecipe: (id) => {
      apply({ recipes: get().recipes.filter((r) => r.id !== id) }, "Prebuilt removed");
      void deleteRecipeFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    setPackagePrice: (id, price) => {
      apply({ packagePrices: { ...get().packagePrices, [id]: price } }, "Service price updated");
      void setPackagePriceFn({ data: { id, price } }).catch((err) => toast.error(errMessage(err)));
    },
    upsertTech: (t) => {
      const list = get().team;
      const i = list.findIndex((x) => x.id === t.id);
      const team = i >= 0 ? list.map((x, idx) => (idx === i ? t : x)) : [t, ...list];
      apply({ team }, `Technician — ${t.name}`);
      void saveTechFn({ data: t }).catch((err) => toast.error(errMessage(err)));
    },
    deleteTech: (id) => {
      apply({ team: get().team.filter((t) => t.id !== id) }, "Technician removed");
      void deleteTechFn({ data: { id } }).catch((err) => toast.error(errMessage(err)));
    },
    patchSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      apply({ settings }, "Settings saved");
      void saveSettingsFn({ data: settings }).catch((err) => toast.error(errMessage(err)));
    },
    resetDemo: () => {
      void reseedCatalogueFn()
        .then(() => refreshAdmin())
        .then(() => toast.success("Catalogue reloaded from bundled data"))
        .catch((err) => toast.error(errMessage(err)));
    },
    exportJson: () => {
      const s = get();
      const data: OpsSnapshot = {
        bookings: s.bookings,
        products: s.products,
        listings: s.listings,
        reports: s.reports,
        recipes: s.recipes,
        packagePrices: s.packagePrices,
        team: s.team,
        settings: s.settings,
        activity: s.activity,
      };
      return JSON.stringify(data, null, 2);
    },
    importJson: (raw) => {
      try {
        JSON.parse(raw);
      } catch {
        return false;
      }
      void importOpsFn({ data: { json: raw } })
        .then(() => refreshAdmin())
        .then(() => toast.success("Imported"))
        .catch((err) => toast.error(errMessage(err)));
      return true;
    },
  };
});

bindLiveProducts(() => (useOps.getState().hydrated ? useOps.getState().products : undefined));
bindLiveRecipes(() => (useOps.getState().hydrated ? useOps.getState().recipes : undefined));
bindLiveUsed(
  () => (useOps.getState().hydrated ? useOps.getState().listings : undefined),
  () => (useOps.getState().hydrated ? useOps.getState().reports : undefined),
);
bindLivePrices(() => (useOps.getState().hydrated ? useOps.getState().packagePrices : undefined));

export async function ingestPublicBooking(b: Omit<Booking, "id" | "createdAt">): Promise<Booking> {
  const saved = await createPublicBooking({ data: b });
  useOps.getState().ingestBooking(saved);
  return saved;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function emptyProduct(category: CategorySlug): Product {
  return {
    id: `sku-${Date.now()}`,
    category,
    name: "",
    brand: "",
    image: `/parts/${category === "storage" ? "ssd" : category}.svg`,
    images: [],
    description: "",
    msrp: 0,
    best_price: 0,
    used_price: 0,
    in_stock: true,
    store_count: 1,
    power_draw: 0,
    specs: {},
    offers: [
      {
        store: catalog.stores[0]?.name ?? "Shop",
        city: catalog.stores[0]?.city ?? "Casablanca",
        price: 0,
        stock: "in_stock" as Stock,
        checked_minutes_ago: 0,
        url: "https://",
      },
    ],
    history: [],
  };
}

export function emptyListing(): UsedListing {
  return {
    id: `used-${Date.now()}`,
    title: "",
    city: "Casablanca",
    asking: 0,
    fairValue: 0,
    condition: "Used",
    cpu: "",
    gpu: "",
    ram: "",
    storage: "",
    inspected: false,
    risk: "medium",
    notes: "",
    images: [],
  };
}

export function emptyReport(): InspectionReport {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `rep-${Date.now()}`,
    publicId: `rep-${Date.now()}`,
    title: "",
    date: today,
    city: "Casablanca",
    technician: "",
    verdict: "NEGOTIATE",
    risk: "medium",
    asking: 0,
    fairValue: 0,
    suggestOffer: 0,
    hardware: [
      ["CPU", "", ""],
      ["GPU", "", ""],
      ["RAM", "", ""],
      ["Storage", "", ""],
      ["Motherboard", "", ""],
      ["PSU", "", ""],
    ],
    temps: { cpuIdle: 0, cpuLoad: 0, gpuIdle: 0, gpuLoad: 0 },
    issues: [""],
    photos: [],
    published: false,
  };
}

export function emptyOffer(): Offer {
  return {
    store: catalog.stores[0]?.name ?? "Shop",
    city: catalog.stores[0]?.city ?? "Casablanca",
    price: 0,
    stock: "in_stock",
    checked_minutes_ago: 0,
    url: "https://",
  };
}

export const OPEN_STATUSES: BookingStatus[] = ["new", "confirmed", "scheduled", "in_progress"];

export function bookingRevenue(rows: Booking[]) {
  return rows
    .filter((b) => b.status === "done")
    .reduce((a, b) => a + (b.paidAmount || b.quotedPrice || 0), 0);
}

export const KIND_LABEL: Record<ServiceKind, string> = {
  inspection: "Inspection",
  assembly: "Assembly",
  cleaning: "Cleaning",
};
