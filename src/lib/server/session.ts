import { SESSION_COOKIE, SESSION_TTL_MS, envAdminCredentials, getAuthSecret } from "./config";
import { hashPassword, normalizeEmail, safeEqualString, verifyPassword } from "./crypto";
import {
  claimFirstAdmin,
  countPasswordedAdmins,
  findAdminByEmail,
  insertAdminAccount,
  listPublicAdmins,
  releaseFirstAdminClaim,
  updateAdminPassword,
  type PublicAdmin,
} from "./repo";

export type AdminSession = { email: string };

async function cookieApi() {
  return import("@tanstack/react-start/server");
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const { getCookie } = await cookieApi();
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const secret = await getAuthSecret();
  const { decodeSession } = await import("./crypto");
  return decodeSession(secret, token);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await readAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function writeAdminSession(email: string): Promise<void> {
  const { setCookie } = await cookieApi();
  const secret = await getAuthSecret();
  const { encodeSession } = await import("./crypto");
  const token = encodeSession(secret, email, SESSION_TTL_MS);
  setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearAdminSession(): Promise<void> {
  const { setCookie } = await cookieApi();
  setCookie(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function adminNeedsSetup(): Promise<boolean> {
  return (await countPasswordedAdmins()) === 0;
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const normalized = normalizeEmail(email);
  const invalid = (): never => {
    throw new Error("Invalid email or password");
  };
  const row = await findAdminByEmail(normalized);
  if (row?.passwordHash) {
    if (!(await verifyPassword(password, row.passwordHash))) invalid();
    return { email: row.email };
  }
  const envCreds = envAdminCredentials();
  if (
    envCreds &&
    safeEqualString(envCreds.email, normalized) &&
    safeEqualString(envCreds.password, password)
  ) {
    const hash = await hashPassword(password);
    await insertAdminAccount({
      email: envCreds.email,
      name: "Operator",
      passwordHash: hash,
      allowReplaceEmpty: true,
    });
    await claimFirstAdmin(envCreds.email);
    return { email: envCreds.email };
  }
  return invalid();
}

export async function signupFirstAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AdminSession> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || "Operator";
  if (await countPasswordedAdmins()) {
    throw new Error("An admin account already exists. Sign in instead.");
  }
  const claimed = await claimFirstAdmin(email);
  if (!claimed) {
    throw new Error("An admin account already exists. Sign in instead.");
  }
  try {
    const passwordHash = await hashPassword(input.password);
    await insertAdminAccount({
      email,
      name,
      passwordHash,
      allowReplaceEmpty: true,
    });
  } catch (err) {
    await releaseFirstAdminClaim();
    throw err;
  }
  return { email };
}

export async function createOperator(
  input: { name: string; email: string; password: string },
  actor: string,
): Promise<PublicAdmin> {
  const email = normalizeEmail(input.email);
  const existing = await findAdminByEmail(email);
  if (existing?.passwordHash) throw new Error("That email is already an operator.");
  const passwordHash = await hashPassword(input.password);
  return insertAdminAccount({
    email,
    name: input.name.trim() || "Operator",
    passwordHash,
    allowReplaceEmpty: true,
    actor,
  });
}

export async function changeOwnPassword(email: string, current: string, next: string): Promise<void> {
  const row = await findAdminByEmail(normalizeEmail(email));
  if (!row?.passwordHash) throw new Error("Account not found");
  if (!(await verifyPassword(current, row.passwordHash))) throw new Error("Current password is incorrect");
  await updateAdminPassword(row.email, await hashPassword(next));
}

export async function listOperators(): Promise<PublicAdmin[]> {
  return listPublicAdmins();
}
