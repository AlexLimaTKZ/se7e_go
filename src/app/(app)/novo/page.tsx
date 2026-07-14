"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  FileDown,
  Save,
  User,
  FileText,
  Package,
  Ruler,
} from "lucide-react";
import { QuotePreview } from "@/components/pdf/quote-preview";

interface ItemDimension {
  label: string;
  width: string;
  height: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface QuoteItem {
  id?: number;
  title: string;
  image_url: string;
  width: string;
  height: string;
  glass: string;
  aluminum: string;
  hardware: string;
  quantity: string;
  unit_price: string;
  total_price: string;
  dimensions: ItemDimension[];
}

interface ImageOption {
  name: string;
  url: string;
}

const emptyDimension: ItemDimension = {
  label: "",
  width: "",
  height: "",
  quantity: "1",
  unit_price: "",
  total_price: "0",
};

const emptyItem: QuoteItem = {
  title: "",
  image_url: "",
  width: "",
  height: "",
  glass: "",
  aluminum: "",
  hardware: "",
  quantity: "1",
  unit_price: "",
  total_price: "0",
  dimensions: [],
};

function QuoteFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditing = !!editId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<ImageOption[]>([]);
  const [clientsData, setClientsData] = useState<{name: string, address: string | null, phone: string | null}[]>([]);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState("rascunho");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentConditions, setPaymentConditions] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ ...emptyItem }]);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect iOS virtual keyboard to hide the fixed total bar
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // If the visual viewport is significantly smaller than the window,
      // the keyboard is likely open
      const heightDiff = window.innerHeight - vv.height;
      setIsKeyboardOpen(heightDiff > 150);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // Calculate total
  const itemsTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.total_price) || 0),
    0
  );
  const total = itemsTotal - Math.max(0, parseFloat(discount) || 0);

  // Load images from Vercel Blob
  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch("/api/images");
        if (res.ok) {
          const data = await res.json();
          setImages(data);
        }
      } catch (error) {
        console.error("Erro ao carregar imagens:", error);
      }
    }
    loadImages();
  }, []);

  // Load next quote number automatically when creating a new one
  useEffect(() => {
    if (!isEditing) {
      async function fetchNextNumber() {
        try {
          const res = await fetch("/api/quotes/next-number");
          if (res.ok) {
            const data = await res.json();
            // Formata para ter no mínimo 3 dígitos (ex: "001", "012", "150")
            setQuoteNumber(String(data.nextNumber).padStart(3, "0"));
          }
        } catch (error) {
          console.error("Erro ao carregar próximo número:", error);
        }
      }
      fetchNextNumber();
    }
  }, [isEditing]);

  // Load clients for autocomplete
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const data = await res.json();
          setClientsData(data);
        }
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      }
    }
    fetchClients();
  }, []);

  // Load quote data for editing
  const loadQuoteData = useCallback(async (id: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error("Orçamento não encontrado.");
      const data = await res.json();

      setClientName(data.client?.name || "");
      setClientAddress(data.client?.address || "");
      setClientPhone(data.client?.phone || "");
      setQuoteNumber(data.quoteNumber || "");
      setQuoteDate(data.date?.split("T")[0] || "");
      setDeliveryDate(data.deliveryDate?.split("T")[0] || "");
      setValidUntil(data.validUntil?.split("T")[0] || "");
      setStatus(data.status || "rascunho");
      setPaymentConditions(data.payment_conditions || "");
      setDiscount(data.discount?.toString() || "");
      setNotes(data.notes || "");

      if (data.items && data.items.length > 0) {
        setItems(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.items.map((item: any) => ({
            title: item.title || "",
            image_url: item.image_url || "",
            width: item.width?.toString() || "",
            height: item.height?.toString() || "",
            glass: item.glass || "",
            aluminum: item.aluminum || "",
            hardware: item.hardware || "",
            quantity: item.quantity?.toString() || "1",
            unit_price: item.unit_price?.toString() || "",
            total_price: item.total_price?.toString() || "0",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dimensions: item.dimensions ? item.dimensions.map((dim: any) => ({
              label: dim.label || "",
              width: dim.width?.toString() || "",
              height: dim.height?.toString() || "",
              quantity: dim.quantity?.toString() || "1",
              unit_price: dim.unitPrice?.toString() || dim.unit_price?.toString() || "",
              total_price: dim.totalPrice?.toString() || dim.total_price?.toString() || "0",
            })) : [],
          }))
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar o orçamento.");
      router.push("/");
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    if (editId) {
      loadQuoteData(editId);
    }
  }, [editId, loadQuoteData]);

  const addItem = () => setItems([...items, { ...emptyItem, dimensions: [] }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total when quantity or unit_price changes
    if (field === "quantity" || field === "unit_price") {
      const qty = parseFloat(field === "quantity" ? value : updated[index].quantity) || 0;
      const price = parseFloat(field === "unit_price" ? value : updated[index].unit_price) || 0;
      updated[index].total_price = (qty * price).toFixed(2);
    }

    setItems(updated);
  };

  // Dimension helpers
  const addDimension = (itemIndex: number) => {
    const updated = [...items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      dimensions: [...updated[itemIndex].dimensions, { ...emptyDimension }],
    };
    setItems(updated);
  };

  const removeDimension = (itemIndex: number, dimIndex: number) => {
    const updated = [...items];
    const newDims = updated[itemIndex].dimensions.filter((_, i) => i !== dimIndex);
    updated[itemIndex] = { ...updated[itemIndex], dimensions: newDims };
    // Recalculate item total from remaining dimensions
    if (newDims.length > 0) {
      updated[itemIndex].total_price = newDims
        .reduce((sum, d) => sum + (parseFloat(d.total_price) || 0), 0)
        .toFixed(2);
    }
    setItems(updated);
  };

  const updateDimension = (
    itemIndex: number,
    dimIndex: number,
    field: keyof ItemDimension,
    value: string
  ) => {
    const updated = [...items];
    const dims = [...updated[itemIndex].dimensions];
    dims[dimIndex] = { ...dims[dimIndex], [field]: value };

    // Auto-calculate dimension total_price
    if (field === "quantity" || field === "unit_price") {
      const qty = parseFloat(field === "quantity" ? value : dims[dimIndex].quantity) || 0;
      const price = parseFloat(field === "unit_price" ? value : dims[dimIndex].unit_price) || 0;
      dims[dimIndex].total_price = (qty * price).toFixed(2);
    }

    updated[itemIndex] = { ...updated[itemIndex], dimensions: dims };

    // Recalculate item total as sum of all dimension totals
    updated[itemIndex].total_price = dims
      .reduce((sum, d) => sum + (parseFloat(d.total_price) || 0), 0)
      .toFixed(2);

    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const quoteData = {
      client: {
        name: clientName,
        address: clientAddress,
        phone: clientPhone,
      },
      quote_number: quoteNumber,
      date: quoteDate,
      delivery_date: deliveryDate || null,
      valid_until: validUntil || null,
      status: status,
      payment_conditions: paymentConditions,
      discount: discount,
      notes: notes,
      total: total.toFixed(2),
      items: items.map((item) => ({
        title: item.title,
        image_url: item.image_url || null,
        width: item.width,
        height: item.height,
        glass: item.glass,
        aluminum: item.aluminum,
        hardware: item.hardware,
        quantity: item.quantity,
        unit_price: item.unit_price || null,
        total_price: item.total_price,
        dimensions: item.dimensions.length > 0 ? item.dimensions.map((dim) => ({
          label: dim.label || null,
          width: dim.width,
          height: dim.height,
          quantity: dim.quantity,
          unit_price: dim.unit_price,
          total_price: dim.total_price,
        })) : undefined,
      })),
    };

    try {
      const url = isEditing ? `/api/quotes/${editId}` : "/api/quotes";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar.");
      }

      toast.success(
        isEditing
          ? "Orçamento atualizado com sucesso!"
          : "Orçamento criado com sucesso!"
      );
      router.push("/orcamentos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar orçamento."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? `Editando orçamento #${quoteNumber}`
              : "Preencha os dados para criar um novo orçamento"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Cliente */}
        <Card className="border-border/60 border-t-2 border-t-primary/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-sm font-semibold text-primary">
                Nome do Cliente
              </Label>
              <div className="relative">
                <Input
                  id="clientName"
                  list="clients-list"
                  value={clientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientName(val);
                    // Autocomplete for existing client
                    const found = clientsData.find(c => c.name === val);
                    if (found) {
                      if (found.address) setClientAddress(found.address);
                      if (found.phone) setClientPhone(found.phone);
                    }
                  }}
                  placeholder="Ex: João da Silva"
                  required
                  className="h-12 text-lg bg-primary/5 border-l-4 border-l-primary pl-4 font-medium"
                />
              </div>
              <datalist id="clients-list">
                {clientsData.map(client => (
                  <option key={client.name} value={client.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Endereço</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Celular</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(86) 99999-9999"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Orçamento */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quoteNumber">Número</Label>
                <Input
                  id="quoteNumber"
                  type="number"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteDate">Data</Label>
                <Input
                  id="quoteDate"
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Previsão de Entrega</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido Até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                    <SelectItem value="concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens do Orçamento */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Itens do Orçamento
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="relative space-y-4 rounded-lg border border-dashed border-border/60 p-4">
                  {/* Remove button */}
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Item {index + 1}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Imagem</Label>
                      <Select
                        value={item.image_url || "none"}
                        onValueChange={(v) =>
                          updateItem(index, "image_url", !v || v === "none" ? "" : v)
                        }
                      >
                        <SelectTrigger className="overflow-hidden">
                          <SelectValue placeholder="Selecionar imagem" className="truncate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {images.map((img) => (
                            <SelectItem key={img.url} value={img.url}>
                              {img.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <AutoResizeTextarea
                        value={item.title}
                        onChange={(e) =>
                          updateItem(index, "title", e.target.value)
                        }
                        placeholder="Ex: Box de vidro banheiro"
                        maxRows={3}
                        required
                      />
                    </div>
                  </div>

                  {item.dimensions.length === 0 && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Largura (mm)</Label>
                          <Input
                            type="number"
                            value={item.width}
                            onChange={(e) =>
                              updateItem(index, "width", e.target.value)
                            }
                            placeholder="1200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Altura (mm)</Label>
                          <Input
                            type="number"
                            value={item.height}
                            onChange={(e) =>
                              updateItem(index, "height", e.target.value)
                            }
                            placeholder="2100"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Cor do Vidro</Label>
                          <Input
                            value={item.glass}
                            onChange={(e) =>
                              updateItem(index, "glass", e.target.value)
                            }
                            placeholder="Incolor"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor do Alumínio</Label>
                          <Input
                            value={item.aluminum}
                            onChange={(e) =>
                              updateItem(index, "aluminum", e.target.value)
                            }
                            placeholder="Preto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor das Ferragens</Label>
                          <Input
                            value={item.hardware}
                            onChange={(e) =>
                              updateItem(index, "hardware", e.target.value)
                            }
                            placeholder="Cromado"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Dimensions section */}
                  {item.dimensions.length > 0 ? (
                    <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          📐 Dimensões
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addDimension(index)}
                          className="h-7 gap-1 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar
                        </Button>
                      </div>

                      {/* Dimension header - hidden on mobile */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_60px_90px_90px_32px] gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Local</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Larg.</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Alt.</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Qtd</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">V.Unit</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">V.Total</span>
                        <span />
                      </div>

                      {item.dimensions.map((dim, dimIndex) => (
                        <div
                          key={dimIndex}
                          className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_80px_60px_90px_90px_32px] items-end"
                        >
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-xs sm:hidden">Local</Label>
                            <Input
                              value={dim.label}
                              onChange={(e) => updateDimension(index, dimIndex, "label", e.target.value)}
                              placeholder="Ex: Suite master"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:hidden">Largura</Label>
                            <Input
                              type="number"
                              value={dim.width}
                              onChange={(e) => updateDimension(index, dimIndex, "width", e.target.value)}
                              placeholder="mm"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:hidden">Altura</Label>
                            <Input
                              type="number"
                              value={dim.height}
                              onChange={(e) => updateDimension(index, dimIndex, "height", e.target.value)}
                              placeholder="mm"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:hidden">Qtd</Label>
                            <Input
                              type="number"
                              value={dim.quantity}
                              onChange={(e) => updateDimension(index, dimIndex, "quantity", e.target.value)}
                              min="1"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:hidden">V.Unit</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={dim.unit_price}
                              onChange={(e) => updateDimension(index, dimIndex, "unit_price", e.target.value)}
                              placeholder="0.00"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:hidden">V.Total</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={dim.total_price}
                              onChange={(e) => updateDimension(index, dimIndex, "total_price", e.target.value)}
                              placeholder="0.00"
                              className="h-9 text-sm bg-muted/50"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive self-end"
                            onClick={() => removeDimension(index, dimIndex)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      {/* Item total from dimensions */}
                      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Total do Item:
                        </span>
                        <span className="text-base font-bold text-primary">
                          {parseFloat(item.total_price || "0").toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            min="1"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Unitário (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(index, "unit_price", e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Total do Item (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.total_price}
                            onChange={(e) =>
                              updateItem(index, "total_price", e.target.value)
                            }
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addDimension(index)}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Ruler className="h-3.5 w-3.5" />
                        Adicionar Dimensão
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Condições e Pagamento */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              Condições e Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paymentConditions">Condições de Pagamento</Label>
                <Input
                  id="paymentConditions"
                  value={paymentConditions}
                  onChange={(e) => setPaymentConditions(e.target.value)}
                  placeholder="Ex: 50% entrada, 50% na entrega"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (R$)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações que aparecerão no PDF do orçamento..."
              />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Fixed Total Bar — hidden when iOS keyboard is open */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-primary/15 bg-card/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-200 ${isKeyboardOpen ? "translate-y-full" : "translate-y-0"}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total do Orçamento
              </p>
              <p className="text-2xl font-black tracking-tighter text-primary sm:text-3xl">
                {total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            {parseFloat(discount) > 0 && (
              <div className="hidden sm:block border-l border-border/50 pl-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Desconto</p>
                <p className="text-sm font-semibold text-destructive">- R$ {parseFloat(discount).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="hidden gap-2 sm:flex"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={loading}
              className="gap-2 font-semibold h-10 px-6 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{isEditing ? "Salvar Alterações" : "Salvar Orçamento"}</span>
                  <span className="sm:hidden">Salvar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPreview && (
        <QuotePreview
          client={{ name: clientName, address: clientAddress, phone: clientPhone }}
          quote={{
            quote_number: quoteNumber,
            date: quoteDate,
            delivery_date: deliveryDate,
            valid_until: validUntil,
            payment_conditions: paymentConditions,
            discount: parseFloat(discount) || 0,
            notes: notes,
            total,
            items: items.map((item) => ({
              ...item,
              width: parseFloat(item.width) || 0,
              height: parseFloat(item.height) || 0,
              quantity: parseInt(item.quantity) || 1,
              unit_price: parseFloat(item.unit_price) || 0,
              total_price: parseFloat(item.total_price) || 0,
              dimensions: item.dimensions.map((dim) => ({
                label: dim.label,
                width: parseFloat(dim.width) || 0,
                height: parseFloat(dim.height) || 0,
                quantity: parseInt(dim.quantity) || 1,
                unit_price: parseFloat(dim.unit_price) || 0,
                total_price: parseFloat(dim.total_price) || 0,
              })),
            })),
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

export default function QuoteFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <QuoteFormContent />
    </Suspense>
  );
}
