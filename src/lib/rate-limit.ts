import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { loginAttempts } from "./db/schema";

const MAX_FAILURES = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1_000;
const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1_000;
let tableReady: Promise<void> | undefined;

function ensureTable(): Promise<void> {
  tableReady ??= getDb()
    .run(sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        ip_hash TEXT PRIMARY KEY NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        blocked_until INTEGER,
        updated_at INTEGER NOT NULL
      )
    `)
    .then(() => undefined);
  return tableReady;
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function blockedMessage(blockedUntil: number, now: number): string {
  const minutes = Math.max(1, Math.ceil((blockedUntil - now) / 60_000));
  return `Muitas tentativas. Tente novamente em ${minutes} min.`;
}

export async function getRateLimitStatus(
  ip: string,
): Promise<{ blocked: boolean; message?: string }> {
  await ensureTable();
  const now = Date.now();
  const ipHash = await hashIp(ip);
  const [attempt] = await getDb()
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, ipHash))
    .limit(1);

  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return { blocked: true, message: blockedMessage(attempt.blockedUntil, now) };
  }
  if (attempt && attempt.updatedAt < now - ATTEMPT_RETENTION_MS) {
    await getDb().delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
  }
  return { blocked: false };
}

export async function registerFailedLogin(
  ip: string,
): Promise<{ blocked: boolean; message?: string }> {
  await ensureTable();
  const now = Date.now();
  const ipHash = await hashIp(ip);

  return getDb().transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.ipHash, ipHash))
      .limit(1);
    const currentCount =
      current && current.updatedAt >= now - ATTEMPT_RETENTION_MS ? current.count : 0;
    const count = currentCount + 1;
    const blockedUntil = count >= MAX_FAILURES ? now + BLOCK_DURATION_MS : null;

    await transaction
      .insert(loginAttempts)
      .values({ ipHash, count, blockedUntil, updatedAt: now })
      .onConflictDoUpdate({
        target: loginAttempts.ipHash,
        set: { count, blockedUntil, updatedAt: now },
      });

    return blockedUntil
      ? { blocked: true, message: blockedMessage(blockedUntil, now) }
      : { blocked: false };
  });
}

export async function resetLoginAttempts(ip: string): Promise<void> {
  await ensureTable();
  const ipHash = await hashIp(ip);
  await getDb().delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
