"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  FileDown,
  LayoutList,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { QuotePreview } from "@/components/pdf/quote-preview";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildQuoteShareText,
  buildWhatsAppUrl,
  isAppleMobileDevice,
} from "@/lib/pdf/share";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  normalizeQuoteStatus,
  type QuoteStatus,
} from "@/lib/dashboard/dashboard-presentation";
import { cn } from "@/lib/utils";

interface QuoteRow {
  id: number;
  quoteNumber: string | null;
  clientName: string | null;
  clientPhone: string | null;
  date: string | null;
  total: number | null;
  status: string | null;
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
  total: number | null;
  client: { name: string; address: string | null; phone: string | null } | null;
  items: QuoteDetailItem[];
}

type PreviewData = {
  client: { name: string; address: string; phone: string };
  quote: Parameters<typeof QuotePreview>[0]["quote"];
};

const statusStyles: Record<string, string> = {
  rascunho: "bg-slate-600 text-white",
  enviado: "bg-blue-600 text-white",
  aprovado: "bg-emerald-600 text-white",
  recusado: "bg-red-600 text-white",
  concluido: "bg-purple-600 text-white",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  concluido: "Concluído",
};

const statusFilters: Array<{ value: QuoteStatus | null; label: string }> = [
  { value: null, label: "Todos" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "enviado", label: "Enviados" },
  { value: "aprovado", label: "Aprovados" },
  { value: "recusado", label: "Recusados" },
  { value: "concluido", label: "Concluídos" },
];

function QuotesListFallback() {
  return (
    <div className="space-y-4" role="status">
      <Skeleton className="h-10 w-52" />
      <Skeleton className="h-11 w-full max-w-md" />
      <Skeleton className="h-72 w-full" />
      <span className="sr-only">Carregando orçamentos</span>
    </div>
  );
}

export default function QuotesListPage() {
  return (
    <Suspense fallback={<QuotesListFallback />}>
      <QuotesListContent />
    </Suspense>
  );
}

function QuotesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = normalizeQuoteStatus(searchParams.get("status"));
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfQuote, setPdfQuote] = useState<PreviewData | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const parameters = new URLSearchParams({ page: String(page), limit: "10" });
      if (query) parameters.set("search", query);
      if (status) parameters.set("status", status);
      const response = await fetch(`/api/quotes?${parameters}`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        items: QuoteRow[];
        total: number;
        totalPages: number;
      };
      setQuotes(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Erro ao carregar orçamentos.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/quotes/${deleteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Orçamento excluído com sucesso.");
      setDeleteId(null);
      await loadQuotes();
    } catch {
      toast.error("Erro ao excluir orçamento.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const response = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
      if (!response.ok) throw new Error();
      toast.success("Orçamento duplicado com sucesso.");
      await loadQuotes();
    } catch {
      toast.error("Erro ao duplicar orçamento.");
    }
  };

  const handleGeneratePdf = async (id: number) => {
    try {
      const response = await fetch(`/api/quotes/${id}`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as QuoteDetail;
      setPdfQuote({
        client: {
          name: data.client?.name || "",
          address: data.client?.address || "",
          phone: data.client?.phone || "",
        },
        quote: {
          quote_number: data.quoteNumber || "",
          date: data.date || "",
          delivery_date: data.deliveryDate || "",
          valid_until: data.validUntil || "",
          payment_conditions: data.payment_conditions || "",
          discount: data.discount || 0,
          notes: data.notes || "",
          total: data.total || 0,
          items: data.items.map((item) => ({
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
        },
      });
    } catch {
      toast.error("Erro ao carregar os dados do orçamento.");
    }
  };

  const openWhatsApp = (quote: QuoteRow) => {
    const message = buildQuoteShareText(quote.clientName || "Cliente", quote.quoteNumber || "");
    const url = buildWhatsAppUrl(quote.clientPhone || "", message, {
      preferLegacyBrazilianMobile: isAppleMobileDevice(navigator),
    });
    if (!url) {
      toast.error("Cadastre o celular do cliente antes de abrir o WhatsApp.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const actions = (quote: QuoteRow) => (
    <div className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => router.push(`/novo?id=${quote.id}`)} aria-label="Editar orçamento" title="Editar"><Pencil className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => void handleDuplicate(quote.id)} aria-label="Duplicar orçamento" title="Duplicar"><Copy className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => openWhatsApp(quote)} aria-label="Enviar mensagem pelo WhatsApp" title="Mensagem WhatsApp"><MessageCircle className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => void handleGeneratePdf(quote.id)} aria-label="Visualizar e compartilhar PDF" title="Compartilhar PDF"><FileDown className="size-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => setDeleteId(quote.id)} aria-label="Excluir orçamento" title="Excluir" className="hover:text-destructive"><Trash2 className="size-4" /></Button>
    </div>
  );

  const statusBadge = (status: string | null) => {
    const normalized = status?.normalize("NFD").replace(/[\u0300-\u036f]/gu, "") || "rascunho";
    return <Badge className={statusStyles[normalized] || statusStyles.rascunho}>{statusLabels[normalized] || "Rascunho"}</Badge>;
  };

  const createStatusHref = (nextStatus: QuoteStatus | null) => {
    const parameters = new URLSearchParams(searchParams.toString());
    if (nextStatus) parameters.set("status", nextStatus);
    else parameters.delete("status");
    parameters.delete("page");
    const queryString = parameters.toString();
    return queryString ? `/orcamentos?${queryString}` : "/orcamentos";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">{total} orçamento{total === 1 ? "" : "s"} salvo{total === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={() => router.push("/novo")}><Plus className="size-4" /> Novo orçamento</Button>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por cliente ou número" className="pl-9" aria-label="Buscar orçamentos" />
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por status">
        {statusFilters.map((filter) => {
          const active = filter.value === status;
          return (
            <Link
              key={filter.value ?? "todos"}
              href={createStatusHref(filter.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: active ? "secondary" : "outline", size: "sm" }),
                "h-11 px-3",
                active && "border-primary/20 bg-primary/10 text-primary",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <Card className="border-border/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><LayoutList className="size-5 text-primary" /> Lista de orçamentos</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" role="status">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
              <span className="sr-only">Carregando orçamentos</span>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              {query ? <Search className="size-10 opacity-40" /> : <LayoutList className="size-10 opacity-40" />}
              <p>{query ? `Nenhum orçamento encontrado para “${query}”.` : "Nenhum orçamento cadastrado."}</p>
              {!query && <Button variant="outline" onClick={() => router.push("/novo")}>Criar primeiro orçamento</Button>}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {quotes.map((quote) => (
                  <article key={quote.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{quote.clientName || "Cliente não identificado"}</p>
                        <p className="text-sm text-muted-foreground">#{quote.quoteNumber || "—"} · {formatDate(quote.date || "")}</p>
                      </div>
                      {statusBadge(quote.status)}
                    </div>
                    <p className="text-xl font-bold text-primary">{formatCurrency(quote.total || 0)}</p>
                    {actions(quote)}
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell><Badge variant="secondary" className="font-mono">#{quote.quoteNumber || "—"}</Badge></TableCell>
                        <TableCell className="font-medium">{quote.clientName || "Cliente não identificado"}</TableCell>
                        <TableCell>{formatDate(quote.date || "")}</TableCell>
                        <TableCell>{statusBadge(quote.status)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(quote.total || 0)}</TableCell>
                        <TableCell>{actions(quote)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Paginação de orçamentos">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
        </nav>
      )}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle><DialogDescription>Esta ação removerá permanentemente o orçamento e seus itens.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" />} Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfQuote && <QuotePreview client={pdfQuote.client} quote={pdfQuote.quote} onClose={() => setPdfQuote(null)} />}
    </div>
  );
}
