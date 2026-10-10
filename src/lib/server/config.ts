import { randomBytes } from "node:crypto";
import { env } from "@/lib/env.server";

export function envAdminCredentials(): { email: string; password: string } | null {
  const email = env("ADMIN_EMAIL")?.trim().toLowerCase();
  const password = env("ADMIN_PASSWORD");
  if (!email || !password || password.length < 8) return null;
  return { email, password };
}

export async function getAuthSecret(): Promise<string> {
  const fromEnv = env("AUTH_SECRET");
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const existing = await sql<{ value: string }>`select value from app_meta where key = ${"auth_secret"}`;
  if (existing[0]?.value) return existing[0].value;
  const generated = randomBytes(48).toString("hex");
  await sql.query(`insert into app_meta (key, value) values ($1, $2) on conflict (key) do nothing`, [
    "auth_secret",
    generated,
  ]);
  const again = await sql<{ value: string }>`select value from app_meta where key = ${"auth_secret"}`;
  return again[0]?.value || generated;
}

export function publicSiteUrl(): string {
  return (env("SITE_URL") || env("VITE_PUBLIC_HOSTNAME") || "").replace(/\/$/, "");
}

export const SESSION_COOKIE = "cmp_admin_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const ADMIN_OWNER_META = "admin_owner";
