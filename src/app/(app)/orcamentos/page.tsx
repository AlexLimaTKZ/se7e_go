"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutList,
  Pencil,
  FileDown,
  Trash2,
  Plus,
  Loader2,
  Copy,
  Search,
} from "lucide-react";
import { QuotePreview } from "@/components/pdf/quote-preview";

interface QuoteRow {
  id: number;
  quoteNumber: string;
  clientName: string;
  date: string;
  total: number;
  status: string;
  clientPhone?: string;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-slate-500",
  enviado: "bg-blue-500",
  aprovado: "bg-green-500",
  recusado: "bg-red-500",
  concluído: "bg-purple-500",
};

export default function QuotesListPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfQuote, setPdfQuote] = useState<{
    client: { name: string; address: string; phone: string };
    quote: {
      quote_number: string;
      date: string;
      delivery_date: string;
      valid_until: string;
      payment_conditions: string;
      discount: number;
      notes: string;
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
  } | null>(null);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
      toast.error("Erro ao carregar orçamentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/quotes/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Orçamento excluído com sucesso.");
        setQuotes(quotes.filter((q) => q.id !== deleteId));
      } else {
        toast.error("Erro ao excluir orçamento.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const res = await fetch(`/api/quotes/${id}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Orçamento duplicado com sucesso.");
        // Recarregar a lista
        loadQuotes();
      } else {
        toast.error("Erro ao duplicar orçamento.");
      }
    } catch {
      toast.error("Erro de conexão.");
    }
  };

  const handleGeneratePdf = async (id: number) => {
    try {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      setPdfQuote({
        client: data.client,
        quote: {
          quote_number: data.quoteNumber,
          date: data.date,
          delivery_date: data.deliveryDate,
          valid_until: data.validUntil,
          payment_conditions: data.paymentConditions || "",
          discount: data.discount || 0,
          notes: data.notes || "",
          total: data.total,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: data.items.map((item: any) => ({
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
              dimensions: item.dimensions || [],
            })
          ),
        },
      });
    } catch {
      toast.error("Erro ao carregar dados do orçamento.");
    }
  };

  // formatDate e formatCurrency importados de @/lib/formatters

  const filteredQuotes = quotes.filter(
    (q) =>
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.quoteNumber && q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            {quotes.length} orçamento{quotes.length !== 1 ? "s" : ""} salvo
            {quotes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => router.push("/novo")} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm border-border/60">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por cliente ou número..."
            className="w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutList className="h-5 w-5 text-primary" />
            Lista de Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton loading
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-28" />
                    </TableCell>
                  </TableRow>
                ))
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <LayoutList className="h-10 w-10 text-muted-foreground/40" />
                      <p>Nenhum orçamento encontrado.</p>
                      <Button
                        variant="link"
                        onClick={() => router.push("/novo")}
                        className="text-primary"
                      >
                        Criar o primeiro orçamento
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-10 w-10 text-muted-foreground/40" />
                      <p>Nenhum orçamento encontrado para &quot;{searchTerm}&quot;.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="group">
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        #{quote.quoteNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {quote.clientName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(quote.date)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={statusColors[quote.status || "rascunho"] || statusColors["rascunho"]}
                        style={{ color: "white" }}
                      >
                        {(quote.status || "rascunho").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => router.push(`/novo?id=${quote.id}`)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleDuplicate(quote.id)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-green-600"
                          onClick={() => {
                            const phone = quote.clientPhone ? quote.clientPhone.replace(/\D/g, "") : "";
                            const firstName = quote.clientName.split(" ")[0];
                            const msg = encodeURIComponent(`Olá, ${firstName}! Tudo bem?\n\nConforme conversamos, segue em anexo o orçamento detalhado (PDF) referente ao seu projeto. Fico à disposição para esclarecer qualquer dúvida!`);
                            window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                          }}
                          title="Enviar por WhatsApp"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            className="h-4 w-4"
                          >
                            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleGeneratePdf(quote.id)}
                          title="Gerar PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(quote.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview */}
      {pdfQuote && (
        <QuotePreview
          client={pdfQuote.client}
          quote={pdfQuote.quote}
          onClose={() => setPdfQuote(null)}
        />
      )}
    </div>
  );
}
