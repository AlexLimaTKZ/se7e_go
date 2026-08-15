import { NextRequest, NextResponse } from "next/server";
import { buildQuotePdfFilename } from "@/lib/pdf/share";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";
import { loadSavedQuoteInput } from "@/lib/quotes/saved-quote";
import { verifyQuoteShareToken } from "@/lib/quotes/share-token";

export const runtime = "nodejs";
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
    const secret = process.env.AUTH_SECRET || "";

    if (!quoteId || !(await verifyQuoteShareToken(token, quoteId, secret))) {
      return new NextResponse("Link de orçamento inválido ou expirado.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const quote = await loadSavedQuoteInput(quoteId);
    if (!quote) {
      return new NextResponse("Orçamento não encontrado.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const pdf = await renderQuotePdf(quote);
    const filename = buildQuotePdfFilename(quote.quoteNumber, quote.client.name);
    const body = Uint8Array.from(pdf).buffer;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error("Erro ao abrir orçamento compartilhado:", error);
    return NextResponse.json(
      { error: "Não foi possível abrir o orçamento." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
