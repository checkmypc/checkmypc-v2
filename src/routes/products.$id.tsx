import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bell, BellOff } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { PageHero } from "@/components/page-hero";
import { ProductAvailability } from "@/components/product-availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { allProducts, categoryLabel, lowestOffer, productById, useProductsWithPhotos } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import { useBuild } from "@/lib/store";
import { ago, dh, freshness } from "@/lib/utils";
import type { CategorySlug, Product } from "@/lib/types";

const FRENCH_CATEGORIES: Partial<Record<CategorySlug, string>> = {
  cpu: "Processeurs",
  cooler: "Refroidissement CPU",
  motherboard: "Cartes mères",
  ram: "Mémoire vive",
  storage: "Stockage",
  gpu: "Cartes graphiques",
  psu: "Alimentations PC",
  case: "Boîtiers PC",
  display: "Écrans",
  peripheral: "Périphériques",
};

function relatedScore(source: Product, candidate: Product) {
  const sourceSpecs = new Map(Object.entries(source.specs).map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]));
  const sharedSpecs = Object.entries(candidate.specs).filter(
    ([key, value]) => sourceSpecs.get(key.toLowerCase()) === value.toLowerCase(),
  ).length;
  return sharedSpecs * 3 + Number(source.brand === candidate.brand);
}

export const Route = createFileRoute("/products/$id")({
  component: ProductPage,
});

function sparkPath(history: { d: string; p: number }[]) {
  if (history.length < 2) return "";
  const w = 560;
  const h = 160;
  const prices = history.map((x) => x.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  return history
    .map((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((pt.p - min) / span) * (h - 16) - 8;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function ProductPage() {
  const { id } = Route.useParams();
  useOps((s) => s.products);
  const { lang, t } = useI18n();
  const p = productById(id);
  const add = useBuild((s) => s.add);
  const slots = useBuild((s) => s.slots);
  const alerts = useBuild((s) => s.alerts);
  const toggleWatch = useBuild((s) => s.toggleWatch);
  if (!p) throw notFound();
  const offer = lowestOffer(p);
  const inBuild = slots[p.category]?.id === p.id;
  const watching = alerts.includes(p.id);
  const path = sparkPath(p.history);
  const sorted = [...p.offers].sort((a, b) => a.price - b.price);
  const { products: photoProducts } = useProductsWithPhotos(allProducts());
  const related = [
    ...new Map(
      photoProducts
        .filter((candidate) => candidate.category === p.category && candidate.id !== p.id)
        .map((product) => [product.id, product]),
    ).values(),
  ]
    .sort((a, b) => relatedScore(p, b) - relatedScore(p, a) || a.name.localeCompare(b.name))
    .slice(0, 4);
  const displayCategory =
    lang === "fr" ? FRENCH_CATEGORIES[p.category] ?? categoryLabel(p.category) : categoryLabel(p.category);

  return (
    <main>
      <nav
        aria-label={lang === "fr" ? "Fil d'Ariane" : t("product.breadcrumb")}
        className="mx-auto flex max-w-6xl items-center gap-2 overflow-hidden px-4 pt-5 text-xs text-muted sm:text-sm"
      >
        <Link to="/" className="shrink-0 hover:text-primary">
          {t("nav.home")}
        </Link>
        <span aria-hidden="true">›</span>
        <Link to="/products" search={{}} className="shrink-0 hover:text-primary">
          {t("nav.components")}
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          to="/products"
          search={{ category: p.category }}
          className="shrink-0 hover:text-primary"
        >
          {displayCategory}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="min-w-0 truncate font-medium text-fg" aria-current="page" title={p.name}>
          {p.name}
        </span>
      </nav>
      <PageHero
        eyebrow={p.brand}
        title={p.name}
        description={p.store_count > 0 ? `${p.store_count} ${t("ui.stores")} · ${t("ui.demo")}` : t("ui.priceUnavailable")}
      >
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-muted">{p.store_count > 0 ? t("ui.best") : t("ui.priceUnavailable")}</p>
            {p.store_count > 0 && (
              <p className="product-price font-display text-4xl font-bold tabular-nums ltr-isolate">{dh(p.best_price)}</p>
            )}
          </div>
          {p.store_count > 0 && (
            <div className="text-sm text-muted">
              {t("ui.msrp")} <span className="ltr-isolate">{dh(p.msrp)}</span>
              <br />
              {t("ui.usedPrice")} <span className="ltr-isolate">{dh(p.used_price)}</span>
            </div>
          )}
          <ProductAvailability product={p} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => add(p.id, p.category)}>{inBuild ? t("ui.inBuild") : t("ui.addBuild")}</Button>
          <Button variant="secondary" onClick={() => toggleWatch(p.id)}>
            {watching ? <BellOff className="size-4" /> : <Bell className="size-4" />}
            {watching ? t("ui.watching") : t("ui.watch")}
          </Button>
          <Button asChild variant="soft">
            <Link to="/compare" search={{ category: p.category }}>
              {t("nav.compare")}
            </Link>
          </Button>
        </div>
      </PageHero>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.15fr]">
        <Card className="rounded-2xl p-3 sm:p-5">
          <ProductGallery key={p.id} product={p} />
        </Card>
        <Card className="rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-semibold">{t("ui.offers")}</h2>
            {offer && <Badge tone="primary">{t("ui.lowest")}</Badge>}
          </div>
          <ul>
            {sorted.map((o, i) => {
              const fresh = freshness(o.checked_minutes_ago);
              const isLow = offer && o.store === offer.store && o.price === offer.price;
              return (
                <li
                  key={`${o.store}-${i}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-5 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-medium">{o.store}</p>
                    <p className="text-xs text-muted">
                      {o.city} · {ago(o.checked_minutes_ago, t)}
                    </p>
                    <Badge tone={fresh === "live" ? "ok" : fresh === "recent" ? "primary" : "warn"} className="mt-1">
                      {t(`ui.${fresh === "stale" ? "stale" : fresh === "live" ? "live" : "recent"}`)}
                    </Badge>
                  </div>
                  <div className="text-end">
                    <p className="font-display font-semibold tabular-nums ltr-isolate">{dh(o.price)}</p>
                    {isLow && <p className="text-[11px] font-semibold text-primary">{t("ui.lowest")}</p>}
                    <p className="text-[11px] text-muted">
                      {o.stock === "unknown"
                        ? t("ui.availability.unknown")
                        : t(`ui.stock.${o.stock.replace("in_stock", "in").replace("low_stock", "low").replace("out_of_stock", "out")}`)}
                    </p>
                  </div>
                  <a
                    className="col-span-2 inline-flex h-11 items-center justify-center rounded-md bg-surface-2 px-3 text-sm font-medium sm:col-span-1"
                    href={o.url.startsWith("http") ? o.url : undefined}
                    onClick={(e) => {
                      if (!o.url.startsWith("http")) e.preventDefault();
                    }}
                    aria-disabled={!o.url.startsWith("http")}
                  >
                    {t("ui.viewOffer")}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="px-5 py-3 text-xs text-muted">{t("data.banner")}</p>
        </Card>
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">{t("product.specSheet")}</h2>
          {Object.entries(p.specs).filter(([key, value]) => key.trim() && value.trim()).length > 0 ? (
            <dl className="divide-y divide-border text-sm">
              {Object.entries(p.specs)
                .filter(([key, value]) => key.trim() && value.trim())
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-2.5">
                    <dt className="break-words font-medium text-muted">{key}</dt>
                    <dd className="break-words text-end ltr-isolate">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">{t("ui.specsUnavailable")}</p>
          )}
        </Card>
        <Card className="rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">{t("product.description")}</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">
            {p.description?.trim() || t("product.descriptionEmpty")}
          </p>
        </Card>
        <Card className="rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">{t("ui.history")}</h2>
          <svg viewBox="0 0 560 160" className="w-full" role="img" aria-label="Price history">
            <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.4" />
          </svg>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{p.history[0]?.d}</span>
            <span>{p.history.at(-1)?.d}</span>
          </div>
        </Card>
      </div>
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12" aria-labelledby="related-products-title">
          <h2 id="related-products-title" className="mb-4 font-display text-2xl font-semibold">
            {t("product.related")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {related.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
