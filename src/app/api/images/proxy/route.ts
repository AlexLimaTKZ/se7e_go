import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { isAllowedPublicBlobUrl } from "@/lib/security/blob-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedPublicBlobUrl(url)) {
    return new NextResponse("Invalid URL", { status: 403 });
  }

  try {
    const result = await get(url, {
      access: "public",
      abortSignal: request.signal,
    });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const contentType = result.blob.contentType || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Invalid upstream content", { status: 415 });
    }
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(result.stream, { headers });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
