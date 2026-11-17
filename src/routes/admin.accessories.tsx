import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCESSORY_CATEGORIES,
  accessoryAvailability,
  accessoryCategoryLabel,
} from "@/lib/accessories";
import { deleteAccessoryFn, getAdminAccessoriesFn, saveAccessoryFn } from "@/lib/api";
import { useOps } from "@/lib/ops";
import type { Accessory, AccessoryCategory } from "@/lib/types";
import { cn, fieldClass } from "@/lib/utils";

export const Route = createFileRoute("/admin/accessories")({ component: AdminAccessories });

type CategoryFilter = AccessoryCategory | "all";

function emptyAccessory(category: AccessoryCategory = "gpu-support"): Accessory {
  return {
    id: "",
    slug: "",
    name: "",
    category,
    manufacturer: "",
    seller: "CHECKMYPC",
    sellerUrl: "",
    images: [],
    description: "",
    price: 0,
    material: "",
    color: "",
    stockQuantity: 0,
    active: true,
    specs: {},
  };
}

function AdminAccessories() {
  const unlocked = useOps((state) => state.unlocked);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | "new" | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    void getAdminAccessoriesFn()
      .then((rows) => {
        if (active) setAccessories(rows);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Could not load accessories.";
        setLoadError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [unlocked]);

  const rows = useMemo(
    () =>
      accessories.filter((item) => {
        if (filter !== "all" && item.category !== filter) return false;
        const term = search.trim().toLowerCase();
        return (
          !term ||
          `${item.name} ${item.manufacturer} ${item.seller} ${item.id}`.toLowerCase().includes(term)
        );
      }),
    [accessories, filter, search],
  );
  const current =
    selected && selected !== "new" ? accessories.find((item) => item.id === selected) : undefined;

  async function save(accessory: Accessory) {
    const saved = await saveAccessoryFn({ data: accessory });
    setAccessories((items) => {
      const exists = items.some((item) => item.id === saved.id);
      return exists
        ? items.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...items];
    });
    setSelected(saved.id);
    toast.success("Accessory saved");
  }

  async function toggleActive(accessory: Accessory) {
    try {
      const saved = await saveAccessoryFn({ data: { ...accessory, active: !accessory.active } });
      setAccessories((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      toast.success(saved.active ? "Accessory activated" : "Accessory deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update accessory.");
    }
  }

  async function remove(accessory: Accessory) {
    if (!window.confirm(`Delete “${accessory.name}”? This cannot be undone.`)) return;
    try {
      await deleteAccessoryFn({ data: { id: accessory.id } });
      setAccessories((items) => items.filter((item) => item.id !== accessory.id));
      setSelected(null);
      toast.success("Accessory deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete accessory.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Catalogue</p>
          <h1 className="font-display text-3xl font-semibold">Setup Accessories</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Manage accessory listings, galleries, sellers, prices and stock separately from PC
            components.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/accessories">View storefront</Link>
          </Button>
          <Button size="sm" onClick={() => setSelected("new")}>
            Add accessory
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <CategoryButton label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        {ACCESSORY_CATEGORIES.map((item) => (
          <CategoryButton
            key={item.id}
            label={item.label}
            active={filter === item.id}
            onClick={() => setFilter(item.id)}
          />
        ))}
      </div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search accessories…"
        className="mb-4 max-w-md"
      />

      {selected && (
        <div className="mb-4">
          <AccessoryEditor
            key={selected}
            accessory={
              selected === "new"
                ? emptyAccessory(filter === "all" ? "gpu-support" : filter)
                : (current ?? emptyAccessory())
            }
            isNew={selected === "new"}
            onSave={save}
            onCancel={() => setSelected(null)}
            onDelete={selected === "new" || !current ? undefined : () => remove(current)}
          />
        </div>
      )}

      {loadError && (
        <Card
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 p-4 text-sm text-danger"
        >
          {loadError}
        </Card>
      )}
      {loading ? (
        <Card className="rounded-2xl p-8 text-center text-sm text-muted">Loading accessories…</Card>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl p-8 text-center sm:p-12">
          <p className="font-display text-lg font-semibold">No accessories yet</p>
          <p className="mt-1 text-sm text-muted">
            Add a real product to start building this catalogue.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((item) => (
              <Card key={item.id} className="rounded-xl p-3">
                <div className="flex items-start gap-3">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt=""
                      className="size-16 shrink-0 rounded-lg bg-surface-2 object-contain p-1"
                    />
                  ) : (
                    <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                      <ImageIcon className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {accessoryCategoryLabel(item.category)} · Sold by {item.seller}
                    </p>
                    <p className="product-price mt-1 text-sm font-bold">
                      {item.price.toLocaleString("fr-MA")} DH
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {accessoryAvailability(item.stockQuantity).label}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelected(item.id)}>
                    Edit
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <span
                    className={item.active ? "text-xs font-medium text-ok" : "text-xs text-muted"}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    size="sm"
                    variant={item.active ? "ghost" : "soft"}
                    onClick={() => void toggleActive(item)}
                  >
                    {item.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-border)] md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Accessory</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Seller</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.images[0] ? (
                          <img
                            src={item.images[0]}
                            alt=""
                            className="size-12 rounded-lg bg-surface-2 object-contain p-1"
                          />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                            <ImageIcon className="size-4" aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {item.manufacturer || item.id}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{accessoryCategoryLabel(item.category)}</td>
                    <td className="px-3 py-3">{item.seller}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums">
                      {item.price.toLocaleString("fr-MA")} DH
                    </td>
                    <td className="px-3 py-3">{accessoryAvailability(item.stockQuantity).label}</td>
                    <td className="px-3 py-3">{item.active ? "Active" : "Inactive"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(item.id)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={item.active ? "ghost" : "soft"}
                          onClick={() => void toggleActive(item)}
                        >
                          {item.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full px-3 text-xs font-semibold",
        active
          ? "bg-primary text-primary-fg"
          : "bg-surface text-muted shadow-[var(--shadow-border)]",
      )}
    >
      {label}
    </button>
  );
}

function AccessoryEditor({
  accessory,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  accessory: Accessory;
  isNew: boolean;
  onSave: (accessory: Accessory) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Accessory>(() => ({
    ...accessory,
    images: [...accessory.images],
  }));
  const [specRows, setSpecRows] = useState<[string, string][]>(() =>
    Object.entries(accessory.specs),
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Accessory>(key: K, value: Accessory[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      await onSave({
        ...form,
        seller: form.seller.trim() || "CHECKMYPC",
        specs: Object.fromEntries(
          specRows.filter(([label, value]) => label.trim() && value.trim()),
        ),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save accessory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {isNew ? "New accessory" : form.name || "Edit accessory"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="accessory-name">Product name</Label>
          <Input
            id="accessory-name"
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="accessory-category">Category</Label>
          <SelectInput
            id="accessory-category"
            className={fieldClass}
            value={form.category}
            onChange={(event) => set("category", event.target.value as AccessoryCategory)}
          >
            {ACCESSORY_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </div>
        <div>
          <Label htmlFor="accessory-price">Price (DH)</Label>
          <Input
            id="accessory-price"
            type="number"
            min="1"
            step="1"
            value={form.price || ""}
            onChange={(event) => set("price", Number(event.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="accessory-manufacturer">Brand / manufacturer</Label>
          <Input
            id="accessory-manufacturer"
            value={form.manufacturer}
            onChange={(event) => set("manufacturer", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="accessory-seller">Seller</Label>
          <Input
            id="accessory-seller"
            value={form.seller}
            onChange={(event) => set("seller", event.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            Defaults to CHECKMYPC; independent of the manufacturer.
          </p>
        </div>
        <div>
          <Label htmlFor="accessory-material">Material</Label>
          <Input
            id="accessory-material"
            value={form.material}
            onChange={(event) => set("material", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="accessory-color">Color</Label>
          <Input
            id="accessory-color"
            value={form.color}
            onChange={(event) => set("color", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="accessory-stock">Stock quantity</Label>
          <Input
            id="accessory-stock"
            type="number"
            min="0"
            step="1"
            value={form.stockQuantity}
            onChange={(event) => set("stockQuantity", Number(event.target.value))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="accessory-seller-url">Seller order URL (optional)</Label>
          <Input
            id="accessory-seller-url"
            type="url"
            value={form.sellerUrl ?? ""}
            onChange={(event) => set("sellerUrl", event.target.value)}
            placeholder="https://…"
          />
          <p className="mt-1 text-xs text-muted">
            Used for third-party sellers; otherwise orders are sent as a CHECKMYPC enquiry.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="accessory-description">Full description</Label>
          <Textarea
            id="accessory-description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => set("active", event.target.checked)}
            className="size-4 accent-primary"
          />
          Active and visible in the storefront
        </label>
      </div>
      <div className="mt-4">
        <Label>Product image gallery</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {form.images.length < 12 && (
            <ImageUpload
              label={form.images.length ? "Add images" : "Upload images"}
              multiple
              maxFiles={12 - form.images.length}
              onUploaded={(url) =>
                setForm((current) => ({
                  ...current,
                  images: [...new Set([...current.images, url])].slice(0, 12),
                }))
              }
            />
          )}
          <span className="text-xs text-muted">{form.images.length} / 12 images</span>
        </div>
        {form.images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {form.images.map((image, index) => (
              <div key={image} className="relative">
                <img
                  src={image}
                  alt={`${form.name || "Accessory"} gallery image ${index + 1}`}
                  className="aspect-square w-full rounded-lg bg-surface-2 object-contain p-2"
                />
                <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="grid size-7 place-items-center rounded-full bg-surface/90 text-fg shadow-[var(--shadow-border)] disabled:opacity-40"
                    aria-label={`Move image ${index + 1} earlier`}
                    onClick={() =>
                      set(
                        "images",
                        form.images.map((item, itemIndex) =>
                          itemIndex === index - 1
                            ? image
                            : itemIndex === index
                              ? form.images[index - 1]!
                              : item,
                        ),
                      )
                    }
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === form.images.length - 1}
                    className="grid size-7 place-items-center rounded-full bg-surface/90 text-fg shadow-[var(--shadow-border)] disabled:opacity-40"
                    aria-label={`Move image ${index + 1} later`}
                    onClick={() =>
                      set(
                        "images",
                        form.images.map((item, itemIndex) =>
                          itemIndex === index + 1
                            ? image
                            : itemIndex === index
                              ? form.images[index + 1]!
                              : item,
                        ),
                      )
                    }
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  className="absolute -end-1 -top-1 grid size-6 place-items-center rounded-full bg-danger text-xs text-white"
                  aria-label={`Remove gallery image ${index + 1}`}
                  onClick={() =>
                    set(
                      "images",
                      form.images.filter((_, imageIndex) => imageIndex !== index),
                    )
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
          <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
            Specifications
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSpecRows((rows) => [...rows, ["", ""]])}
          >
            Add specification
          </Button>
        </div>
        <div className="space-y-2">
          {specRows.map(([label, value], index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
              <Input
                value={label}
                onChange={(event) =>
                  setSpecRows((rows) =>
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? [event.target.value, value] : row,
                    ),
                  )
                }
                aria-label={`Specification ${index + 1} name`}
                placeholder="Specification"
              />
              <Input
                value={value}
                onChange={(event) =>
                  setSpecRows((rows) =>
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? [label, event.target.value] : row,
                    ),
                  )
                }
                aria-label={`Specification ${index + 1} value`}
                placeholder="Value"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove specification ${index + 1}`}
                onClick={() =>
                  setSpecRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        {onDelete ? (
          <Button variant="danger" size="sm" onClick={() => void onDelete()}>
            Delete accessory
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving || !form.name.trim() || form.price < 1}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Save accessory"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
