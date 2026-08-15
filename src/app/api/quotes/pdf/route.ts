import { NextResponse } from "next/server";
import { buildQuotePdfFilename } from "@/lib/pdf/share";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";
import { parseQuoteInput } from "@/lib/quotes/quote-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

function requestTooLargeResponse(): Response {
  return NextResponse.json(
    { error: "O orçamento é grande demais para gerar o PDF." },
    { status: 413 },
  );
}

async function readJsonBody(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: Response }
> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { ok: false, response: requestTooLargeResponse() };
  }

  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { ok: false, response: requestTooLargeResponse() };
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  }

  try {
    return { ok: true, value: JSON.parse(chunks.join("")) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "O corpo da requisição não contém um JSON válido." },
        { status: 400 },
      ),
    };
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;

    const parsed = parseQuoteInput(body.value);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Revise os dados antes de gerar o PDF.", issues: parsed.issues },
        { status: 422 },
      );
    }

    const pdf = await renderQuotePdf(parsed.data);
    const filename = buildQuotePdfFilename(parsed.data.quoteNumber, parsed.data.client.name);
    const responseBody = Uint8Array.from(pdf).buffer;
    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF. Tente novamente." },
      { status: 500 },
    );
  }
}
