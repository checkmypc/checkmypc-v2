import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductAvailability } from "@/components/product-availability";
import { catalog, CATEGORY_ORDER, categoryImage, categoryLabel } from "@/lib/catalog";
import { emptyOffer, emptyProduct, useOps } from "@/lib/ops";
import type { CategorySlug, Offer, Product, Stock } from "@/lib/types";
import { cn, fieldClass } from "@/lib/utils";

export const Route = createFileRoute("/admin/catalog")({ component: AdminCatalog });

const STOCKS: Stock[] = ["in_stock", "low_stock", "out_of_stock", "unknown"];

function AdminCatalog() {
  const products = useOps((s) => s.products);
  const upsert = useOps((s) => s.upsertProduct);
  const remove = useOps((s) => s.deleteProduct);
  const touch = useOps((s) => s.touchPrices);
  const patch = useOps((s) => s.patchProduct);
  const [cat, setCat] = useState<CategorySlug | "all">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | "new" | null>(null);

  const rows = useMemo(() => {
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (q && !`${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, cat, q]);

  const current = sel === "new" ? null : products.find((p) => p.id === sel);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Prices</p>
          <h1 className="font-display text-3xl font-semibold">Catalogue</h1>
          <p className="mt-1 text-sm text-muted">
            Edit component details and photos. Saved changes update the public component pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              touch();
              toast.success("Timestamps reset to now");
            }}
          >
            Mark prices checked
          </Button>
          <Button size="sm" onClick={() => setSel("new")}>
            Add SKU
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={cn(
            "min-h-9 rounded-full px-3 text-xs font-semibold",
            cat === "all" ? "bg-primary text-primary-fg" : "bg-surface text-muted shadow-[var(--shadow-border)]",
          )}
        >
          All
        </button>
        {CATEGORY_ORDER.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setCat(slug)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs font-semibold",
              cat === slug ? "bg-primary text-primary-fg" : "bg-surface text-muted shadow-[var(--shadow-border)]",
            )}
          >
            {categoryLabel(slug)}
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU…" className="mb-4 max-w-md" />

      {sel && (
        <div className="mb-4">
          <ProductEditor
            key={sel === "new" ? "new" : current?.id ?? "x"}
            product={
              sel === "new" ? emptyProduct(cat === "all" ? "gpu" : cat) : (current ?? emptyProduct("gpu"))
            }
            isNew={sel === "new"}
            onSave={async (p) => {
              try {
                await upsert(p);
                setSel(p.id);
                toast.success("SKU saved");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save SKU. Please try again.");
              }
            }}
            onCancel={() => setSel(null)}
            onDelete={
              sel === "new"
                ? undefined
                : () => {
                    if (current) remove(current.id);
                    setSel(null);
                    toast.success("Removed");
                  }
            }
          />
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {rows.map((p) => (
          <Card key={p.id} className="rounded-xl p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button type="button" className="flex min-w-0 items-center gap-3 text-start" onClick={() => setSel(p.id)}>
                <img src={p.image || categoryImage(p.category)} alt="" className="part-art size-12 shrink-0 object-contain" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.brand} · {categoryLabel(p.category)}
                  </span>
                </span>
              </button>
              <Button size="sm" variant="secondary" onClick={() => setSel(p.id)}>
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Best", p.best_price, "best_price"],
                ["MSRP", p.msrp, "msrp"],
                ["Used", p.used_price, "used_price"],
              ].map(([label, value, key]) => (
                <label key={key} className="block text-xs text-muted">
                  {label} DH
                  <input
                    className="mt-1 h-10 w-full rounded-md bg-bg px-2 font-mono text-sm tabular-nums text-fg shadow-[var(--shadow-border)]"
                    type="number"
                    value={value}
                    onChange={(event) => {
                      const price = Number(event.target.value);
                      if (key === "best_price") patch(p.id, { best_price: price });
                      else if (key === "msrp") patch(p.id, { msrp: price });
                      else if (key === "used_price") patch(p.id, { used_price: price });
                    }}
                    aria-label={`${p.name} ${label}`}
                  />
                </label>
              ))}
              <div className="flex items-end justify-between gap-2">
                <div className="pb-1">
                  <p className="mb-1 text-[10px] text-muted">Availability by offers</p>
                  <ProductAvailability product={p} className="text-[10px]" />
                </div>
                <span className="pb-2 text-xs text-muted">{p.store_count} stores</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)] md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-2 py-3 font-medium">Best</th>
              <th className="px-2 py-3 font-medium">MSRP</th>
              <th className="px-2 py-3 font-medium">Used</th>
              <th className="px-2 py-3 font-medium">Stock</th>
              <th className="px-2 py-3 font-medium">Stores</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2">
                  <button type="button" className="flex items-center gap-3 text-start" onClick={() => setSel(p.id)}>
                    <img src={p.image || categoryImage(p.category)} alt="" className="part-art size-10 object-contain" />
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-xs text-muted">
                        {p.brand} · {categoryLabel(p.category)}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-2">
                  <input
                    className="h-10 w-24 rounded-md bg-bg px-2 font-mono text-sm tabular-nums shadow-[var(--shadow-border)]"
                    type="number"
                    value={p.best_price}
                    onChange={(e) => patch(p.id, { best_price: Number(e.target.value) })}
                    aria-label={`${p.name} best price`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="h-10 w-24 rounded-md bg-bg px-2 font-mono text-sm tabular-nums shadow-[var(--shadow-border)]"
                    type="number"
                    value={p.msrp}
                    onChange={(e) => patch(p.id, { msrp: Number(e.target.value) })}
                    aria-label={`${p.name} MSRP`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="h-10 w-24 rounded-md bg-bg px-2 font-mono text-sm tabular-nums shadow-[var(--shadow-border)]"
                    type="number"
                    value={p.used_price}
                    onChange={(e) => patch(p.id, { used_price: Number(e.target.value) })}
                    aria-label={`${p.name} used price`}
                  />
                </td>
                <td className="px-2 py-2">
                  <ProductAvailability product={p} className="text-[10px]" />
                </td>
                <td className="px-2 py-2 text-muted">{p.store_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  product: Product;
  isNew: boolean;
  onSave: (p: Product) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Product>(() => ({
    ...product,
    offers: (product.offers ?? []).map((offer) => ({ ...offer, stock: offer.stock ?? "unknown" })),
  }));
  const [specRows, setSpecRows] = useState<[string, string][]>(() => Object.entries(product.specs));
  const [saving, setSaving] = useState(false);
  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setSpec(index: number, key: string, value: string) {
    setSpecRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? [key, value] : row)));
  }
  function setOffer(i: number, patch: Partial<Offer>) {
    setForm((f) => ({
      ...f,
      offers: f.offers.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    }));
  }

  return (
    <Card className="rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{isNew ? "New SKU" : form.name || "Edit SKU"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-brand">Brand</Label>
          <Input id="p-brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-cat">Category</Label>
          <select
            id="p-cat"
            className={fieldClass}
            value={form.category}
            onChange={(e) => set("category", e.target.value as CategorySlug)}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="p-msrp">MSRP DH</Label>
          <Input id="p-msrp" type="number" value={form.msrp} onChange={(e) => set("msrp", Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="p-used">Used DH</Label>
          <Input id="p-used" type="number" value={form.used_price} onChange={(e) => set("used_price", Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="p-power">Power draw W</Label>
          <Input id="p-power" type="number" value={form.power_draw} onChange={(e) => set("power_draw", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="p-description">Description</Label>
          <Textarea
            id="p-description"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short product details shown on its page"
          />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="p-img">Primary product photo</Label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {form.image && (
            <img src={form.image} alt="" className="part-art size-16 rounded-lg bg-surface-2 object-contain p-2" />
          )}
          <Input
            id="p-img"
            className="min-w-0 flex-1"
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="Photo path"
          />
          <ImageUpload
            onUploaded={(url) =>
              setForm((current) => ({
                ...current,
                image: url,
                images: [url, ...(current.images ?? []).filter((image) => image !== url)],
              }))
            }
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ImageUpload
            label="Add gallery photo"
            onUploaded={(url) =>
              setForm((current) => ({
                ...current,
                images: [...new Set([...(current.images ?? []), url])],
              }))
            }
          />
          <span className="text-xs text-muted">{form.images?.length ?? 0} saved photos</span>
        </div>
        {form.images && form.images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.images.map((image) => (
              <div key={image} className="relative">
                <img src={image} alt="" className="part-art size-16 rounded-lg bg-surface-2 object-contain p-2" />
                <button
                  type="button"
                  className="absolute -end-1 -top-1 grid size-6 place-items-center rounded-full bg-danger text-xs text-white"
                  aria-label={`Remove photo ${image}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      images: (current.images ?? []).filter((savedImage) => savedImage !== image),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Component details</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSpecRows((rows) => [...rows, ["", ""]])}
          >
            Add detail
          </Button>
        </div>
        <div className="space-y-2">
          {specRows.map(([name, value], index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
              <Input
                value={name}
                onChange={(e) => setSpec(index, e.target.value, value)}
                aria-label={`Detail ${index + 1} name`}
                placeholder="Detail (e.g. Socket)"
              />
              <Input
                value={value}
                onChange={(e) => setSpec(index, name, e.target.value)}
                aria-label={`Detail ${index + 1} value`}
                placeholder="Value (e.g. AM4)"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSpecRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
          {specRows.length === 0 && <p className="text-xs text-muted">No component details added yet.</p>}
        </div>
      </div>
      <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Store offers</h3>
      <div className="space-y-3">
        {form.offers.map((o, i) => (
          <div key={`${o.store}-${i}`} className="grid gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-5">
            <select
              className={fieldClass}
              value={o.store}
              onChange={(e) => {
                const store = catalog.stores.find((s) => s.name === e.target.value);
                setOffer(i, { store: e.target.value, city: store?.city ?? o.city });
              }}
            >
              {catalog.stores.map((s) => (
                <option key={s.name}>{s.name}</option>
              ))}
              {!catalog.stores.some((s) => s.name === o.store) && <option>{o.store}</option>}
            </select>
            <Input type="number" value={o.price} onChange={(e) => setOffer(i, { price: Number(e.target.value) })} />
            <select
              className={fieldClass}
              value={o.stock}
              aria-label={`${o.store} availability`}
              onChange={(e) => setOffer(i, { stock: e.target.value as Stock })}
            >
              {STOCKS.map((s) => (
                <option key={s} value={s}>
                  {s === "unknown" ? "Availability unknown" : s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Input value={o.url} onChange={(e) => setOffer(i, { url: e.target.value })} placeholder="https://" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, offers: f.offers.filter((_, idx) => idx !== i) }))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setForm((f) => ({ ...f, offers: [...f.offers, emptyOffer()] }))}>
        Add offer
      </Button>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() => {
            const specs: Record<string, string> = {};
            const specKeys = new Set<string>();
            for (const [rawName, rawValue] of specRows) {
              const name = rawName.trim();
              const value = rawValue.trim();
              if (!name && !value) continue;
              if (!name || !value) {
                toast.error("Each component detail needs both a name and a value");
                return;
              }
              if (specKeys.has(name.toLowerCase())) {
                toast.error("Component detail names must be unique");
                return;
              }
              specKeys.add(name.toLowerCase());
              specs[name] = value;
            }
            setSaving(true);
            void onSave({ ...form, name: form.name.trim(), brand: form.brand.trim(), specs }).finally(() => {
              setSaving(false);
            });
          }}
        >
          {saving ? "Saving…" : "Save SKU"}
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            Delete SKU
          </Button>
        )}
      </div>
    </Card>
  );
}
