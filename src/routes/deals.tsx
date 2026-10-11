import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { allProducts, useProductsWithPhotos } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import { dh } from "@/lib/utils";

export const Route = createFileRoute("/deals")({ component: DealsPage });

function DealsPage() {
  const { t } = useI18n();
  const hydrated = useOps((s) => s.hydrated);
  const storedProducts = useOps((s) => s.products);
  const sourceProducts = hydrated ? storedProducts : allProducts();
  const { products, loading: photosLoading, error: photosError } = useProductsWithPhotos(sourceProducts);
  const deals = [...products]
    .map((p) => ({ ...p, save: p.msrp - p.best_price }))
    .filter((p) => p.save > 0)
    .sort((a, b) => b.save - a.save);

  return (
    <main>
      <PageHero eyebrow={t("nav.deals")} title={t("nav.deals")} description={t("data.banner")} />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {photosLoading || photosError ? (
          <p className="col-span-full rounded-xl bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-border)]" role={photosError ? "alert" : "status"}>
            {photosLoading ? "Loading component photos…" : "Component photos could not be loaded. Please try again."}
          </p>
        ) : null}
        {deals.map((p) => (
          <Link key={p.id} to="/products/$id" params={{ id: p.id }}>
            <Card className="h-full rounded-2xl p-4 transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]">
              <div className="flex items-start justify-between">
                <ProductImage product={p} className="part-art h-16 object-contain" />
                <Badge tone="ok">-{dh(p.save)}</Badge>
              </div>
              <h3 className="mt-3 font-medium">{p.name}</h3>
              <p className="text-xs text-muted line-through ltr-isolate">{dh(p.msrp)}</p>
              <p className="product-price font-display text-xl font-bold tabular-nums ltr-isolate">{dh(p.best_price)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
