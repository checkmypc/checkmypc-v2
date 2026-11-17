import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AccessoryCard } from "@/components/accessory-card";
import { AccessoryGallery } from "@/components/accessory-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  accessoryAvailability,
  accessoryCategoryLabel,
  accessorySellerLabel,
} from "@/lib/accessories";
import { getAccessoriesFn, getAccessoryFn } from "@/lib/api";
import { CONTACT } from "@/lib/services";
import { useOps } from "@/lib/ops";
import { whatsappHref } from "@/lib/bookings";
import { dh } from "@/lib/utils";

export const Route = createFileRoute("/accessories/$id")({
  loader: async ({ params }) => {
    const [accessory, accessories] = await Promise.all([
      getAccessoryFn({ data: { id: params.id } }),
      getAccessoriesFn(),
    ]);
    return {
      accessory,
      related: accessories.filter(
        (item) => item.id !== accessory?.id && item.category === accessory?.category,
      ),
    };
  },
  component: AccessoryDetailsPage,
});

function AccessoryDetailsPage() {
  const { accessory, related } = Route.useLoaderData();
  const savedWhatsapp = useOps((state) => state.settings.whatsapp);
  if (!accessory) throw notFound();

  const availability = accessoryAvailability(accessory.stockQuantity);
  const isCheckmypcSeller = accessory.seller.trim().toUpperCase() === "CHECKMYPC";
  const orderHref =
    !isCheckmypcSeller && accessory.sellerUrl
      ? accessory.sellerUrl
      : whatsappHref(
          savedWhatsapp || CONTACT.whatsapp,
          isCheckmypcSeller
            ? `Hello CHECKMYPC, I would like to order ${accessory.name} (${dh(accessory.price)}).`
            : `Hello CHECKMYPC, please connect me with ${accessory.seller} to order ${accessory.name}.`,
        );
  const specifications = [
    ["Material", accessory.material],
    ["Color", accessory.color],
    ...Object.entries(accessory.specs),
  ].filter(([, value]) => value);

  return (
    <main className="pb-10">
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-5 text-sm text-muted"
      >
        <Link to="/" className="rounded-sm hover:text-primary">
          Home
        </Link>
        <ChevronRight className="size-3.5 text-muted/60 rtl-flip" aria-hidden="true" />
        <Link to="/accessories" className="rounded-sm hover:text-primary">
          Accessories
        </Link>
        <ChevronRight className="size-3.5 text-muted/60 rtl-flip" aria-hidden="true" />
        <Link to="/accessories" className="rounded-sm hover:text-primary">
          {accessoryCategoryLabel(accessory.category)}
        </Link>
        <ChevronRight className="size-3.5 text-muted/60 rtl-flip" aria-hidden="true" />
        <span className="min-w-0 truncate font-semibold text-primary" aria-current="page">
          {accessory.name}
        </span>
      </nav>
      <section className="mx-auto grid max-w-6xl items-start gap-5 px-4 pb-8 sm:gap-7 sm:pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-2xl p-3 sm:p-5">
          <AccessoryGallery images={accessory.images} name={accessory.name} />
        </Card>
        <div className="min-w-0 lg:sticky lg:top-24">
          <Card className="rounded-2xl p-5 sm:p-7">
            <Badge tone="neutral">{accessoryCategoryLabel(accessory.category)}</Badge>
            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              {accessory.name}
            </h1>
            {accessory.manufacturer && (
              <p className="mt-2 text-sm text-muted">{accessory.manufacturer}</p>
            )}
            <p className="product-price mt-5 font-display text-3xl font-bold tabular-nums ltr-isolate sm:text-4xl">
              {dh(accessory.price)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                Sold by {accessorySellerLabel(accessory.seller)}
              </span>
              <Badge tone={availability.tone}>{availability.label}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              {[
                ["Material", accessory.material],
                ["Color", accessory.color],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted">{label}</p>
                    <p className="mt-0.5 font-medium">{value}</p>
                  </div>
                ))}
              <div>
                <p className="text-xs text-muted">Availability</p>
                <p className="mt-0.5 font-medium">{accessory.stockQuantity} available</p>
              </div>
            </div>
            {accessory.stockQuantity > 0 ? (
              <Button asChild size="lg" className="mt-6 w-full">
                <a
                  href={orderHref}
                  target={!isCheckmypcSeller && accessory.sellerUrl ? "_blank" : undefined}
                  rel={!isCheckmypcSeller && accessory.sellerUrl ? "noreferrer" : undefined}
                >
                  Order via WhatsApp
                </a>
              </Button>
            ) : (
              <Button disabled size="lg" className="mt-6 w-full">
                Out of stock
              </Button>
            )}
          </Card>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 sm:gap-6 sm:pb-12 lg:grid-cols-2">
        <Card className="rounded-2xl p-5 sm:p-6">
          <h2 className="mb-3 font-display text-xl font-semibold">Product description</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">
            {accessory.description || "No description has been added for this accessory yet."}
          </p>
        </Card>
        <Card className="rounded-2xl p-5 sm:p-6">
          <h2 className="mb-3 font-display text-xl font-semibold">Specifications</h2>
          {specifications.length > 0 ? (
            <dl className="divide-y divide-border text-sm">
              {specifications.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 py-2.5"
                >
                  <dt className="break-words font-medium text-muted">{label}</dt>
                  <dd className="break-words text-end">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">No specifications have been added yet.</p>
          )}
        </Card>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-12" aria-label="Product availability">
        <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">Stock availability</span>
            <Badge tone={availability.tone}>{availability.label}</Badge>
            <span className="text-sm text-muted">{accessory.stockQuantity} available</span>
          </div>
          {accessory.stockQuantity > 0 && (
            <Button asChild variant="secondary">
              <a
                href={orderHref}
                target={!isCheckmypcSeller && accessory.sellerUrl ? "_blank" : undefined}
                rel={!isCheckmypcSeller && accessory.sellerUrl ? "noreferrer" : undefined}
              >
                Order via WhatsApp
              </a>
            </Button>
          )}
        </Card>
      </section>
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12" aria-labelledby="related-accessories">
          <h2 id="related-accessories" className="mb-4 font-display text-2xl font-semibold">
            Related accessories
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {related.slice(0, 3).map((item) => (
              <AccessoryCard key={item.id} accessory={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
