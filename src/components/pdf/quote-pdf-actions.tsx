"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Download, Loader2, MessageCircle, Printer, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildQuotePdfFilename,
  buildQuoteShareText,
  buildWhatsAppUrl,
  canSharePdfFile,
  downloadPdfBlob,
  isShareActivationError,
  isShareCancellation,
} from "@/lib/pdf/share";
import type { QuotePreviewClient, QuotePreviewData } from "@/lib/pdf/quote-preview-data";

interface QuotePdfActionsProps {
  client: QuotePreviewClient;
  quote: QuotePreviewData;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPrint: () => void;
}

type BusyAction = "share" | "download" | null;

async function readPdfError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: string; issues?: string[] };
    return data.issues?.[0] || data.error || "Não foi possível gerar o PDF.";
  } catch {
    return "Não foi possível gerar o PDF.";
  }
}

export function QuotePdfActions({
  client,
  quote,
  closeButtonRef,
  onClose,
  onPrint,
}: QuotePdfActionsProps) {
  const pdfBlobRef = useRef<Blob | null>(null);
  const pdfPromiseRef = useRef<Promise<Blob> | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [fallbackVisible, setFallbackVisible] = useState(false);

  const requestPdf = useCallback((signal?: AbortSignal): Promise<Blob> => {
    if (pdfBlobRef.current) return Promise.resolve(pdfBlobRef.current);
    if (pdfPromiseRef.current) return pdfPromiseRef.current;

    setPreparing(true);
    const promise: Promise<Blob> = fetch("/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client,
        quote_number: quote.quote_number,
        date: quote.date,
        delivery_date: quote.delivery_date || null,
        valid_until: quote.valid_until || null,
        payment_conditions: quote.payment_conditions || "",
        discount: quote.discount || 0,
        notes: quote.notes || "",
        items: quote.items,
      }),
      signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await readPdfError(response));
      if (!response.headers.get("content-type")?.startsWith("application/pdf")) {
        throw new Error("O servidor não retornou um PDF válido.");
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("O PDF gerado está vazio.");
      pdfBlobRef.current = blob;
      return blob;
    }).finally(() => {
      if (pdfPromiseRef.current === promise) {
        pdfPromiseRef.current = null;
        setPreparing(false);
      }
    });
    pdfPromiseRef.current = promise;
    return promise;
  }, [client, quote]);

  useEffect(() => {
    const controller = new AbortController();
    const promise = requestPdf(controller.signal);
    void promise.catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPreparing(false);
      }
    });
    return () => {
      controller.abort();
      if (pdfPromiseRef.current === promise) {
        pdfPromiseRef.current = null;
      }
    };
  }, [requestPdf]);

  const filename = buildQuotePdfFilename(quote.quote_number, client.name);
  const shareText = buildQuoteShareText(client.name, quote.quote_number);

  const handleShare = useCallback(async () => {
    if (busyAction) return;
    setBusyAction("share");
    setFallbackVisible(false);
    try {
      const blob = await requestPdf();
      const file = new File([blob], filename, { type: "application/pdf" });
      if (canSharePdfFile(navigator, file)) {
        await navigator.share({
          title: `Orçamento ${quote.quote_number}`,
          text: shareText,
          files: [file],
        });
        toast.success("PDF compartilhado com sucesso.");
      } else {
        downloadPdfBlob(blob, filename);
        setFallbackVisible(true);
      }
    } catch (error) {
      if (isShareActivationError(error) && pdfBlobRef.current) {
        toast.info("O PDF está pronto. Toque novamente em Compartilhar para abrir os aplicativos.");
      } else if (!isShareCancellation(error)) {
        toast.error(error instanceof Error ? error.message : "Não foi possível compartilhar o PDF.");
      }
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, filename, quote.quote_number, requestPdf, shareText]);

  const handleDownload = useCallback(async () => {
    if (busyAction) return;
    setBusyAction("download");
    try {
      const blob = await requestPdf();
      downloadPdfBlob(blob, filename);
      toast.success("PDF baixado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o PDF.");
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, filename, requestPdf]);

  const handleWhatsApp = useCallback(() => {
    const url = buildWhatsAppUrl(client.phone, shareText);
    if (!url) {
      toast.error("Cadastre o celular do cliente antes de abrir o WhatsApp.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [client.phone, shareText]);

  return (
    <div
      data-pdf-toolbar
      className="order-2 grid flex-shrink-0 grid-cols-4 gap-1.5 border-t border-white/15 bg-black/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:order-1 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:border-b sm:border-t-0 sm:bg-transparent sm:p-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]"
      onClick={(event) => event.stopPropagation()}
    >
      {fallbackVisible ? (
        <div className="col-span-4 mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-950 sm:mr-auto sm:mb-0 sm:max-w-md" role="status">
          <span>PDF baixado. Abra o WhatsApp e anexe o arquivo à conversa.</span>
          <Button type="button" size="sm" variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="size-4" /> Abrir WhatsApp
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void handleShare()}
        disabled={busyAction !== null}
        aria-label="Compartilhar PDF"
        className="min-h-12 flex-col gap-0.5 px-1 text-[11px] font-semibold shadow-lg sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
      >
        {busyAction === "share" || (preparing && !pdfBlobRef.current) ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
        <span>{busyAction === "share" ? "Preparando…" : "Compartilhar"}</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void handleDownload()}
        disabled={busyAction !== null}
        aria-label="Baixar PDF"
        className="min-h-12 flex-col gap-0.5 px-1 text-[11px] shadow-lg sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
      >
        {busyAction === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        <span>Baixar</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onPrint}
        aria-label="Imprimir"
        className="min-h-12 flex-col gap-0.5 px-1 text-[11px] shadow-lg sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
      >
        <Printer className="size-4" /> <span>Imprimir</span>
      </Button>
      <Button
        ref={closeButtonRef}
        type="button"
        variant="secondary"
        onClick={onClose}
        aria-label="Fechar visualização"
        className="min-h-12 flex-col gap-0.5 px-1 text-[11px] shadow-lg sm:min-h-11 sm:min-w-11 sm:px-3"
      >
        <X className="size-5" /> <span className="sm:sr-only">Fechar</span>
      </Button>
    </div>
  );
}
