"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { normalizeBrazilianWhatsAppPhone } from "@/lib/pdf/share";

interface QuoteWhatsAppShareButtonProps {
  quoteId: number;
  quoteNumber?: string;
  clientName?: string;
  clientPhone: string;
}

export function QuoteWhatsAppShareButton({
  quoteId,
  clientPhone,
}: QuoteWhatsAppShareButtonProps) {
  const hasValidPhone = Boolean(normalizeBrazilianWhatsAppPhone(clientPhone));

  if (!hasValidPhone) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toast.error("Cadastre um celular válido para o cliente antes de compartilhar.")}
        aria-label="Compartilhar orçamento no WhatsApp"
        title="WhatsApp + link do PDF"
      >
        <MessageCircle className="size-4" />
      </Button>
    );
  }

  return (
    <a
      href={`/api/quotes/${quoteId}/whatsapp`}
      className={buttonVariants({ variant: "ghost", size: "icon" })}
      aria-label="Compartilhar orçamento no WhatsApp"
      title="WhatsApp + link do PDF"
    >
      <MessageCircle className="size-4" />
    </a>
  );
}
