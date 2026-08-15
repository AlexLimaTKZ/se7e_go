import type { Metadata } from "next";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { loadSavedQuoteInput } from "@/lib/quotes/saved-quote";
import { verifyQuoteShareToken } from "@/lib/quotes/share-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orçamento | SE7E Alumínio",
  robots: { index: false, follow: false, nocache: true },
};

function parseId(id: string): number | null {
  const value = Number.parseInt(id, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }
  return value;
}

function measurement(value: number | null): string {
  if (value === null) return "—";
  return `${String(value).replace(".", ",")} mm`;
}

function dimensionMeasurement(width: number | null, height: number | null): string {
  if (width === null && height === null) return "—";
  const normalizedWidth = width === null ? "—" : String(width).replace(".", ",");
  const normalizedHeight = height === null ? "—" : String(height).replace(".", ",");
  return `${normalizedWidth} × ${normalizedHeight} mm`;
}

function InvalidShare() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <FileText className="mx-auto mb-4 size-10 text-slate-400" />
        <h1 className="text-xl font-bold">Orçamento indisponível</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Este link é inválido, expirou ou o orçamento não está mais disponível. Solicite um novo link à SE7E Alumínio.
        </p>
      </section>
    </main>
  );
}

export default async function SharedQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const quoteId = parseId((await params).id);
  const rawToken = (await searchParams).token;
  const token = typeof rawToken === "string" ? rawToken : "";
  const secret = process.env.AUTH_SECRET || "";

  if (!quoteId || !(await verifyQuoteShareToken(token, quoteId, secret))) {
    return <InvalidShare />;
  }

  const quote = await loadSavedQuoteInput(quoteId);
  if (!quote) return <InvalidShare />;

  const pdfUrl = `/api/shared-quotes/${quoteId}?token=${encodeURIComponent(token)}&download=1`;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
      <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <header className="border-b-2 border-[#1F5B85] px-5 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">SE7E ALUMÍNIO</h1>
              <p className="mt-1 text-[11px] font-medium tracking-[0.22em] text-slate-500">TKZ SISTEMAS</p>
              <div className="mt-5 space-y-1 text-xs leading-5 text-slate-600 sm:text-sm">
                <p>Av. Dr. Manoel Ayres Neto, 5677 - Qd. 23, Casa 10, Santo Antonio, Teresina - PI, 64033-660</p>
                <p>CNPJ: 51.572.356/0001-30</p>
                <p>setealuminio07@gmail.com · (86) 99482-7635</p>
              </div>
            </div>
            <Image
              src="/se7e-logo-v2.png"
              alt="SE7E Alumínio e Vidros"
              width={108}
              height={78}
              className="h-auto w-[82px] shrink-0 object-contain sm:w-[108px]"
              priority
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#1F5B85]">ORÇAMENTO</p>
              <p className="mt-1 text-2xl font-extrabold">Nº {quote.quoteNumber}</p>
            </div>
            <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">Data:</span> {formatDate(quote.date)}</p>
          </div>
        </header>

        <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500">CLIENTE</p>
            <h2 className="mt-2 text-lg font-bold uppercase">{quote.client.name}</h2>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              {quote.client.address ? <p><span className="font-semibold text-slate-700">Endereço:</span> {quote.client.address}</p> : null}
              {quote.client.phone ? <p><span className="font-semibold text-slate-700">Celular:</span> {formatPhone(quote.client.phone)}</p> : null}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-[#1F5B85]">PRODUTOS</h2>
              <span className="text-xs text-slate-400">{quote.items.length} {quote.items.length === 1 ? "item" : "itens"}</span>
            </div>

            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {quote.items.map((item, itemIndex) => {
                const hasDimensions = item.dimensions.length > 0;
                const imageUrl = item.imageUrl
                  ? `/api/shared-quotes/${quoteId}/image?token=${encodeURIComponent(token)}&url=${encodeURIComponent(item.imageUrl)}`
                  : "";

                return (
                  <section key={`${itemIndex}-${item.title}`} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="font-bold uppercase leading-5">ITEM {itemIndex + 1} · {item.title}</h3>
                      <div className="shrink-0 text-left sm:text-right">
                        {hasDimensions ? (
                          item.dimensions.map((dimension, dimensionIndex) => (
                            <p key={`${dimensionIndex}-${dimension.label}`} className="text-sm text-slate-600">
                              <span className="font-medium text-slate-800">{dimension.label || `Ambiente ${dimensionIndex + 1}`}:</span> {formatCurrency(dimension.totalPrice)}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600">Valor unitário: {formatCurrency(item.unitPrice || 0)}</p>
                        )}
                        <p className="mt-1 font-bold">Valor total: {formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                      {imageUrl ? (
                        <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white sm:w-40">
                          <Image
                            src={imageUrl}
                            alt={`Imagem de ${item.title}`}
                            width={160}
                            height={128}
                            unoptimized
                            className="h-full w-full object-contain p-2"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0 flex-1 text-sm leading-6 text-slate-600">
                        {hasDimensions ? (
                          <div className="space-y-1">
                            {item.dimensions.map((dimension, dimensionIndex) => (
                              <p key={`${dimensionIndex}-${dimension.label}-details`}>
                                <span className="font-semibold text-slate-800">{dimensionMeasurement(dimension.width, dimension.height)}</span>
                                {dimension.label ? ` — ${dimension.label}` : ""}
                                {dimension.quantity > 1 ? ` (×${dimension.quantity})` : ""}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p><span className="font-semibold text-slate-800">Largura:</span> {measurement(item.width)} · <span className="font-semibold text-slate-800">Altura:</span> {measurement(item.height)}</p>
                            {item.glass ? <p><span className="font-semibold text-slate-800">Cor do vidro:</span> {item.glass}</p> : null}
                            {item.aluminumColor ? <p><span className="font-semibold text-slate-800">Cor dos alumínios:</span> {item.aluminumColor}</p> : null}
                            {item.hardwareColor ? <p><span className="font-semibold text-slate-800">Cor das ferragens:</span> {item.hardwareColor}</p> : null}
                            <p><span className="font-semibold text-slate-800">Quantidade:</span> {item.quantity}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 border-t-2 border-slate-900 pt-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-2 text-sm text-slate-600">
              {quote.deliveryDate ? <p><span className="font-bold text-slate-800">PREVISÃO DE ENTREGA:</span> {formatDate(quote.deliveryDate)}</p> : null}
              {quote.validUntil ? <p><span className="font-bold text-slate-800">ORÇAMENTO VÁLIDO ATÉ:</span> {formatDate(quote.validUntil)}</p> : null}
              {quote.paymentConditions ? <p><span className="font-bold text-slate-800">CONDIÇÕES DE PAGAMENTO:</span> {quote.paymentConditions}</p> : null}
            </div>
            <div className="text-left sm:min-w-56 sm:text-right">
              {quote.discount > 0 ? <p className="mb-2 text-sm font-semibold text-red-700">Desconto: - {formatCurrency(quote.discount)}</p> : null}
              <div className="inline-block rounded-lg border-2 border-slate-900 px-4 py-3 text-xl font-extrabold">TOTAL: {formatCurrency(quote.total)}</div>
            </div>
          </section>

          {quote.notes ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <p className="mb-1 font-bold text-slate-800">OBSERVAÇÕES</p>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </section>
          ) : null}

          <section className="grid gap-8 pt-8 sm:grid-cols-2">
            <div className="border-t border-slate-500 pt-2 text-center text-xs font-bold uppercase">{quote.client.name}</div>
            <div className="border-t border-slate-500 pt-2 text-center text-xs font-bold uppercase">SE7E ALUMÍNIO</div>
          </section>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl bg-slate-950 p-4 text-white sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">Orçamento SE7E Alumínio</p>
              <p className="mt-1 text-xs text-slate-300">Você pode visualizar aqui ou salvar uma cópia em PDF.</p>
            </div>
            <a
              href={pdfUrl}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              <Download className="size-4" />
              Baixar PDF
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}
