import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeSession,
  encodeSession,
  hashPassword,
  normalizeEmail,
  safeEqualString,
  verifyPassword,
} from "./crypto.ts";

test("safeEqualString matches equal secrets", () => {
  assert.equal(safeEqualString("alpha", "alpha"), true);
  assert.equal(safeEqualString("alpha", "beta"), false);
});

test("session tokens round-trip and expire", () => {
  const secret = "unit-test-secret";
  const token = encodeSession(secret, "admin@checkmypc.ma", 60_000);
  assert.deepEqual(decodeSession(secret, token), { email: "admin@checkmypc.ma" });
  assert.equal(decodeSession("other", token), null);
  const expired = encodeSession(secret, "admin@checkmypc.ma", -1);
  assert.equal(decodeSession(secret, expired), null);
});

test("password hashes verify and reject mismatches", async () => {
  const hash = await hashPassword("CheckMyPC-Admin1");
  assert.match(hash, /^scrypt:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(await verifyPassword("CheckMyPC-Admin1", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword("CheckMyPC-Admin1", "not-a-hash"), false);
});

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Owner@CheckMyPC.ma "), "owner@checkmypc.ma");
});
