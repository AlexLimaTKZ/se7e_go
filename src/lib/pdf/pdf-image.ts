import sharp from "sharp";
import { get } from "@vercel/blob";
import { isAllowedPublicBlobUrl } from "@/lib/security/blob-url";

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 8_000;

export interface PdfImageSource {
  data: Buffer;
  format: "jpg" | "png";
}

export function isAllowedPdfImageUrl(value: string): boolean {
  if (isAllowedPublicBlobUrl(value)) return true;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export async function fetchOptimizedPdfImage(value: string): Promise<PdfImageSource | null> {
  if (!value || !isAllowedPdfImageUrl(value)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    let source: Buffer;
    if (isAllowedPublicBlobUrl(value)) {
      const result = await get(value, {
        access: "public",
        abortSignal: controller.signal,
      });
      if (
        !result ||
        result.statusCode !== 200 ||
        !result.blob.contentType.toLowerCase().startsWith("image/") ||
        result.blob.size > MAX_SOURCE_IMAGE_BYTES
      ) {
        return null;
      }
      source = Buffer.from(await new Response(result.stream).arrayBuffer());
    } else {
      const response = await fetch(value, {
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
        return null;
      }
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_SOURCE_IMAGE_BYTES) return null;
      source = Buffer.from(await response.arrayBuffer());
    }

    if (source.byteLength === 0 || source.byteLength > MAX_SOURCE_IMAGE_BYTES) return null;

    const data = await sharp(source, { animated: false })
      .rotate()
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 72, progressive: true, mozjpeg: true })
      .toBuffer();
    return { data, format: "jpg" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
