import type { CategorySlug, Theme } from "./types";

const STUDIO_CATEGORY_FILES: Record<CategorySlug, string> = {
  cpu: "cpu",
  cooler: "cooler",
  motherboard: "motherboard",
  ram: "ram",
  storage: "storage",
  gpu: "gpu",
  psu: "psu",
  case: "case",
  display: "display",
  peripheral: "peripheral",
};

const LIGHT_STUDIO_IMAGES = new Set([
  "case-detail.jpg",
  "case-front.jpg",
  "case-rear.jpg",
  "case-side.jpg",
  "cooler-detail.jpg",
  "cooler-front.jpg",
  "cooler-rear.jpg",
  "cooler-side.jpg",
  "cpu-detail.jpg",
  "cpu-front.jpg",
  "cpu-rear.jpg",
  "cpu-side.jpg",
  "display-front.jpg",
  "display-rear.jpg",
  "display-side.jpg",
  "gpu-detail.jpg",
  "gpu-front.jpg",
  "gpu-rear.jpg",
  "gpu-side.jpg",
  "motherboard-front.jpg",
  "peripheral-detail.jpg",
  "peripheral-front.jpg",
  "peripheral-rear.jpg",
  "peripheral-side.jpg",
  "psu-detail.jpg",
  "psu-front.jpg",
  "psu-rear.jpg",
  "psu-side.jpg",
  "ram-detail.jpg",
  "ram-front.jpg",
  "ram-rear.jpg",
  "ram-side.jpg",
  "storage-detail.jpg",
  "storage-front.jpg",
  "storage-rear.jpg",
  "storage-side.jpg",
]);

export function themedImage(src: string, theme: Theme): string {
  const match = /^\/parts\/studio\/([^/?#]+)([?#].*)?$/.exec(src);
  if (theme !== "light" || !match || !LIGHT_STUDIO_IMAGES.has(match[1])) return src;
  return `/parts/studio%20white/${match[1]}${match[2] ?? ""}`;
}

export function studioFallbackImage(src: string): string {
  const match = /^\/parts\/studio%20white\/([^/?#]+)([?#].*)?$/.exec(src);
  if (!match) return src;
  return `/parts/studio/${match[1]}${match[2] ?? ""}`;
}

export function categoryStudioImage(category: CategorySlug, theme: Theme): string {
  return themedImage(`/parts/studio/${STUDIO_CATEGORY_FILES[category]}-front.jpg`, theme);
}
