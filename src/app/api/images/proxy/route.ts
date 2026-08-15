import { NextRequest, NextResponse } from "next/server";
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
    const res = await fetch(url, { redirect: "error" });

    if (!res.ok) {
      return new NextResponse(`Error fetching from blob: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Invalid upstream content", { status: 415 });
    }
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(res.body, { headers });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
