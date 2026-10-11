import assert from "node:assert/strict";
import test from "node:test";
import { productAvailability } from "./availability.ts";
import type { Offer, Stock } from "./types.ts";

function offers(...stocks: Stock[]): Offer[] {
  return stocks.map((stock) => ({
    store: "Store",
    city: "Casablanca",
    price: 100,
    stock,
    checked_minutes_ago: 0,
    url: "https://example.com",
  }));
}

test("product availability is derived from offer stock without overclaiming", () => {
  assert.equal(productAvailability({ offers: [] }), "unknown");
  assert.equal(productAvailability({ offers: offers("in_stock") }), "in_stock");
  assert.equal(productAvailability({ offers: offers("low_stock") }), "low_stock");
  assert.equal(productAvailability({ offers: offers("out_of_stock", "out_of_stock") }), "out_of_stock");
  assert.equal(productAvailability({ offers: offers("out_of_stock", "unknown") }), "unknown");
  assert.equal(productAvailability({ offers: offers("out_of_stock", "in_stock") }), "in_stock");
});
