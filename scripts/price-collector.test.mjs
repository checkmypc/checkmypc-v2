import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assertPermittedResponse, parseJsonLdProduct } from "./price-parser.mjs";
import { PRICE_SOURCES } from "./price-sources.mjs";
import {
  collectPrices,
  fetchProduct,
  fetchPermittedUrl,
  isAllowedRetailerUrl,
  robotsAllows,
} from "./price-collector.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const fixture = await readFile(join(directory, "fixtures", "price-product.jsonld.html"), "utf8");
const source = {
  identity: ["5600"],
  variants: ["Tray"],
};
test("parses a strictly matched JSON-LD product offer", () => {
  assert.deepEqual(parseJsonLdProduct(fixture, source), {
    name: "AMD Ryzen 5 5600 Tray",
    price: 123.45,
    currency: "MAD",
    availability: "in_stock",
  });
});

test("rejects a model or variant mismatch", () => {
  assert.throws(
    () => parseJsonLdProduct(fixture, { identity: ["5600X"], variants: ["Tray"] }),
    /identity/u,
  );
  assert.throws(
    () => parseJsonLdProduct(fixture, { identity: ["5600"], variants: ["Box"] }),
    /identity/u,
  );
  assert.throws(
    () => parseJsonLdProduct(fixture, { identity: ["Ryzen", "7", "5600"], variants: ["Tray"] }),
    /identity/u,
  );
});

test("keeps every supplied unique URL explicit and unlinked until variant review", () => {
  assert.equal(PRICE_SOURCES.length, 16);
  assert.equal(new Set(PRICE_SOURCES.map((item) => item.url)).size, 16);
  assert.ok(PRICE_SOURCES.every((item) => item.catalogProductId === null));
});

test("rejects non-MAD, malformed, and non-positive prices", () => {
  for (const [price, currency] of [["1,234", "MAD"], ["0", "MAD"], ["12.50", "EUR"]]) {
    const html = fixture.replace('"123.45"', JSON.stringify(price)).replace('"MAD"', JSON.stringify(currency));
    assert.throws(() => parseJsonLdProduct(html, source), /price|currency|positive|numeric/u);
  }
});

test("records out-of-stock structured offers without treating them as in stock", () => {
  const html = fixture.replace("InStock", "OutOfStock");
  assert.equal(parseJsonLdProduct(html, source).availability, "out_of_stock");
});

test("refuses blocked, challenge, or non-HTML retailer responses", () => {
  const response = (status, type = "text/html") => ({
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ "content-type": type }),
  });
  assert.throws(() => assertPermittedResponse(response(403), ""), /denied/u);
  assert.throws(() => assertPermittedResponse(response(200), "CAPTCHA"), /challenge/u);
  assert.throws(() => assertPermittedResponse(response(200, "application/json"), ""), /not HTML/u);
});

const collectorAgent = "CHECKMYPC-PriceTracker/1.0";

test("specific robots user-agent group takes precedence over wildcard", () => {
  const rules = [
    "User-agent: *",
    "Disallow: /socket-am4/",
    "User-agent: CHECKMYPC-PriceTracker",
    "Allow: /socket-am4/",
  ].join("\n");
  assert.equal(robotsAllows(rules, "/socket-am4/item", collectorAgent), true);
});

test("specific robots disallow overrides wildcard allow", () => {
  const rules = [
    "User-agent: *",
    "Allow: /socket-am4/",
    "User-agent: CHECKMYPC-PriceTracker",
    "Disallow: /socket-am4/",
  ].join("\n");
  assert.equal(robotsAllows(rules, "/socket-am4/item", collectorAgent), false);
});

test("a disallowed product URL is never requested", async () => {
  const requestedUrls = [];
  const mockFetch = async (url, options) => {
    requestedUrls.push(String(url));
    assert.equal(options.redirect, "error");
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  };
  const result = await collectPrices({
    connectionString: "offline-test",
    poolFactory: () => ({
      query: async (sql) => sql.includes("to_regclass")
        ? { rows: [{ observations_table: "price_observations", runs_table: "price_collection_runs" }] }
        : { rows: [] },
      end: async () => {},
    }),
    fetchImpl: mockFetch,
  });
  assert.equal(result.failure, PRICE_SOURCES.length);
  assert.equal(requestedUrls.length, new Set(PRICE_SOURCES.map((item) => new URL(item.url).origin)).size);
  assert.ok(requestedUrls.every((url) => url.endsWith("/robots.txt")));
});

test("exported product fetch requires a successful schema preflight token", async () => {
  let requests = 0;
  await assert.rejects(
    fetchProduct(PRICE_SOURCES[0], new Map(), new Map(), async () => {
      requests += 1;
      throw new Error("Unexpected mocked request");
    }),
    /schema preflight is required/u,
  );
  assert.equal(requests, 0);
});

test("longest robots path wins and Allow wins equal-length conflicts", () => {
  const rules = [
    "User-agent: CHECKMYPC-PriceTracker",
    "Disallow: /products/",
    "Allow: /products/public/",
    "Disallow: /products/public/item",
    "Allow: /products/public/item",
  ].join("\n");
  assert.equal(robotsAllows(rules, "/products/private", collectorAgent), false);
  assert.equal(robotsAllows(rules, "/products/public/other", collectorAgent), true);
  assert.equal(robotsAllows(rules, "/products/public/item", collectorAgent), true);
});

test("retailer requests allow only configured HTTPS retailer hosts", () => {
  assert.ok(PRICE_SOURCES.every((item) => isAllowedRetailerUrl(item.url)));
  assert.equal(isAllowedRetailerUrl("http://www.ultrapc.ma/product"), false);
  assert.equal(isAllowedRetailerUrl("https://ultrapc.ma/product"), false);
  assert.equal(isAllowedRetailerUrl("https://attacker.example/product"), false);
  assert.equal(isAllowedRetailerUrl("https://www.ultrapc.ma.attacker.example/product"), false);
});

test("request wrapper rejects disallowed host before invoking mocked fetch", async () => {
  let requests = 0;
  await assert.rejects(
    fetchPermittedUrl("https://attacker.example/product", {}, async () => {
      requests += 1;
      return new Response("unexpected");
    }),
    /outside the configured HTTPS hosts/u,
  );
  assert.equal(requests, 0);
});

test("mocked retailer redirects are refused and request mode forbids redirects", async () => {
  let requestOptions;
  await assert.rejects(
    fetchPermittedUrl(
      PRICE_SOURCES[0].url,
      {},
      async (_url, options) => {
        requestOptions = options;
        return { status: 302 };
      },
    ),
    /redirect refused/u,
  );
  assert.equal(requestOptions.redirect, "error");
});

async function assertInvalidRobotsBlocksProduct(createRobotsResponse) {
  let productRequests = 0;
  const mockFetch = async (url) => {
    if (String(url).endsWith("/robots.txt")) return createRobotsResponse();
    productRequests += 1;
    return new Response(fixture, { headers: { "content-type": "text/html" } });
  };
  const result = await collectPrices({
    connectionString: "offline-test",
    poolFactory: () => ({
      query: async (sql) => sql.includes("to_regclass")
        ? { rows: [{ observations_table: "price_observations", runs_table: "price_collection_runs" }] }
        : { rows: [] },
      end: async () => {},
    }),
    fetchImpl: mockFetch,
  });
  assert.equal(result.failure, PRICE_SOURCES.length);
  assert.equal(productRequests, 0);
}

test("malformed or unexpected robots responses fail closed before product fetch", async () => {
  await assertInvalidRobotsBlocksProduct(
    () => new Response("<html><body>not a robots file</body></html>", {
      headers: { "content-type": "text/html" },
    }),
  );
  await assertInvalidRobotsBlocksProduct(
    () => new Response("<html><body>Access denied</body></html>", {
      headers: { "content-type": "text/plain" },
    }),
  );
  await assertInvalidRobotsBlocksProduct(
    () => new Response("not a valid robots directive", {
      headers: { "content-type": "text/plain" },
    }),
  );
  await assertInvalidRobotsBlocksProduct(
    () => new Response("User-agent: *\n", {
      headers: { "content-type": "text/plain" },
    }),
  );
  await assertInvalidRobotsBlocksProduct(
    () => new Response("User-agent: *\nDisallow: /", {}),
  );
  await assertInvalidRobotsBlocksProduct(
    () => new Response("User-agent: *\nDisallow: /", {
      status: 503,
      headers: { "content-type": "text/plain" },
    }),
  );
});

test("schema preflight fails before the collector can request retailer pages", async () => {
  let retailerRequests = 0;
  const pool = {
    query: async (query) => {
      assert.match(query, /to_regclass\('price_observations'\)/u);
      assert.match(query, /to_regclass\('price_collection_runs'\)/u);
      return { rows: [{ observations_table: "price_observations", runs_table: null }] };
    },
    end: async () => {},
  };
  await assert.rejects(
    collectPrices({
      connectionString: "postgres://offline-test.invalid/database",
      poolFactory: () => pool,
      fetchImpl: async () => {
        retailerRequests += 1;
        throw new Error("Unexpected network request in offline test");
      },
    }),
    /schema is incomplete/u,
  );
  assert.equal(retailerRequests, 0);
});
