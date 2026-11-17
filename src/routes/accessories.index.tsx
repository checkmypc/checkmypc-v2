import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AccessoryCard } from "@/components/accessory-card";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { ACCESSORY_CATEGORIES } from "@/lib/accessories";
import { getAccessoriesFn } from "@/lib/api";
import type { AccessoryCategory } from "@/lib/types";

export const Route = createFileRoute("/accessories/")({
  loader: () => getAccessoriesFn(),
  component: AccessoriesPage,
});

function AccessoriesPage() {
  const accessories = Route.useLoaderData();
  const [category, setCategory] = useState<AccessoryCategory | "all">("all");
  const rows = useMemo(
    () => accessories.filter((item) => category === "all" || item.category === category),
    [accessories, category],
  );

  return (
    <main>
      <PageHero
        eyebrow="CHECKMYPC · SETUP ACCESSORIES"
        title="Setup Accessories"
        description="Practical finishing touches for a cleaner, more comfortable setup."
      />
      <section className="mx-auto max-w-6xl px-4 pb-5 pt-4 sm:pt-6" aria-label="Accessory categories">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
              category === "all"
                ? "bg-primary text-primary-fg"
                : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
            }`}
          >
            All accessories
          </button>
          {ACCESSORY_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                category === item.id
                  ? "bg-primary text-primary-fg"
                  : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
      <section
        className="mx-auto max-w-6xl px-4 pb-12 pt-3 sm:pb-16"
        aria-label="Available setup accessories"
      >
        {rows.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((accessory) => (
              <AccessoryCard key={accessory.id} accessory={accessory} />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl px-5 py-12 text-center sm:py-16">
            <p className="font-display text-xl font-semibold">No accessories listed yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              There are no active products in this category right now.
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}
