"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { companyData } from "@/lib/company-data";
import { formatDate, formatCurrencyValue } from "@/lib/formatters";
import { Printer, X } from "lucide-react";

interface QuotePreviewProps {
  client: {
    name: string;
    address: string;
    phone: string;
  };
  quote: {
    quote_number: string;
    date: string;
    delivery_date: string;
    valid_until: string;
    payment_conditions?: string;
    discount?: number;
    notes?: string;
    total: number;
    items: Array<{
      title: string;
      image_url: string;
      width: number;
      height: number;
      glass: string;
      aluminum: string;
      hardware: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      dimensions?: Array<{
        label: string;
        width: number;
        height: number;
        quantity: number;
        unit_price: number;
        total_price: number;
      }>;
    }>;
  };
  onClose: () => void;
}

// formatDate e formatCurrencyValue importados de @/lib/formatters

export function QuotePreview({ client, quote, onClose }: QuotePreviewProps) {
  // O handleDownload agora é puramente nativo. Rápido e infalível.
  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    // Container principal: flex column preenche toda a tela
    // No iOS Safari, `fixed` dentro de `overflow:auto` não funciona.
    // Solução: separar toolbar (flex-shrink-0) do conteúdo scrollável (flex-1).
    <div
      data-pdf-modal
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
    >
      {/* Toolbar - FORA do scroll, sempre visível no topo */}
      <div
        data-pdf-toolbar
        className="flex flex-shrink-0 items-center justify-end gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button onClick={handlePrint} className="gap-2 font-semibold shadow-lg">
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
        <Button variant="secondary" size="icon" onClick={onClose} className="shadow-lg">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Área scrollável - independente da toolbar */}
      <div
        data-pdf-scroll
        className="flex-1 overflow-auto"
        onClick={onClose}
      >
        <div
          data-pdf-content
          onClick={(e) => e.stopPropagation()}
          className="mx-auto mb-8 w-[210mm] bg-white text-black shadow-2xl"
          style={{
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: "10pt",
            color: "#333",
            padding: "10mm 12mm",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "12px" }}>
            <div style={{ maxWidth: "60%" }}>
              <h1 style={{ fontSize: "18pt", margin: "0 0 3px 0", fontWeight: "bold" }}>
                {companyData.name.toUpperCase()}
              </h1>
              <div style={{ fontSize: "8pt", color: "#555", marginBottom: "10px" }}>TKZ SISTEMAS</div>
              <p style={{ margin: "2px 0", fontSize: "9pt" }}>ENDEREÇO: {companyData.address}</p>
              <p style={{ margin: "2px 0", fontSize: "9pt" }}>CNPJ: {companyData.cnpj}</p>
              <p style={{ margin: "2px 0", fontSize: "9pt" }}>EMAIL: {companyData.email} &nbsp; CEL: {companyData.cel}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "200px" }}>
              <img src="/se7e-logo-v2.png" alt="Logo" style={{ width: "80px", height: "auto", objectFit: "contain", marginBottom: "8px" }} />
              <h2 style={{ fontSize: "14pt", margin: "0", textAlign: "right" }}>ORÇAMENTO {quote.quote_number}</h2>
              <p style={{ fontSize: "11pt", marginTop: "3px", textAlign: "right" }}>{formatDate(quote.date)}</p>
            </div>
          </div>

          {/* Client Info */}
          <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "15px" }}>
            <p style={{ margin: "4px 0" }}><strong>{client.name.toUpperCase()}</strong></p>
            <p style={{ margin: "4px 0" }}>ENDEREÇO: {client.address}</p>
            <p style={{ margin: "4px 0" }}>CELULAR: {client.phone}</p>
          </div>

          <h2 style={{ textTransform: "uppercase", fontSize: "14pt", fontWeight: "bold", marginBottom: "15px" }}>PRODUTOS</h2>

          {quote.items.map((item, index) => {
            const imageUrl = item.image_url && item.image_url.includes(".blob.vercel-storage.com")
              ? `/api/images/proxy?url=${encodeURIComponent(item.image_url)}`
              : item.image_url;

            return (
            <div
              key={index}
              data-pdf-item
              style={{
                pageBreakInside: "avoid",
                breakInside: "avoid",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", paddingBottom: "15px", borderBottom: "1px solid #ccc" }}>
                {imageUrl && (
                  <div style={{ flexBasis: "120px", flexShrink: 0, overflow: "hidden" }}>
                    <img src={imageUrl} alt={item.title} style={{ width: "120px", height: "120px", objectFit: "contain", border: "1px solid #eee" }} />
                  </div>
                )}
                <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "10px" }}><strong style={{ fontSize: "11pt", textTransform: "uppercase" }}>ITEM {index + 1} - {item.title}</strong></div>

                    {item.dimensions && item.dimensions.length > 0 ? (
                      <>
                        <div style={{ margin: "8px 0 0 0", fontSize: "9pt" }}>
                          {item.dimensions.map((dim, dimIdx) => (
                            <div key={dimIdx} style={{ margin: "3px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span>
                                • {dim.width} x {dim.height}
                                {dim.label ? ` — ${dim.label}` : ""}
                                {dim.quantity > 1 ? ` (×${dim.quantity})` : ""}
                              </span>
                              <span data-pdf-currency style={{ whiteSpace: "nowrap", marginLeft: "10px" }}>
                                R$ {formatCurrencyValue(dim.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: "9pt" }}>LARGURA: {item.width} &nbsp; ALTURA: {item.height}</div>
                        <div style={{ fontSize: "9pt" }}>
                          <p style={{ margin: "3px 0" }}>COR DO VIDRO: {item.glass}</p>
                          <p style={{ margin: "3px 0" }}>COR DOS ALUMÍNIOS: {item.aluminum}</p>
                          <p style={{ margin: "3px 0" }}>COR DAS FERRAGENS: {item.hardware}</p>
                          <p style={{ margin: "3px 0" }}>QUANTIDADE: {item.quantity}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: "10pt", minWidth: "180px" }}>
                    {!(item.dimensions && item.dimensions.length > 0) && item.unit_price > 0 && (
                      <p data-pdf-currency style={{ margin: "3px 0", whiteSpace: "nowrap" }}>
                        VALOR UNITÁRIO: R$ {formatCurrencyValue(item.unit_price)}
                      </p>
                    )}
                    <p data-pdf-currency style={{ margin: "3px 0", whiteSpace: "nowrap" }}>
                      <strong>VALOR TOTAL: R$ {formatCurrencyValue(item.total_price)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            );
          })}

          {/* Footer */}
          <div 
            data-pdf-footer
            style={{ 
              pageBreakInside: "avoid", 
              breakInside: "avoid",
              marginTop: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: "10px", borderTop: "2px solid #000" }}>
              <div>
                {quote.delivery_date && <p style={{ margin: "5px 0", fontSize: "9pt" }}>PREVISÃO DE ENTREGA: <strong>{formatDate(quote.delivery_date)}</strong></p>}
                {quote.valid_until && <p style={{ margin: "5px 0", fontSize: "9pt" }}>ORÇAMENTO VÁLIDO ATÉ: <strong>{formatDate(quote.valid_until)}</strong></p>}
                {quote.payment_conditions && <p style={{ margin: "5px 0", fontSize: "9pt" }}>CONDIÇÕES DE PAGAMENTO: <strong>{quote.payment_conditions}</strong></p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                {(quote.discount ?? 0) > 0 && (
                  <div data-pdf-currency style={{ padding: "0 15px", marginBottom: "5px", display: "flex", alignItems: "center", gap: "10px", color: "red", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "11pt" }}>DESCONTO:</span>
                    <span style={{ fontSize: "12pt" }}>- R$ {formatCurrencyValue(quote.discount!)}</span>
                  </div>
                )}
                <div data-pdf-currency style={{ border: "2px solid #000", padding: "12px 15px", borderRadius: "5px", display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: "14pt", fontWeight: "bold" }}>TOTAL:</span>
                  <span style={{ fontSize: "15pt", fontWeight: "bold" }}>R$ {formatCurrencyValue(quote.total)}</span>
                </div>
              </div>
            </div>
            
            {/* Notes display */}
            {quote.notes && (
              <div style={{ marginTop: "15px", padding: "10px", border: "1px dashed #ccc", backgroundColor: "#f9f9f9" }}>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "9pt" }}>OBSERVAÇÕES:</p>
                <p style={{ margin: 0, fontSize: "9pt", whiteSpace: "pre-wrap" }}>{quote.notes}</p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", gap: "40px" }}>
              <div style={{ textAlign: "center", flex: 1, borderTop: "1px solid #000", paddingTop: "5px" }}>
                <p style={{ fontWeight: "bold", textTransform: "uppercase", margin: 0, fontSize: "10pt" }}>{client.name.toUpperCase()}</p>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderTop: "1px solid #000", paddingTop: "5px" }}>
                <p style={{ fontWeight: "bold", textTransform: "uppercase", margin: 0, fontSize: "10pt" }}>{companyData.name.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}