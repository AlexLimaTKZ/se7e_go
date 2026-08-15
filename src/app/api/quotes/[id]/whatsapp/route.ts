import { NextRequest, NextResponse } from "next/server";
import { buildQuoteShareText, buildWhatsAppUrl, isAppleMobileDevice } from "@/lib/pdf/share";
import { loadSavedQuoteInput } from "@/lib/quotes/saved-quote";
import { createQuoteShareToken } from "@/lib/quotes/share-token";

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
    if (!quoteId) return NextResponse.json({ error: "ID invalido." }, { status: 400 });

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Compartilhamento indisponivel." }, { status: 503 });
    }

    const quote = await loadSavedQuoteInput(quoteId);
    if (!quote) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }

    const token = await createQuoteShareToken(quoteId, secret);
    const shareUrl = new URL(`/compartilhar/orcamento/${quoteId}`, request.nextUrl.origin);
    shareUrl.searchParams.set("token", token);

    const message = `${buildQuoteShareText(quote.client.name, quote.quoteNumber)}\n\n📄 Visualizar orçamento:\n${shareUrl.toString()}`;
    const whatsAppUrl = buildWhatsAppUrl(quote.client.phone, message, {
      preferLegacyBrazilianMobile: isAppleMobileDevice({
        userAgent: request.headers.get("user-agent") || "",
      }),
    });

    if (!whatsAppUrl) {
      return NextResponse.json(
        { error: "Cadastre um celular valido para o cliente antes de compartilhar." },
        { status: 422 },
      );
    }

    return NextResponse.redirect(whatsAppUrl, 307);
  } catch (error) {
    console.error("Erro ao preparar compartilhamento no WhatsApp:", error);
    return NextResponse.json(
      { error: "Nao foi possivel preparar o compartilhamento." },
      { status: 500 },
    );
  }
}
