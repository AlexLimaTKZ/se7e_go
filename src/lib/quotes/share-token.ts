interface QuoteShareTokenOptions {
  now?: number;
  nonce?: string;
  ttlSeconds?: number;
}

interface QuoteShareCodeOptions {
  now?: number;
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
const SHORT_SIGNATURE_BYTES = 10;
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

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return new Uint8Array(signature);
}

async function sign(encodedPayload: string, secret: string): Promise<string> {
  return bytesToBase64Url(await hmac(`quote-share.${encodedPayload}`, secret));
}

async function signShort(payload: string, secret: string): Promise<string> {
  const signature = await hmac(`quote-share-short.${payload}`, secret);
  return bytesToBase64Url(signature.slice(0, SHORT_SIGNATURE_BYTES));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function parseBase36Integer(value: string): number | null {
  if (!/^[0-9a-z]+$/u.test(value)) return null;
  const parsed = Number.parseInt(value, 36);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed.toString(36) !== value) return null;
  return parsed;
}

export function getQuoteIdFromShareCode(code: string): number | null {
  const [quotePart, expiresPart, signature, extra] = code.split(".");
  if (!quotePart || !expiresPart || !signature || extra) return null;
  if (!/^[A-Za-z0-9_-]{14}$/u.test(signature)) return null;
  if (!parseBase36Integer(expiresPart)) return null;
  return parseBase36Integer(quotePart);
}

export async function createQuoteShareCode(
  quoteId: number,
  secret: string,
  options: QuoteShareCodeOptions = {},
): Promise<string> {
  if (!Number.isInteger(quoteId) || quoteId <= 0) throw new Error("ID de orcamento invalido.");
  if (!secret) throw new Error("AUTH_SECRET nao foi configurado.");

  const now = options.now ?? Date.now();
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAtMinute = Math.floor((now + ttlSeconds * 1_000) / 60_000);
  const payload = `${quoteId.toString(36)}.${expiresAtMinute.toString(36)}`;
  const signature = await signShort(payload, secret);
  return `${payload}.${signature}`;
}

async function verifyQuoteShareCode(
  code: string,
  quoteId: number,
  secret: string,
  options: VerifyQuoteShareTokenOptions = {},
): Promise<boolean> {
  const [quotePart, expiresPart, providedSignature, extra] = code.split(".");
  if (!quotePart || !expiresPart || !providedSignature || extra) return false;
  if (!/^[A-Za-z0-9_-]{14}$/u.test(providedSignature)) return false;

  const encodedQuoteId = parseBase36Integer(quotePart);
  const expiresAtMinute = parseBase36Integer(expiresPart);
  if (!encodedQuoteId || !expiresAtMinute || encodedQuoteId !== quoteId) return false;

  const payload = `${quotePart}.${expiresPart}`;
  const expectedSignature = await signShort(payload, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return false;

  const now = options.now ?? Date.now();
  return expiresAtMinute * 60_000 > now;
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

    if (token.split(".").length === 3) {
      return verifyQuoteShareCode(token, quoteId, secret, options);
    }

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
