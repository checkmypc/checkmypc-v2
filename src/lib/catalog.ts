import raw from "@/data/catalog.json";
import { MANIFEST_COMPONENTS } from "@/data/manifest-components";
import { useEffect, useState } from "react";
import type { CatalogFile, CategorySlug, Product, ProductImageManifest } from "./types";

export const catalog = raw as unknown as CatalogFile;
const catalogIds = new Set(catalog.products.map((product) => product.id));
catalog.products.push(...MANIFEST_COMPONENTS.filter((product) => !catalogIds.has(product.id)));

export const CATEGORY_ORDER: CategorySlug[] = [
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
];

export const BUILDER_SLOTS: CategorySlug[] = [
  "cpu",
  "cooler",
  "motherboard",
  "ram",
  "storage",
  "gpu",
  "psu",
  "case",
];

let liveProductsFn: (() => Product[] | undefined) | undefined;
export function bindLiveProducts(fn: () => Product[] | undefined) {
  liveProductsFn = fn;
}

export function includeManifestComponents(products: Product[]): Product[] {
  const productIds = new Set(products.map((product) => product.id));
  return [...products, ...MANIFEST_COMPONENTS.filter((product) => !productIds.has(product.id))];
}

export function allProducts(): Product[] {
  const live = liveProductsFn?.();
  return includeManifestComponents(live && live.length ? live : catalog.products);
}

export function productById(id: string): Product | undefined {
  return allProducts().find((p) => p.id === id);
}

export function productsByCategory(slug: CategorySlug): Product[] {
  return allProducts().filter((p) => p.category === slug);
}

export function categoryLabel(slug: string): string {
  return catalog.categories.find((c) => c.slug === slug)?.label ?? slug;
}

export function categoryImage(slug: string): string {
  const c = catalog.categories.find((x) => x.slug === slug);
  return c?.image || `/parts/${slug === "storage" ? "ssd" : slug}.svg`;
}

export function lowestOffer(p: Product) {
  const inStock = p.offers.filter((o) => o.stock !== "out_of_stock");
  const pool = inStock.length ? inStock : p.offers;
  return [...pool].sort((a, b) => a.price - b.price)[0];
}

export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return allProducts().filter((p) => {
    const blob = `${p.name} ${p.brand} ${p.category} ${Object.values(p.specs).join(" ")}`.toLowerCase();
    return blob.includes(s);
  });
}

export function recomputeProduct(p: Product): Product {
  const inStock = p.offers.filter((o) => o.stock !== "out_of_stock");
  const pool = inStock.length ? inStock : p.offers;
  const best = pool.length ? Math.min(...pool.map((o) => o.price)) : p.best_price;
  return {
    ...p,
    best_price: best,
    store_count: p.offers.length,
    in_stock: p.offers.some((o) => o.stock === "in_stock" || o.stock === "low_stock"),
  };
}

function productPhotoPath(path: string): string | undefined {
  const normalized = path.trim().replace(/^\/+/, "");
  if (/^api\/media\/media_[a-z0-9]+$/i.test(normalized)) {
    return `/${normalized}`;
  }
  if (
    !normalized.startsWith("parts/products/") ||
    !/\.(?:jpe?g|png|webp|gif|avif)$/i.test(normalized) ||
    normalized.split("/").some((part) => part === "." || part === "..")
  ) {
    return undefined;
  }
  return `/${normalized}`;
}

export function hasProductPhoto(product: Product, imageManifest?: ProductImageManifest): boolean {
  const manifestPhotos = new Set(
    (imageManifest?.manifest[product.id] ?? [])
      .map(productPhotoPath)
      .filter((path): path is string => Boolean(path)),
  );
  const savedMedia = productGallery(product, imageManifest).some((path) => path.startsWith("/api/media/"));
  return manifestPhotos.size > 0 || savedMedia;
}

export function productGallery(p: Product, imageManifest?: ProductImageManifest): string[] {
  const manifestImages = imageManifest?.manifest[p.id] ?? [];
  const listedImages = [p.image, ...(p.images ?? []), ...manifestImages];
  return [...new Set(listedImages.map(productPhotoPath).filter((path): path is string => Boolean(path)))];
}

export function useProductsWithPhotos(products: Product[]) {
  const [manifest, setManifest] = useState<ProductImageManifest>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    void loadProductImageManifest()
      .then((loadedManifest) => {
        if (!active) return;
        setManifest(loadedManifest);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const loadError =
          reason instanceof Error ? reason : new Error("Unable to load product image manifest");
        console.error("Unable to load product image manifest", loadError);
        setError(loadError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    products: loading || error ? [] : products.filter((product) => hasProductPhoto(product, manifest)),
    loading,
    error,
  };
}

let productImageManifestRequest: Promise<ProductImageManifest> | undefined;

export function loadProductImageManifest(): Promise<ProductImageManifest> {
  if (!productImageManifestRequest) {
    productImageManifestRequest = fetch("/parts/products/manifest.json")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load product image manifest (${response.status})`);
        }
        const value: unknown = await response.json();
        if (
          typeof value !== "object" ||
          value === null ||
          !("manifest" in value) ||
          typeof value.manifest !== "object" ||
          value.manifest === null
        ) {
          throw new Error("Product image manifest has an invalid format");
        }
        for (const images of Object.values(value.manifest)) {
          if (!Array.isArray(images) || !images.every((image) => typeof image === "string")) {
            throw new Error("Product image manifest contains an invalid image list");
          }
        }
        return value as ProductImageManifest;
      })
      .catch((error: unknown) => {
        productImageManifestRequest = undefined;
        throw error;
      });
  }
  return productImageManifestRequest;
}

export const DATA_GENERATED = catalog.generated;
export const DATA_NOTE =
  catalog.dataNote ??
  "Sample Moroccan store prices for demonstration. Not a live feed.";
