import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { loadSavedQuoteInput } from "@/lib/quotes/saved-quote";
import { verifyQuoteShareToken } from "@/lib/quotes/share-token";
import { getVercelBlobAccess } from "@/lib/security/blob-url";

export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const value = Number.parseInt(id, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const quoteId = parseId((await params).id);
    const token = request.nextUrl.searchParams.get("token") || "";
    const url = request.nextUrl.searchParams.get("url") || "";
    const secret = process.env.AUTH_SECRET || "";

    if (!quoteId || !url || !(await verifyQuoteShareToken(token, quoteId, secret))) {
      return new NextResponse("Imagem indisponível.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const quote = await loadSavedQuoteInput(quoteId);
    if (!quote || !quote.items.some((item) => item.imageUrl === url)) {
      return new NextResponse("Imagem indisponível.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const blobAccess = getVercelBlobAccess(url);
    if (!blobAccess) {
      return new NextResponse("Imagem indisponível.", { status: 404 });
    }

    const result = await get(url, {
      access: blobAccess,
      abortSignal: request.signal,
    });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Imagem indisponível.", { status: 404 });
    }

    const contentType = result.blob.contentType || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Conteúdo inválido.", { status: 415 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error("Erro ao abrir imagem de orçamento compartilhado:", error);
    return new NextResponse("Imagem indisponível.", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
