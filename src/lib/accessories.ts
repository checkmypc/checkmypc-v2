import type { AccessoryCategory } from "./types";

export const ACCESSORY_CATEGORIES: {
  id: AccessoryCategory;
  label: string;
  image: string;
}[] = [
  {
    id: "gpu-support",
    label: "GPU Support",
    image: "/accessories/categories/gpu-support.jpg",
  },
  {
    id: "controller-stands",
    label: "Controller Stands",
    image: "/accessories/categories/controller-stands.jpg",
  },
  {
    id: "headphone-stands",
    label: "Headphone Stands",
    image: "/accessories/categories/headphone-stands.png",
  },
  {
    id: "cable-management",
    label: "Cable Management",
    image: "/accessories/categories/cable-management.png",
  },
];

export function accessoryCategoryLabel(category: AccessoryCategory): string {
  return ACCESSORY_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function accessorySellerLabel(seller: string): string {
  return seller.trim().toUpperCase() === "CHECKMYPC" ? "CHECKMYPC" : seller.trim();
}

export function accessoryAvailability(quantity: number): {
  label: string;
  tone: "ok" | "warn" | "danger";
} {
  if (quantity <= 0) return { label: "Out of stock", tone: "danger" };
  if (quantity <= 5) return { label: `Low stock · ${quantity}`, tone: "warn" };
  return { label: `In stock · ${quantity}`, tone: "ok" };
}
