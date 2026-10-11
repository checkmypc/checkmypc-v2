#!/usr/bin/env node
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, "src", "data", "catalog.json");
const manifestPath = join(root, "public", "parts", "products", "manifest.json");
const sourcePath = join(root, "scripts", "product-image-sources.json");
const maxImageBytes = 20 * 1024 * 1024;
const trustedDomains = [
  "amd.com",
  "intel.com",
  "asus.com",
  "msi.com",
  "gigabyte.com",
  "asrock.com",
  "deepcool.com",
  "corsair.com",
  "gskill.com",
  "kingston.com",
  "crucial.com",
  "lexar.com",
  "samsung.com",
  "westerndigital.com",
  "seagate.com",
  "nvidia.com",
  "sapphiretech.com",
  "arctic.de",
  "noctua.at",
  "lian-li.com",
  "fractal-design.com",
  "coolermaster.com",
  "seasonic.com",
  "lg.com",
  "logitech.com",
  "aoc.com",
  "fifine.com",
  "steelseries.com",
  "apc.com",
  "keychron.com",
  "redragonzone.com",
  "ultrapc.ma",
  "pcgamermaroc.ma",
  "matrixinformatique.ma",
  "setupgame.ma",
  "iris.ma",
  "jumia.ma",
];

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON`, { cause: error });
  }
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function trustedHttpsUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS`);
  const trusted = trustedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  if (!trusted) throw new Error(`${label} host is not an approved manufacturer or retailer`);
  return url;
}

function imageType(buffer, contentType) {
  if (buffer.length > maxImageBytes) throw new Error("Image exceeds the 20 MB limit");
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (
    type === "image/png" &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }
  if (
    type === "image/webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  throw new Error("Source did not return a valid JPEG, PNG, or WebP image");
}

async function fetchOk(url, label) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response;
}

async function hasExistingPhoto(productId, paths) {
  for (const path of paths) {
    if (
      typeof path !== "string" ||
      !path.startsWith(`/parts/products/${productId}/`) ||
      path.split("/").some((part) => part === "." || part === "..")
    ) {
      continue;
    }
    try {
      await access(join(root, "public", path.replace(/^\/+/, "").replaceAll("/", "\\")));
      return true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return false;
}

async function main() {
  const [catalogText, manifestText, sourceText] = await Promise.all([
    readFile(catalogPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(sourcePath, "utf8"),
  ]);
  const catalog = parseJson(catalogText, "src/data/catalog.json");
  const manifest = parseJson(manifestText, "public/parts/products/manifest.json");
  const sourceFile = parseJson(sourceText, "scripts/product-image-sources.json");
  if (!Array.isArray(sourceFile.sources)) throw new Error("Image source file must contain a sources array");
  if (sourceFile.sources.length === 0) {
    throw new Error("No exact-model image sources are verified yet; refusing to guess image URLs.");
  }

  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const seen = new Set();
  const downloads = [];

  for (const source of sourceFile.sources) {
    if (
      typeof source.productId !== "string" ||
      typeof source.productName !== "string" ||
      typeof source.productPageUrl !== "string" ||
      typeof source.imageUrl !== "string"
    ) {
      throw new Error("Each image source must include productId, productName, productPageUrl, and imageUrl");
    }
    const product = products.get(source.productId);
    if (!product) throw new Error(`Unknown product id: ${source.productId}`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(product.id)) throw new Error(`Unsafe product id: ${product.id}`);
    if (seen.has(source.productId)) throw new Error(`Duplicate source record for ${source.productId}`);
    seen.add(source.productId);
    if (normalize(source.productName) !== normalize(product.name)) {
      throw new Error(`Source name does not exactly match catalog product ${source.productId}`);
    }
    const priorPaths = manifest.manifest[product.id] ?? [];
    if (await hasExistingPhoto(product.id, priorPaths)) {
      console.log(`Skipped ${product.name}: a local product photo already exists`);
      continue;
    }

    const pageUrl = trustedHttpsUrl(source.productPageUrl, `${source.productId} product page`);
    const imageUrl = new URL(source.imageUrl);
    if (imageUrl.protocol !== "https:") throw new Error(`${source.productId} image URL must use HTTPS`);

    const pageResponse = await fetchOk(pageUrl, `${source.productId} product page`);
    trustedHttpsUrl(pageResponse.url, `${source.productId} redirected product page`);
    const pageHtml = await pageResponse.text();
    const searchablePage = normalize(pageHtml.replace(/<[^>]*>/g, " "));
    if (!searchablePage.includes(normalize(product.name))) {
      throw new Error(`${source.productId} page does not identify the exact catalog model`);
    }
    if (!pageHtml.toLowerCase().includes(imageUrl.href.toLowerCase())) {
      throw new Error(`${source.productId} image URL is not referenced by its verified product page`);
    }

    const imageResponse = await fetchOk(imageUrl, `${source.productId} image`);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const extension = imageType(buffer, imageResponse.headers.get("content-type") ?? "");
    downloads.push({ product, imageUrl, buffer, extension });
  }

  for (const download of downloads) {
    const { product, buffer, extension } = download;
    const directory = join(root, "public", "parts", "products", product.id);
    const imagePath = join(directory, `01.${extension}`);
    const publicPath = `/parts/products/${product.id}/01.${extension}`;
    const priorPaths = manifest.manifest[product.id] ?? [];
    const retainedPaths = [];
    for (const path of priorPaths) {
      if (
        typeof path !== "string" ||
        !path.startsWith(`/parts/products/${product.id}/`) ||
        path.split("/").some((part) => part === "." || part === "..")
      ) {
        continue;
      }
      try {
        await access(join(root, "public", path.replace(/^\/+/, "").replaceAll("/", "\\")));
        if (path !== publicPath) retainedPaths.push(path);
      } catch {
        continue;
      }
    }
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `.01.${extension}.tmp`), buffer);
    await rename(join(directory, `.01.${extension}.tmp`), imagePath);
    manifest.manifest[product.id] = [publicPath, ...retainedPaths.filter((path) => path !== publicPath)];
    console.log(`Downloaded ${product.name}: ${publicPath}`);
  }

  const temporaryManifest = `${manifestPath}.tmp`;
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryManifest, manifestPath);
}

main().catch((error) => {
  console.error(`[download-product-images] ${error.message}`);
  process.exitCode = 1;
});
