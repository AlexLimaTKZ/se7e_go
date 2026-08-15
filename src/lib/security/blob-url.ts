const PUBLIC_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isAllowedPublicBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.hostname.length > PUBLIC_BLOB_HOST_SUFFIX.length &&
      url.hostname.endsWith(PUBLIC_BLOB_HOST_SUFFIX)
    );
  } catch {
    return false;
  }
}
