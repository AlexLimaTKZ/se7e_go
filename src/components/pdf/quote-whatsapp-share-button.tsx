"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildPdfFileShareData,
  buildQuotePdfFilename,
  buildQuoteShareText,
  buildWhatsAppUrl,
  canSharePdfFile,
  downloadPdfBlob,
  isAppleMobileDevice,
  isShareActivationError,
  isShareCancellation,
} from "@/lib/pdf/share";

interface QuoteWhatsAppShareButtonProps {
  quoteId: number;
  quoteNumber: string;
  clientName: string;
  clientPhone: string;
}

interface QuoteDetailItem {
  id: number;
  title: string;
  image_url: string | null;
  width: number | null;
  height: number | null;
  glass: string | null;
  aluminum: string | null;
  hardware: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  dimensions?: Array<{
    id: number;
    label: string | null;
    width: number | null;
    height: number | null;
    quantity: number | null;
    unit_price: number | null;
    total_price: number | null;
  }>;
}

interface QuoteDetail {
  quoteNumber: string | null;
  date: string | null;
  deliveryDate: string | null;
  validUntil: string | null;
  payment_conditions?: string | null;
  discount?: number | null;
  notes?: string | null;
  client: { name: string; address: string | null; phone: string | null } | null;
  items: QuoteDetailItem[];
}

interface PreparedShare {
  blob: Blob;
  file: File;
  message: string;
  whatsAppUrl: string | null;
}

async function readPdfError(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: string; issues?: string[] };
    return data.issues?.[0] || data.error || "Não foi possível gerar o PDF.";
  } catch {
    return "Não foi possível gerar o PDF.";
  }
}

function copyShareText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export function QuoteWhatsAppShareButton({
  quoteId,
  quoteNumber,
  clientName,
  clientPhone,
}: QuoteWhatsAppShareButtonProps) {
  const preparedRef = useRef<PreparedShare | null>(null);
  const preparingRef = useRef<Promise<PreparedShare> | null>(null);
  const [busy, setBusy] = useState(false);

  const prepareShare = useCallback(async (): Promise<PreparedShare> => {
    if (preparedRef.current) return preparedRef.current;
    if (preparingRef.current) return preparingRef.current;

    const promise = (async () => {
      const detailResponse = await fetch(`/api/quotes/${quoteId}`);
      if (!detailResponse.ok) throw new Error("Não foi possível carregar o orçamento.");
      const detail = await detailResponse.json() as QuoteDetail;

      const resolvedClientName = detail.client?.name || clientName || "Cliente";
      const resolvedClientPhone = detail.client?.phone || clientPhone;
      const resolvedQuoteNumber = detail.quoteNumber || quoteNumber;
      const message = buildQuoteShareText(resolvedClientName, resolvedQuoteNumber);

      const pdfResponse = await fetch("/api/quotes/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: resolvedClientName,
            address: detail.client?.address || "",
            phone: resolvedClientPhone || "",
          },
          quote_number: resolvedQuoteNumber,
          date: detail.date || "",
          delivery_date: detail.deliveryDate || null,
          valid_until: detail.validUntil || null,
          payment_conditions: detail.payment_conditions || "",
          discount: detail.discount || 0,
          notes: detail.notes || "",
          items: detail.items.map((item) => ({
            localId: String(item.id),
            title: item.title,
            image_url: item.image_url || "",
            width: item.width || 0,
            height: item.height || 0,
            glass: item.glass || "",
            aluminum: item.aluminum || "",
            hardware: item.hardware || "",
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            dimensions: (item.dimensions || []).map((dimension) => ({
              localId: String(dimension.id),
              label: dimension.label || "",
              width: dimension.width || 0,
              height: dimension.height || 0,
              quantity: dimension.quantity || 1,
              unit_price: dimension.unit_price || 0,
              total_price: dimension.total_price || 0,
            })),
          })),
        }),
      });

      if (!pdfResponse.ok) throw new Error(await readPdfError(pdfResponse));
      if (!pdfResponse.headers.get("content-type")?.startsWith("application/pdf")) {
        throw new Error("O servidor não retornou um PDF válido.");
      }

      const blob = await pdfResponse.blob();
      if (blob.size === 0) throw new Error("O PDF gerado está vazio.");

      const filename = buildQuotePdfFilename(resolvedQuoteNumber, resolvedClientName);
      const file = new File([blob], filename, { type: "application/pdf" });
      const whatsAppUrl = buildWhatsAppUrl(resolvedClientPhone || "", message, {
        preferLegacyBrazilianMobile: isAppleMobileDevice(navigator),
      });
      const prepared = { blob, file, message, whatsAppUrl };
      preparedRef.current = prepared;
      return prepared;
    })().finally(() => {
      if (preparingRef.current === promise) preparingRef.current = null;
    });

    preparingRef.current = promise;
    return promise;
  }, [clientName, clientPhone, quoteId, quoteNumber]);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const prepared = await prepareShare();

      if (canSharePdfFile(navigator, prepared.file)) {
        if (isAppleMobileDevice(navigator)) {
          const copiedPromise = copyShareText(prepared.message);
          await navigator.share(buildPdfFileShareData(prepared.file));
          const copied = await copiedPromise;
          toast.success(copied
            ? "PDF pronto para o WhatsApp. A mensagem foi copiada para você colar na conversa."
            : "PDF pronto para o WhatsApp. Selecione o cliente e envie o arquivo.");
        } else {
          await navigator.share({ files: [prepared.file], text: prepared.message });
          toast.success("Escolha o WhatsApp e o cliente para enviar o PDF com a mensagem.");
        }
        return;
      }

      downloadPdfBlob(prepared.blob, prepared.file.name);
      if (prepared.whatsAppUrl) {
        window.open(prepared.whatsAppUrl, "_blank", "noopener,noreferrer");
        toast.info("PDF baixado. O WhatsApp foi aberto com a mensagem pronta; anexe o arquivo à conversa.");
      } else {
        toast.info("PDF baixado. Abra o WhatsApp e anexe o arquivo à conversa do cliente.");
      }
    } catch (error) {
      if (isShareActivationError(error) && preparedRef.current) {
        toast.info("O PDF está pronto. Toque novamente no WhatsApp para abrir o compartilhamento.");
      } else if (!isShareCancellation(error)) {
        toast.error(error instanceof Error ? error.message : "Não foi possível compartilhar o orçamento.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, prepareShare]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void handleShare()}
      disabled={busy}
      aria-label="Compartilhar orçamento no WhatsApp"
      title="WhatsApp + PDF"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
    </Button>
  );
}
