import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import pg from "pg";
import { PRICE_SOURCES } from "./price-sources.mjs";
import { assertPermittedResponse, parseJsonLdProduct } from "./price-parser.mjs";

const USER_AGENT = "CHECKMYPC-PriceTracker/1.0";
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 15_000;
const RETAILER_HOSTS = new Set(PRICE_SOURCES.map((source) => new URL(source.url).hostname));
const schemaPreflightToken = Symbol("verified-price-tracking-schema");

function robotsMatch(path, rule) {
  if (!rule) return false;
  const anchored = rule.value.endsWith("$");
  const value = anchored ? rule.value.slice(0, -1) : rule.value;
  const escaped = value.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*");
  const expression = new RegExp(`^${escaped}${anchored ? "" : ".*"}$`, "u");
  return expression.test(path);
}

export function applicableRobotsGroups(text, userAgent) {
  const groups = [];
  let group = null;
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) throw new Error("Malformed robots policy line");
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (directive === "user-agent") {
      if (!value) throw new Error("Robots policy has an empty user-agent");
      if (!group || group.hasRules) {
        group = { agents: [], rules: [], crawlDelay: [], hasRules: false };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if (group && (directive === "allow" || directive === "disallow")) {
      group.hasRules = true;
      if (value) group.rules.push({ allow: directive === "allow", value });
    } else if (group && directive === "crawl-delay") {
      group.hasRules = true;
      const delay = Number(value);
      if (!value || !Number.isFinite(delay) || delay < 0) throw new Error("Invalid robots crawl-delay");
      group.crawlDelay.push(delay);
    } else if (!group && ["allow", "disallow", "crawl-delay"].includes(directive)) {
      throw new Error("Robots rule appears before a user-agent group");
    }
  }
  if (!groups.length) throw new Error("Robots policy contains no user-agent groups");
  const agent = userAgent.toLowerCase();
  const matches = groups
    .map((candidate) => ({
      candidate,
      specificity: Math.max(
        -1,
        ...candidate.agents.map((name) => (name !== "*" && agent.startsWith(name) ? name.length : -1)),
      ),
    }))
    .filter(({ specificity }) => specificity >= 0);
  const mostSpecific = Math.max(-1, ...matches.map(({ specificity }) => specificity));
  if (mostSpecific > 0) {
    return matches.filter(({ specificity }) => specificity === mostSpecific).map(({ candidate }) => candidate);
  }
  return matches.filter(({ specificity }) => specificity === 0).map(({ candidate }) => candidate);
}

export function robotsAllows(text, pathname, userAgent) {
  const rules = applicableRobotsGroups(text, userAgent).flatMap((candidate) => candidate.rules)
    .filter((rule) => robotsMatch(pathname, rule))
    .sort((a, b) => b.value.length - a.value.length || Number(b.allow) - Number(a.allow));
  return rules.length === 0 || rules[0].allow;
}

function robotsCrawlDelay(text, userAgent) {
  const delays = applicableRobotsGroups(text, userAgent)
    .flatMap((group) => group.crawlDelay ?? [])
    .filter((value) => Number.isFinite(value) && value >= 0);
  return delays.length ? Math.max(...delays) * 1000 : 1_500;
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

export function isAllowedRetailerUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      RETAILER_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port;
  } catch {
    return false;
  }
}

export async function fetchPermittedUrl(value, init, fetchImpl = fetch) {
  if (!isAllowedRetailerUrl(value)) {
    throw new Error("Retailer request URL is outside the configured HTTPS hosts");
  }
  const response = await fetchImpl(value, { ...init, redirect: "error" });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("Retailer redirect refused");
  }
  return response;
}

async function boundedText(response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    throw new Error("Retailer response exceeds the size limit");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Retailer response has no body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Retailer response exceeds the size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchRobots(url, fetchImpl) {
  const robotsUrl = new URL("/robots.txt", url);
  const response = await fetchPermittedUrl(robotsUrl, {
    headers: { "user-agent": USER_AGENT, accept: "text/plain" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }, fetchImpl);
  if (response.status === 404) return { text: "", delayMs: 1_500, allowAll: true };
  if (!response.ok) throw new Error(`Retailer robots policy unavailable (HTTP ${response.status})`);
  if (!/^text\/plain(?:\s*;|$)/iu.test(response.headers.get("content-type") ?? "")) {
    throw new Error("Retailer robots policy has an unexpected content type");
  }
  const text = await boundedText(response);
  if (/<!doctype\s+html|<html\b|<body\b|captcha|verify you are human|robot check|access denied/iu.test(text)) {
    throw new Error("Retailer robots response is an HTML challenge or error page");
  }
  const groups = applicableRobotsGroups(text, USER_AGENT);
  if (!groups.length) throw new Error("Retailer robots policy has no applicable user-agent group");
  return { text, delayMs: robotsCrawlDelay(text, USER_AGENT) };
}

export async function fetchProduct(source, robotsPolicies, lastRequests, fetchImpl, verifiedSchema) {
  if (verifiedSchema !== schemaPreflightToken) {
    throw new Error("Price tracking schema preflight is required before product fetch");
  }
  const url = new URL(source.url);
  if (!isAllowedRetailerUrl(source.url)) {
    throw new Error("Retailer source URL is outside the configured HTTPS hosts");
  }
  let policy = robotsPolicies.get(url.origin);
  if (policy === undefined) {
    policy = fetchRobots(url, fetchImpl);
    robotsPolicies.set(url.origin, policy);
  }
  policy = await policy;
  if (!policy.allowAll && !robotsAllows(policy.text, `${url.pathname}${url.search}`, USER_AGENT)) {
    throw new Error("Retailer robots policy disallows this product page");
  }
  const lastRequestAt = lastRequests.get(url.origin) ?? 0;
  await sleep(Math.max(0, policy.delayMs - (Date.now() - lastRequestAt)));
  lastRequests.set(url.origin, Date.now());

  const response = await fetchPermittedUrl(source.url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }, fetchImpl);
  const html = await boundedText(response);
  assertPermittedResponse(response, html);
  return parseJsonLdProduct(html, source);
}

async function verifyTrackingSchema(sql) {
  let result;
  try {
    result = await sql.query(
      `select to_regclass('price_observations') as observations_table,
              to_regclass('price_collection_runs') as runs_table`,
    );
  } catch {
    throw new Error("Price tracking schema preflight failed; verify the deployment migration");
  }
  const tables = result.rows?.[0];
  if (!tables?.observations_table || !tables?.runs_table) {
    throw new Error("Price tracking schema is incomplete; deploy migration 0004 before collection");
  }
  return schemaPreflightToken;
}

async function recordObservation(sql, runId, source, result, error) {
  await sql.query(
    `insert into price_observations (
      run_id, source_id, catalog_product_id, store, source_url, observed_name,
      price, currency, availability, outcome, error
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      runId,
      source.id,
      source.catalogProductId,
      source.store,
      source.url,
      result?.name ?? null,
      result?.price ?? null,
      result?.currency ?? null,
      result?.availability ?? "unknown",
      error ? "failure" : "success",
      error ? error.message.slice(0, 500) : null,
    ],
  );
}

export async function collectPrices({
  connectionString = process.env.DATABASE_URL,
  poolFactory = (options) => new pg.Pool(options),
  fetchImpl = fetch,
} = {}) {
  if (!connectionString?.trim()) throw new Error("DATABASE_URL is required");

  const pool = poolFactory({ connectionString, max: 1 });
  const runId = randomUUID();
  const counts = { success: 0, failure: 0, unmapped: 0 };
  const robotsPolicies = new Map();
  const lastRequests = new Map();
  let runCreated = false;
  try {
    const verifiedSchema = await verifyTrackingSchema(pool);
    await pool.query(
      `insert into price_collection_runs (id, requested_count) values ($1, $2)`,
      [runId, PRICE_SOURCES.length],
    );
    runCreated = true;
    for (const source of PRICE_SOURCES) {
      let result;
      let error;
      try {
        result = await fetchProduct(source, robotsPolicies, lastRequests, fetchImpl, verifiedSchema);
      } catch (caught) {
        error = caught instanceof Error ? caught : new Error("Unknown collection error");
      }

      await recordObservation(pool, runId, source, result, error);
      if (error) {
        counts.failure += 1;
        console.error(`[price-collector] failure ${source.id}: ${error.message}`);
      } else {
        counts.success += 1;
        if (!source.catalogProductId) counts.unmapped += 1;
        console.log(
          `[price-collector] success ${source.id}: ${result.availability}; ${source.catalogProductId ? "catalog-linked" : "unmapped, stored separately"}`,
        );
      }
    }

    const status = counts.failure === 0 && counts.unmapped === 0 ? "completed" : "partial";
    await pool.query(
      `update price_collection_runs
       set finished_at = now(), status = $2, success_count = $3,
           failure_count = $4, unmapped_count = $5
       where id = $1`,
      [runId, status, counts.success, counts.failure, counts.unmapped],
    );
    console.log(`[price-collector] run ${runId}: ${status}`);
    return { runId, status, ...counts };
  } catch (error) {
    if (runCreated) {
      await pool.query(
        `update price_collection_runs set finished_at = now(), status = 'failed' where id = $1`,
        [runId],
      ).catch(() => {});
    }
    throw error;
  } finally {
    await pool.end();
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry && import.meta.url === pathToFileURL(entry).href) {
  collectPrices().catch((error) => {
    console.error(`[price-collector] run failed: ${error.message}`);
    process.exitCode = 1;
  });
}
