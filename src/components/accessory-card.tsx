import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessoryGallery } from "@/components/accessory-gallery";
import {
  accessoryAvailability,
  accessoryCategoryLabel,
  accessorySellerLabel,
} from "@/lib/accessories";
import { CONTACT } from "@/lib/services";
import { useOps } from "@/lib/ops";
import { whatsappHref } from "@/lib/bookings";
import type { Accessory } from "@/lib/types";
import { dh } from "@/lib/utils";

export function AccessoryCard({ accessory }: { accessory: Accessory }) {
  const savedWhatsapp = useOps((state) => state.settings.whatsapp);
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

  return (
    <article className="lift group relative flex min-w-0 flex-col rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
      <Link
        to="/accessories/$id"
        params={{ id: accessory.slug }}
        aria-label={`View ${accessory.name} details`}
        className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div className="product-card-image-frame pointer-events-none relative z-10 overflow-hidden rounded-xl border border-border bg-bg">
        <Badge className="pointer-events-none absolute start-3 top-3 z-10 bg-surface/90 text-muted shadow-[var(--shadow-border)] backdrop-blur">
          {accessoryCategoryLabel(accessory.category)}
        </Badge>
        <AccessoryGallery images={accessory.images} name={accessory.name} compact />
      </div>
      <div className="relative flex flex-1 flex-col px-1 pt-3 pointer-events-none sm:pt-4">
        <span className="w-fit rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
          Sold by {accessorySellerLabel(accessory.seller)}
        </span>
        <h2 className="mt-2 line-clamp-2 min-h-10 font-display text-base font-semibold leading-5 transition-colors group-hover:text-primary">
          {accessory.name}
        </h2>
        {accessory.manufacturer && (
          <p className="mt-1 truncate text-xs text-muted">{accessory.manufacturer}</p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {[
            ["Material", accessory.material],
            ["Color", accessory.color],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="product-price whitespace-nowrap font-display text-base font-bold tabular-nums ltr-isolate sm:text-lg">
              {dh(accessory.price)}
            </p>
          </div>
          <Badge tone={availability.tone}>{availability.label}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild size="sm" variant="secondary" className="pointer-events-auto relative z-30">
            <Link to="/accessories/$id" params={{ id: accessory.slug }}>
              Product details
            </Link>
          </Button>
          {accessory.stockQuantity > 0 ? (
            <Button asChild size="sm" className="pointer-events-auto relative z-30">
              <a
                href={orderHref}
                target={!isCheckmypcSeller && accessory.sellerUrl ? "_blank" : undefined}
                rel={!isCheckmypcSeller && accessory.sellerUrl ? "noreferrer" : undefined}
              >
                Order
              </a>
            </Button>
          ) : (
            <Button size="sm" disabled className="pointer-events-auto relative z-30">
              Out of stock
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
