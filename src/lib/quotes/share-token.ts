interface QuoteShareTokenOptions {
  now?: number;
  nonce?: string;
  ttlSeconds?: number;
}

interface VerifyQuoteShareTokenOptions {
  now?: number;
}

interface QuoteSharePayload {
  exp: number;
  iat: number;
  nonce: string;
  quoteId: number;
}

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToString(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

async function sign(encodedPayload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`quote-share.${encodedPayload}`),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createQuoteShareToken(
  quoteId: number,
  secret: string,
  options: QuoteShareTokenOptions = {},
): Promise<string> {
  if (!Number.isInteger(quoteId) || quoteId <= 0) throw new Error("ID de orcamento invalido.");
  if (!secret) throw new Error("AUTH_SECRET nao foi configurado.");

  const now = options.now ?? Date.now();
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const payload: QuoteSharePayload = {
    quoteId,
    iat: now,
    exp: now + ttlSeconds * 1_000,
    nonce: options.nonce ?? crypto.randomUUID(),
  };
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyQuoteShareToken(
  token: string,
  quoteId: number,
  secret: string,
  options: VerifyQuoteShareTokenOptions = {},
): Promise<boolean> {
  try {
    if (!token || !secret || !Number.isInteger(quoteId) || quoteId <= 0) return false;
    const [encodedPayload, providedSignature, extra] = token.split(".");
    if (!encodedPayload || !providedSignature || extra) return false;

    const expectedSignature = await sign(encodedPayload, secret);
    if (!constantTimeEqual(providedSignature, expectedSignature)) return false;

    const payload = JSON.parse(base64UrlToString(encodedPayload)) as QuoteSharePayload;
    const now = options.now ?? Date.now();
    return (
      payload.quoteId === quoteId &&
      Number.isFinite(payload.iat) &&
      Number.isFinite(payload.exp) &&
      typeof payload.nonce === "string" &&
      payload.nonce.length > 0 &&
      payload.iat <= now &&
      payload.exp > now
    );
  } catch {
    return false;
  }
}
