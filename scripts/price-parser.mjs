function normalize(value) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function hasIdentityToken(name, token) {
  const normalizedName = ` ${normalize(name)} `;
  const normalizedToken = ` ${normalize(token)} `;
  return normalizedName.includes(normalizedToken);
}

function isProductType(type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (value) => typeof value === "string" && value.split(/[\/#]/u).at(-1) === "Product",
  );
}

function collectProducts(value, products = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectProducts(item, products);
  } else if (value && typeof value === "object") {
    if (isProductType(value["@type"])) products.push(value);
    if (value["@graph"]) collectProducts(value["@graph"], products);
  }
  return products;
}

export function parseJsonLdProduct(html, source) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/giu)];
  const products = [];
  for (const [, script] of scripts) {
    try {
      collectProducts(JSON.parse(script), products);
    } catch {
      continue;
    }
  }

  const matches = products.filter((product) => {
    if (typeof product.name !== "string") return false;
    return source.identity.every((token) => hasIdentityToken(product.name, token)) &&
      source.variants.every((token) => hasIdentityToken(product.name, token));
  });
  if (matches.length !== 1) {
    throw new Error(matches.length ? "Ambiguous structured product identity" : "Expected model or variant not found in structured product name");
  }

  const product = matches[0];
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
  if (offers.length !== 1 || !offers[0] || typeof offers[0] !== "object") {
    throw new Error("Expected exactly one structured product offer");
  }
  const offer = offers[0];
  const currency = typeof offer.priceCurrency === "string" ? offer.priceCurrency.toUpperCase() : "";
  if (currency !== "MAD") throw new Error("Structured offer currency is not MAD");
  const rawPrice = typeof offer.price === "number" ? String(offer.price) : offer.price;
  if (typeof rawPrice !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(rawPrice.trim())) {
    throw new Error("Structured offer price is missing or not a plain numeric MAD amount");
  }
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Structured offer price must be positive");

  const availabilityValue = typeof offer.availability === "string" ? offer.availability : "";
  const availabilityToken = availabilityValue.split(/[\/#]/u).at(-1)?.toLowerCase();
  const availability = availabilityToken === "instock"
    ? "in_stock"
    : availabilityToken === "outofstock" || availabilityToken === "soldout"
      ? "out_of_stock"
      : availabilityToken === "limitedavailability"
        ? "low_stock"
        : "unknown";

  return { name: product.name.trim(), price, currency, availability };
}

export function assertPermittedResponse(response, html) {
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new Error(`Retailer denied automated access (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`Retailer returned HTTP ${response.status}`);
  if (!/^text\/html(?:\s*;|$)/iu.test(response.headers.get("content-type") ?? "")) {
    throw new Error("Retailer response is not HTML");
  }
  if (/captcha|verify you are human|robot check|access denied/iu.test(html)) {
    throw new Error("Retailer response appears to be an access challenge");
  }
}
