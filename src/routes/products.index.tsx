import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_ORDER,
  categoryLabel,
  allProducts,
  includeManifestComponents,
  useProductsWithPhotos,
} from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import type { CategorySlug } from "@/lib/types";

type Search = { category?: CategorySlug; q?: string };

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof s.category === "string") next.category = s.category as CategorySlug;
    if (typeof s.q === "string") next.q = s.q;
    return next;
  },
  component: ProductsPage,
});

export function ProductsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { category, q } = Route.useSearch();
  const liveProducts = useOps((s) => (s.hydrated ? s.products : undefined));
  const sourceProducts = useMemo(
    () => (liveProducts ? includeManifestComponents(liveProducts) : allProducts()),
    [liveProducts],
  );
  const { products, loading: photosLoading, error: photosError } = useProductsWithPhotos(sourceProducts);
  const [budget, setBudget] = useState(8000);
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("price-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Number(Boolean(category)) + Number(Boolean(brand)) + Number(budget < 8000) + Number(Boolean(q));

  function clearCategory() {
    void navigate({ to: "/products", search: q ? { q } : {} });
  }

  function clearAllFilters() {
    setBrand("");
    setBudget(8000);
    setFiltersOpen(false);
    void navigate({ to: "/products", search: {} });
  }

  function closeMobileFilters() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setFiltersOpen(false);
    }
  }

  const brands = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => !category || p.category === category)
        .map((p) => p.brand),
    );
    return [...set].sort();
  }, [category, products]);

  const rows = useMemo(() => {
    let list = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (p.best_price > budget) return false;
      if (brand && p.brand !== brand) return false;
      if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (a.offers.length === 0 && b.offers.length > 0) return 1;
      if (a.offers.length > 0 && b.offers.length === 0) return -1;
      if (sort === "price-desc") return b.best_price - a.best_price;
      if (sort === "stores") return b.store_count - a.store_count;
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.best_price - b.best_price;
    });
    return list;
  }, [category, budget, brand, sort, q, products]);

  const sidebar = (
    <aside className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{t("ui.category")}</h3>
      <div className="mb-5 flex flex-col gap-1">
        <Link
          to="/products"
          search={{}}
          onClick={closeMobileFilters}
          className={`rounded-md px-2 py-2 text-sm ${!category ? "bg-surface-2 text-primary" : "text-fg hover:bg-surface-2"}`}
        >
          {t("ui.allCats")}
        </Link>
        {CATEGORY_ORDER.map((slug) => (
          <Link
            key={slug}
            to="/products"
            search={{ category: slug }}
            onClick={closeMobileFilters}
            className={`rounded-md px-2 py-2 text-sm ${category === slug ? "bg-surface-2 text-primary" : "hover:bg-surface-2"}`}
          >
            {categoryLabel(slug)}
          </Link>
        ))}
      </div>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{t("ui.budget")}</h3>
      <p className="mb-1 font-display text-sm font-semibold tabular-nums text-primary ltr-isolate">{budget.toLocaleString("fr-MA")} DH</p>
      <input
        type="range"
        min={300}
        max={8000}
        step={50}
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        onPointerUp={closeMobileFilters}
        onKeyUp={closeMobileFilters}
        className="mb-5 w-full accent-[var(--primary)]"
      />
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{t("ui.brand")}</h3>
      <select
        className="h-11 w-full rounded-md bg-bg px-2 text-sm shadow-[var(--shadow-border)]"
        value={brand}
        onChange={(e) => {
          setBrand(e.target.value);
          closeMobileFilters();
        }}
      >
        <option value="">{t("ui.allCats")}</option>
        {brands.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>
    </aside>
  );

  return (
    <main>
      <PageHero
        eyebrow={t("nav.components")}
        title={category ? categoryLabel(category) : t("nav.components")}
        description={t("cat.desc")}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <div className="lg:hidden">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="mobile-component-filters"
          >
            {t("ui.filters")}{activeFilters > 0 ? ` · ${activeFilters}` : ""}
          </Button>
          {filtersOpen && <div id="mobile-component-filters" className="mt-3">{sidebar}</div>}
        </div>
        <div className="hidden lg:block">{sidebar}</div>
        <section>
            {activeFilters > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2" aria-label={t("ui.activeFilters")}>
                {category && (
                  <button type="button" className="filter-chip" onClick={clearCategory}>
                    {categoryLabel(category)} <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t("ui.removeFilter")}</span>
                  </button>
                )}
                {brand && (
                  <button type="button" className="filter-chip" onClick={() => setBrand("")}>
                    {brand} <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t("ui.removeFilter")}</span>
                  </button>
                )}
                {budget < 8000 && (
                  <button type="button" className="filter-chip" onClick={() => setBudget(8000)}>
                    {t("ui.maxPrice")}: {budget.toLocaleString("fr-MA")} DH
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t("ui.removeFilter")}</span>
                  </button>
                )}
                {q && (
                  <button type="button" className="filter-chip" onClick={() => void navigate({ to: "/products", search: {} })}>
                    {t("ui.search")}: {q}
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t("ui.removeFilter")}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="min-h-9 rounded-full px-2 text-xs font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
                  onClick={clearAllFilters}
                >
                  {t("ui.clearFilters")}
                </button>
              </div>
            )}
            <div className="mb-3 flex items-center justify-between gap-3">
            <strong className="text-sm">
              {rows.length} {t("ui.results")}
            </strong>
            <select
              className="h-11 rounded-md bg-surface px-2 text-sm shadow-[var(--shadow-border)]"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="price-asc">{t("ui.sort.priceAsc")}</option>
              <option value="price-desc">{t("ui.sort.priceDesc")}</option>
              <option value="stores">{t("ui.sort.stores")}</option>
              <option value="name">{t("ui.sort.name")}</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 2xl:grid-cols-3">
            {photosLoading ? (
              <p className="col-span-full rounded-xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-border)]" role="status">
                Loading component photos…
              </p>
            ) : photosError ? (
              <p className="col-span-full rounded-xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-border)]" role="alert">
                Component photos could not be loaded. Please try again.
              </p>
            ) : rows.length === 0 ? (
              <p className="col-span-full rounded-xl bg-surface p-10 text-center text-sm text-muted shadow-[var(--shadow-border)]">
                {t("ui.noResults")}
              </p>
            ) : (
              rows.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
