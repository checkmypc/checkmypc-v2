import type { Product } from "./types";

export type ProductAvailabilityState = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export function productAvailability(product: Pick<Product, "offers">): ProductAvailabilityState {
  if (product.offers.length === 0) return "unknown";
  if (product.offers.some((offer) => offer.stock === "in_stock")) return "in_stock";
  if (product.offers.some((offer) => offer.stock === "low_stock")) return "low_stock";
  if (product.offers.every((offer) => offer.stock === "out_of_stock")) return "out_of_stock";
  return "unknown";
}
