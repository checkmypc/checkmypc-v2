import assert from "node:assert/strict";
import test from "node:test";
import { categoryStudioImage, themedImage } from "./theme-images.ts";
import type { CategorySlug } from "./types.ts";

test("category studio images select their matching light and dark variants", () => {
  const categories: CategorySlug[] = [
    "cpu",
    "gpu",
    "motherboard",
    "ram",
    "storage",
    "psu",
    "case",
    "cooler",
    "display",
    "peripheral",
  ];

  for (const category of categories) {
    assert.equal(categoryStudioImage(category, "dark"), `/parts/studio/${category}-front.jpg`);
    assert.equal(
      categoryStudioImage(category, "light"),
      `/parts/studio%20white/${category}-front.jpg`,
    );
  }
});

test("theme image selection falls back to the dark asset when no light variant exists", () => {
  assert.equal(
    themedImage("/parts/studio/display-detail.jpg", "light"),
    "/parts/studio/display-detail.jpg",
  );
});

test("theme image selection leaves non-studio image URLs unchanged", () => {
  const image = "/parts/products/example/01.jpg";
  assert.equal(themedImage(image, "light"), image);
  assert.equal(themedImage(image, "dark"), image);
});
