import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Search, Shield, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/product-image";
import { catalog, categoryImage, allProducts, useProductsWithPhotos } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import { prebuilts } from "@/lib/prebuilts";
import { ASSEMBLY, CLEANING, INSPECTION, STEPS, livePackages } from "@/lib/services";
import type { CategorySlug } from "@/lib/types";
import { dh } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const HOME_CATEGORIES: CategorySlug[] = [
  "case",
  "cpu",
  "storage",
  "gpu",
  "cooler",
  "ram",
  "motherboard",
  "psu",
  "display",
  "peripheral",
];

const FEATURED_SYSTEM_IMAGES: Record<string, string> = {
  "pb-1080": "/parts/systems/1080p-gaming-rig.jpg",
  "pb-1440": "/parts/systems/1440p-performance.jpg",
  "pb-creator": "/parts/systems/ryzen-creator-station.jpg",
};

function Home() {
  const { t } = useI18n();
  const hydrated = useOps((s) => s.hydrated);
  const storedProducts = useOps((s) => s.products);
  const sourceProducts = hydrated ? storedProducts : allProducts();
  const { products } = useProductsWithPhotos(sourceProducts);
  useOps((s) => s.recipes);
  useOps((s) => s.packagePrices);
  const featured = prebuilts().filter((p) => p.id in FEATURED_SYSTEM_IMAGES);
  const hot = [...products].sort((a, b) => b.msrp - b.best_price - (a.msrp - a.best_price)).slice(0, 4);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_58%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
          <div className="stagger-in">
            <p className="mb-4 inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-primary">
              {t("hero.eyebrow")}
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">{t("hero.title")}</h1>
            <p className="mt-2 font-display text-xl text-muted">{t("brand.darija")}</p>
            <p className="mt-5 max-w-xl text-base text-muted">{t("hero.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/builder">{t("hero.builder")}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/compare">{t("hero.compare")}</Link>
              </Button>
              <Button asChild variant="soft">
                <Link to="/inspection">{t("hero.inspect")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <Card className="rounded-3xl p-6">
              <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("hero.badge")}</p>
              <div className="grid grid-cols-3 gap-2">
                {STEPS.map((s) => (
                  <div key={s.id} className="rounded-xl bg-surface-2 px-3 py-3">
                    <div className="font-display text-sm font-semibold text-primary">{s.label}</div>
                    <div className="mt-1 text-xs text-muted">{s.hint}</div>
                  </div>
                ))}
              </div>
              <img src="/brand/hero-pc.svg" alt="" className="part-art mt-4 h-36 w-full object-contain" />
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("cat.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("cat.desc")}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/products">
              {t("cat.all")} <ArrowRight className="size-4 rtl-flip" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HOME_CATEGORIES.map((slug) => {
            const c = catalog.categories.find((x) => x.slug === slug);
            const n = products.filter((p) => p.category === slug).length;
            const fallback = categoryImage(slug);
            const image = `/parts/studio/${slug}-front.jpg`;
            return (
              <Link
                key={slug}
                to="/products"
                search={{ category: slug }}
                className="lift group overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                  <img
                    src={image}
                    alt={c?.label ?? slug}
                    loading="lazy"
                    onError={(event) => {
                      if (event.currentTarget.getAttribute("src") !== fallback) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                    className="part-art size-full object-contain transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="text-sm font-semibold">{c?.label ?? slug}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {n} {t("ui.results")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-surface-2/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("svc.title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("svc.desc")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                to: "/inspection" as const,
                icon: Shield,
                title: t("svc.inspect"),
                desc: t("svc.inspectDesc"),
                price: livePackages(INSPECTION.packages)[0]?.price ?? INSPECTION.basePrice,
              },
              {
                to: "/assembly" as const,
                icon: Wrench,
                title: t("svc.assemble"),
                desc: t("svc.assembleDesc"),
                price: livePackages(ASSEMBLY.packages)[0].price,
              },
              {
                to: "/cleaning" as const,
                icon: Sparkles,
                title: t("svc.clean"),
                desc: t("svc.cleanDesc"),
                price: livePackages(CLEANING.packages)[0].price,
              },
            ].map((s) => (
              <Link key={s.to} to={s.to} className="group">
                <Card className="lift h-full rounded-3xl p-6">
                  <s.icon className="size-5 text-primary" />
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.desc}</p>
                  <p className="mt-4 text-sm font-medium text-primary">
                    {t("svc.from")} {dh(s.price)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("pre.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("pre.desc")}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/prebuilts">{t("pre.all")}</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {featured.map((b) => (
            <Link key={b.id} to="/prebuilts/$id" params={{ id: b.id }} className="group">
              <Card className="lift h-full rounded-3xl p-3">
                <div className="grid h-56 place-items-center overflow-hidden rounded-2xl bg-surface-2">
                  <img
                    src={FEATURED_SYSTEM_IMAGES[b.id]}
                    alt={b.title}
                    className="part-art size-full object-contain p-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    onError={(event) => {
                      if (event.currentTarget.getAttribute("src") !== b.image) {
                        event.currentTarget.src = b.image;
                      }
                    }}
                  />
                </div>
                <h3 className="mt-3 font-medium">{b.title}</h3>
                <p className="text-xs text-muted ltr-isolate">
                  {b.cpu} · {b.gpu}
                </p>
                <p className="mt-2 font-display text-lg font-semibold tabular-nums ltr-isolate">{dh(b.price)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="mb-4 font-display text-2xl font-semibold">{t("nav.deals")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {hot.map((p) => (
            <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="lift rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <div className="product-image-swatch mb-2 grid h-20 place-items-center rounded-lg">
                <ProductImage product={p} className="part-art mx-auto h-16 object-contain" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="product-price font-display tabular-nums ltr-isolate">{dh(p.best_price)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold">{t("trust.title")}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {(["trust.1", "trust.2", "trust.3", "trust.4"] as const).map((k) => (
            <li key={k} className="flex gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm">{t(k)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-on-navy">{t("cta.title")}</h2>
            <p className="mt-2 max-w-lg text-sm text-on-navy-muted">{t("cta.sub")}</p>
          </div>
          <Button asChild>
            <Link to="/inspection">
              {t("cta.btn")} <Search className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
