import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHero } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/product-image";
import {
  allProducts,
  catalog,
  CATEGORY_ORDER,
  categoryLabel,
  lowestOffer,
  useProductsWithPhotos,
} from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import type { CategorySlug } from "@/lib/types";
import { dh } from "@/lib/utils";

type Search = { category?: CategorySlug };

export const Route = createFileRoute("/compare")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s.category === "string" ? { category: s.category as CategorySlug } : {},
  component: ComparePage,
});

function ComparePage() {
  const { t } = useI18n();
  const { category = "gpu" } = Route.useSearch();
  const liveProducts = useOps((s) => (s.hydrated ? s.products : undefined));
  const sourceProducts = liveProducts ?? allProducts();
  const { products, loading: photosLoading, error: photosError } = useProductsWithPhotos(sourceProducts);
  const rows = useMemo(() => {
    const list = products.filter((product) => product.category === category);
    return [...list].sort((a, b) => a.best_price - b.best_price);
  }, [category, products]);

  return (
    <main>
      <PageHero
        eyebrow={t("nav.compare")}
        title={t("ui.lowest")}
        description={t("cat.desc")}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((slug) => (
            <Link
              key={slug}
              to="/compare"
              search={{ category: slug }}
              className={`rounded-full px-3 py-2 text-sm ${
                slug === category ? "bg-primary text-primary-fg" : "bg-surface shadow-[var(--shadow-border)]"
              }`}
            >
              {categoryLabel(slug)}
            </Link>
          ))}
        </div>
        {rows.length === 0 && (
          <p
            className="mb-4 rounded-xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-border)]"
            role={photosError ? "alert" : "status"}
          >
            {photosLoading
              ? "Loading component photos…"
              : photosError
                ? "Component photos could not be loaded. Please try again."
                : t("ui.noResults")}
          </p>
        )}
        <div className="space-y-3 sm:hidden">
          {rows.map((p) => {
            const offer = lowestOffer(p);
            return (
              <Card key={p.id} className="flex items-center gap-3 rounded-xl p-3">
                <ProductImage
                  product={p}
                  className="part-art size-16 shrink-0 rounded-lg bg-surface-2 object-contain p-2"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/products/$id"
                    params={{ id: p.id }}
                    className="line-clamp-2 text-sm font-semibold hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 truncate text-xs text-muted">{offer ? `${offer.store} · ${offer.city}` : "—"}</p>
                  <p className="product-price mt-1 font-display font-bold tabular-nums ltr-isolate">
                    {offer ? dh(p.best_price) : t("ui.priceUnavailable")}
                  </p>
                </div>
                {offer && <Badge tone="primary">{t("ui.lowest")}</Badge>}
              </Card>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)] sm:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-start text-xs tracking-wider text-muted uppercase">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-start">Product</th>
                <th className="px-4 py-3 text-start">Store</th>
                <th className="px-4 py-3 text-start">City</th>
                <th className="px-4 py-3 text-end">{t("ui.lowest")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const o = lowestOffer(p);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          product={p}
                          className="part-art size-12 shrink-0 rounded-lg bg-surface-2 object-contain p-1"
                        />
                        <Link to="/products/$id" params={{ id: p.id }} className="font-medium hover:text-primary">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">{o?.store ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{o?.city ?? "—"}</td>
                    <td className="px-4 py-3 text-end">
                      <span className="product-price font-display font-bold tabular-nums ltr-isolate">
                        {o ? dh(p.best_price) : t("ui.priceUnavailable")}
                      </span>
                      {o && (
                        <Badge tone="primary" className="ms-2">
                          {t("ui.lowest")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link to="/products/$id" params={{ id: p.id }} className="text-primary">
                        {t("ui.viewOffer")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t("data.banner")} {catalog.stores.length} {t("ui.stores")}.
        </p>
      </div>
    </main>
  );
}
