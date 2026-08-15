const PUBLIC_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const PRIVATE_BLOB_HOST_SUFFIX = ".private.blob.vercel-storage.com";

export type VercelBlobAccess = "public" | "private";

export function getVercelBlobAccess(value: string): VercelBlobAccess | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }

    if (
      url.hostname.length > PUBLIC_BLOB_HOST_SUFFIX.length &&
      url.hostname.endsWith(PUBLIC_BLOB_HOST_SUFFIX)
    ) {
      return "public";
    }

    if (
      url.hostname.length > PRIVATE_BLOB_HOST_SUFFIX.length &&
      url.hostname.endsWith(PRIVATE_BLOB_HOST_SUFFIX)
    ) {
      return "private";
    }

    return null;
  } catch {
    return null;
  }
}

export function isAllowedVercelBlobUrl(value: string): boolean {
  return getVercelBlobAccess(value) !== null;
}

export function isAllowedPublicBlobUrl(value: string): boolean {
  return getVercelBlobAccess(value) === "public";
}
