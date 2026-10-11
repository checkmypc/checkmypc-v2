import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import { useI18n } from "@/lib/i18n";
import { useBuild } from "@/lib/store";
import type { Product } from "@/lib/types";
import { dh } from "@/lib/utils";
import { categoryLabel, lowestOffer } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const add = useBuild((s) => s.add);
  const slots = useBuild((s) => s.slots);
  const inBuild = slots[product.category]?.id === product.id;
  const offer = lowestOffer(product);
  const hasOffers = product.offers.length > 0;
  const specs = Object.entries(product.specs).slice(0, 3);

  return (
    <article className="lift group flex min-w-0 flex-col rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="product-card-image-frame relative block overflow-hidden rounded-xl border border-border bg-bg"
        aria-label={`${product.name} details`}
      >
        <span className="absolute start-3 top-3 z-10 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-muted shadow-[var(--shadow-border)] backdrop-blur">
          {categoryLabel(product.category)}
        </span>
        <ProductImage
          product={product}
          className={`product-card-image product-card-image--${product.category} size-full object-contain p-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035] sm:p-5`}
        />
      </Link>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <p className="text-xs font-medium tracking-wide text-muted">{product.brand}</p>
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="mt-1 line-clamp-2 min-h-10 font-display text-base font-semibold leading-5 transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        {specs.length > 0 ? (
          <ul className="mt-3 flex min-h-12 flex-wrap content-start gap-1.5">
            {specs.map(([name, value]) => (
              <li
                key={name}
                className="rounded-md bg-surface-2 px-2 py-1 text-[11px] leading-4 text-muted"
              >
                <span className="font-medium text-fg">{name}</span> {value}
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-12" />
        )}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tabular-nums ltr-isolate">
              {hasOffers ? dh(product.best_price) : t("ui.priceUnavailable")}
            </p>
            {hasOffers && (
              <p className="mt-0.5 truncate text-xs text-muted">
                {product.store_count} {t("ui.stores")}{offer ? ` · ${offer.city}` : ""}
              </p>
            )}
          </div>
          {hasOffers && <Badge tone="primary">{t("ui.lowest")}</Badge>}
        </div>
        <Button
          size="sm"
          variant={inBuild ? "soft" : "default"}
          className="mt-3 w-full"
          onClick={() => add(product.id, product.category)}
        >
          {inBuild ? t("ui.inBuild") : t("ui.addBuild")}
        </Button>
      </div>
    </article>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const { t } = useI18n();
  const add = useBuild((s) => s.add);
  const slots = useBuild((s) => s.slots);
  const inBuild = slots[product.category]?.id === product.id;
  const offer = lowestOffer(product);
  const hasOffers = product.offers.length > 0;
  const spec = Object.entries(product.specs)
    .slice(0, 3)
    .map(([, v]) => v)
    .join(" · ");

  return (
    <article className="grid grid-cols-[56px_1fr] items-center gap-3 border-b border-border px-3 py-3 transition-colors duration-200 last:border-0 hover:bg-surface-2/50 sm:grid-cols-[56px_1fr_auto_auto] sm:gap-5">
      <Link to="/products/$id" params={{ id: product.id }} className="grid size-14 place-items-center rounded-xl bg-surface-2">
        <ProductImage product={product} className="part-art size-9 object-contain" />
      </Link>
      <div className="min-w-0">
        <Link to="/products/$id" params={{ id: product.id }} className="block truncate font-medium transition-colors duration-200 hover:text-primary">
          {product.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted ltr-isolate">
          {product.brand} · {spec}
        </p>
        <p className="mt-1 text-xs text-ok sm:hidden">
          {hasOffers ? `${dh(product.best_price)} · ${product.store_count} ${t("ui.stores")}` : t("ui.priceUnavailable")}
        </p>
      </div>
      <div className="hidden text-end sm:block">
        <div className="font-display text-base font-semibold tabular-nums ltr-isolate">
          {hasOffers ? dh(product.best_price) : t("ui.priceUnavailable")}
        </div>
        <div className="text-xs text-muted">
          {hasOffers ? `${product.store_count} ${t("ui.stores")}${offer ? ` · ${offer.city}` : ""}` : product.brand}
        </div>
        {hasOffers && (
          <Badge tone="primary" className="mt-1">
            {t("ui.lowest")}
          </Badge>
        )}
      </div>
      <div className="col-span-2 flex gap-2 sm:col-span-1 sm:flex-col">
        <Button
          size="sm"
          variant={inBuild ? "soft" : "default"}
          onClick={() => add(product.id, product.category)}
        >
          {inBuild ? t("ui.inBuild") : t("ui.addBuild")}
        </Button>
      </div>
    </article>
  );
}

export function ProductTile({ product }: { product: Product }) {
  const { t } = useI18n();
  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="lift group flex flex-col rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]"
    >
      <div className="mb-3 grid h-28 place-items-center overflow-hidden rounded-xl bg-surface-2">
        <ProductImage
          product={product}
          className="part-art h-20 object-contain transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </div>
      <h3 className="line-clamp-2 text-sm font-medium transition-colors duration-200 group-hover:text-primary">{product.name}</h3>
      <p className="mt-auto pt-2 font-display text-base font-semibold tabular-nums ltr-isolate">
        {product.offers.length > 0 ? dh(product.best_price) : t("ui.priceUnavailable")}
      </p>
    </Link>
  );
}