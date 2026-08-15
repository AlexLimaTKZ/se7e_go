import { createSessionToken, verifySessionToken } from "./security/auth-token";

const encoder = new TextEncoder();

function getSessionSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || null;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function passwordMatches(candidate: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !candidate) return false;

  const [candidateDigest, expectedDigest] = await Promise.all([
    digest(candidate),
    digest(expected),
  ]);
  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= candidateDigest[index] ^ expectedDigest[index];
  }
  return difference === 0;
}

export async function createAuthToken(): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("APP_PASSWORD ou AUTH_SECRET nao foi configurado.");
  return createSessionToken(secret);
}

export async function verifyToken(token: string): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret) return false;
  return verifySessionToken(token, secret);
}
