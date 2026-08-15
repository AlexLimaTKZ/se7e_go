"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileDown, FileText, Loader2, Package, Plus, Save, User } from "lucide-react";
import { toast } from "sonner";
import { QuotePreview } from "@/components/pdf/quote-preview";
import { QuoteItemEditor } from "@/components/quotes/quote-item-editor";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { parseQuoteDraft, serializeQuoteDraft } from "@/lib/quotes/quote-draft";
import { parseLocaleNumber, type QuoteStatus } from "@/lib/quotes/quote-input";
import {
  addQuoteDimension,
  createEmptyQuoteItem,
  createLocalId,
  removeQuoteDimension,
  updateQuoteDimension,
  updateQuoteItem,
  type QuoteDimensionField,
  type QuoteDimensionState,
  type QuoteItemField,
  type QuoteItemState,
} from "@/lib/quotes/quote-state";

interface ImageOption {
  name: string;
  url: string;
}

interface ClientOption {
  name: string;
  address: string | null;
  phone: string | null;
}

interface QuoteFormState {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  quoteNumber: string;
  quoteDate: string;
  status: QuoteStatus;
  deliveryDate: string;
  validUntil: string;
  paymentConditions: string;
  discount: string;
  notes: string;
  items: QuoteItemState[];
}

interface QuoteApiItem {
  title?: string | null;
  image_url?: string | null;
  width?: number | null;
  height?: number | null;
  glass?: string | null;
  aluminum?: string | null;
  hardware?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  dimensions?: Array<{
    label?: string | null;
    width?: number | null;
    height?: number | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
  }>;
}

interface QuoteApiResponse {
  quoteNumber?: string | null;
  date?: string | null;
  deliveryDate?: string | null;
  validUntil?: string | null;
  status?: QuoteStatus | null;
  payment_conditions?: string | null;
  discount?: number | null;
  notes?: string | null;
  client?: ClientOption | null;
  items?: QuoteApiItem[];
}

function today(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function emptyForm(): QuoteFormState {
  return {
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    quoteNumber: "",
    quoteDate: today(),
    status: "rascunho",
    deliveryDate: "",
    validUntil: "",
    paymentConditions: "",
    discount: "",
    notes: "",
    items: [createEmptyQuoteItem()],
  };
}

function stringValue(value: string | number | null | undefined, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function dimensionFromApi(dimension: NonNullable<QuoteApiItem["dimensions"]>[number]): QuoteDimensionState {
  return {
    localId: createLocalId(),
    label: dimension.label || "",
    width: stringValue(dimension.width),
    height: stringValue(dimension.height),
    quantity: stringValue(dimension.quantity, "1"),
    unit_price: stringValue(dimension.unit_price),
    total_price: stringValue(dimension.total_price, "0"),
  };
}

function itemFromApi(item: QuoteApiItem): QuoteItemState {
  return {
    localId: createLocalId(),
    label: "",
    title: item.title || "",
    image_url: item.image_url || "",
    width: stringValue(item.width),
    height: stringValue(item.height),
    glass: item.glass || "",
    aluminum: item.aluminum || "",
    hardware: item.hardware || "",
    quantity: stringValue(item.quantity, "1"),
    unit_price: stringValue(item.unit_price),
    total_price: stringValue(item.total_price, "0"),
    dimensions: (item.dimensions || []).map(dimensionFromApi),
  };
}

function formFromApi(data: QuoteApiResponse): QuoteFormState {
  const items = (data.items || []).map(itemFromApi);
  return {
    clientName: data.client?.name || "",
    clientAddress: data.client?.address || "",
    clientPhone: data.client?.phone || "",
    quoteNumber: data.quoteNumber || "",
    quoteDate: data.date?.slice(0, 10) || today(),
    status: data.status || "rascunho",
    deliveryDate: data.deliveryDate?.slice(0, 10) || "",
    validUntil: data.validUntil?.slice(0, 10) || "",
    paymentConditions: data.payment_conditions || "",
    discount: stringValue(data.discount),
    notes: data.notes || "",
    items: items.length > 0 ? items : [createEmptyQuoteItem()],
  };
}

function isUsableDraft(value: unknown): value is QuoteFormState {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<QuoteFormState>;
  return typeof draft.clientName === "string" && Array.isArray(draft.items) && draft.items.length > 0;
}

function QuoteFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditing = Boolean(editId);
  const draftKey = `se7e:quote-draft:${editId || "new"}`;
  const formRef = useRef<HTMLFormElement>(null);
  const latestForm = useRef<QuoteFormState>(emptyForm());

  const [form, setForm] = useState<QuoteFormState>(() => latestForm.current);
  const [activeItemId, setActiveItemId] = useState(form.items[0].localId);
  const [images, setImages] = useState<ImageOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [editingField, setEditingField] = useState(false);

  latestForm.current = form;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingData(true);
      try {
        const [imagesResponse, clientsResponse] = await Promise.all([
          fetch("/api/images"),
          fetch("/api/clients"),
        ]);
        if (!cancelled && imagesResponse.ok) setImages(await imagesResponse.json());
        if (!cancelled && clientsResponse.ok) setClients(await clientsResponse.json());

        let loadedForm: QuoteFormState | null = null;
        if (editId) {
          const response = await fetch(`/api/quotes/${editId}`);
          if (!response.ok) throw new Error("Orçamento não encontrado.");
          loadedForm = formFromApi(await response.json());
        } else {
          const draft = parseQuoteDraft<QuoteFormState>(localStorage.getItem(draftKey) || "");
          if (draft && isUsableDraft(draft.data)) {
            loadedForm = draft.data;
            setDraftSavedAt(draft.savedAt);
            toast.info("Seu rascunho anterior foi recuperado.");
          } else {
            const response = await fetch("/api/quotes/next-number");
            if (response.ok) {
              const data = (await response.json()) as { nextNumber: string };
              loadedForm = { ...emptyForm(), quoteNumber: String(data.nextNumber).padStart(3, "0") };
            }
          }
        }

        if (!cancelled && loadedForm) {
          setForm(loadedForm);
          setActiveItemId(loadedForm.items[0].localId);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
        if (editId) router.replace("/orcamentos");
      } finally {
        if (!cancelled) {
          setDraftReady(true);
          setLoadingData(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [draftKey, editId, router]);

  useEffect(() => {
    if (!draftReady) return;
    const timeout = window.setTimeout(() => {
      const savedAt = Date.now();
      localStorage.setItem(draftKey, serializeQuoteDraft(form, savedAt));
      setDraftSavedAt(savedAt);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draftKey, draftReady, form]);

  useEffect(() => {
    if (!draftReady) return;
    const saveBeforeLeaving = () => {
      localStorage.setItem(draftKey, serializeQuoteDraft(latestForm.current));
    };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => window.removeEventListener("pagehide", saveBeforeLeaving);
  }, [draftKey, draftReady]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      setEditingField(
        target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable),
      );
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        const target = document.activeElement;
        setEditingField(
          target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement,
        );
      }, 0);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const total = useMemo(() => {
    const itemsTotal = form.items.reduce(
      (sum, item) => sum + (parseLocaleNumber(item.total_price) ?? 0),
      0,
    );
    return Math.max(0, itemsTotal - Math.max(0, parseLocaleNumber(form.discount) ?? 0));
  }, [form.discount, form.items]);

  const updateField = useCallback(
    <Key extends Exclude<keyof QuoteFormState, "items">>(key: Key, value: QuoteFormState[Key]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleItemChange = useCallback(
    (localId: string, field: QuoteItemField, value: string) => {
      setForm((current) => ({
        ...current,
        items: updateQuoteItem(current.items, localId, field, value),
      }));
    },
    [],
  );

  const handleAddDimension = useCallback((localId: string) => {
    setForm((current) => ({
      ...current,
      items: addQuoteDimension(current.items, localId),
    }));
  }, []);

  const handleDimensionChange = useCallback(
    (
      itemLocalId: string,
      dimensionLocalId: string,
      field: QuoteDimensionField,
      value: string,
    ) => {
      setForm((current) => ({
        ...current,
        items: updateQuoteDimension(
          current.items,
          itemLocalId,
          dimensionLocalId,
          field,
          value,
        ),
      }));
    },
    [],
  );

  const handleRemoveDimension = useCallback((itemLocalId: string, dimensionLocalId: string) => {
    setForm((current) => ({
      ...current,
      items: removeQuoteDimension(current.items, itemLocalId, dimensionLocalId),
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    const item = createEmptyQuoteItem();
    setForm((current) => ({ ...current, items: [...current.items, item] }));
    setActiveItemId(item.localId);
    window.setTimeout(() => {
      document.getElementById(`item-${item.localId}-title`)?.scrollIntoView({
        block: "center",
      });
    }, 0);
  }, []);

  const handleRemoveItem = useCallback((localId: string) => {
    setForm((current) => {
      if (current.items.length <= 1) return current;
      return { ...current, items: current.items.filter((item) => item.localId !== localId) };
    });
    setActiveItemId((current) => (current === localId ? "" : current));
  }, []);

  const handleToggleItem = useCallback((localId: string) => {
    setActiveItemId((current) => (current === localId ? "" : localId));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalidItem = form.items.find((item) => !item.title.trim());
    if (!form.clientName.trim() || !form.quoteNumber.trim() || !form.quoteDate || invalidItem) {
      if (invalidItem) setActiveItemId(invalidItem.localId);
      toast.error("Preencha cliente, número, data e o título de todos os itens.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(isEditing ? `/api/quotes/${editId}` : "/api/quotes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: form.clientName,
            address: form.clientAddress,
            phone: form.clientPhone,
          },
          quote_number: form.quoteNumber,
          date: form.quoteDate,
          delivery_date: form.deliveryDate || null,
          valid_until: form.validUntil || null,
          status: form.status,
          payment_conditions: form.paymentConditions,
          discount: form.discount,
          notes: form.notes,
          items: form.items,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        issues?: string[];
        quoteNumber?: string;
      };
      if (!response.ok) throw new Error(result.issues?.[0] || result.error || "Erro ao salvar.");

      localStorage.removeItem(draftKey);
      if (result.quoteNumber && result.quoteNumber !== form.quoteNumber) {
        toast.info(`O número já existia. Este orçamento foi salvo como #${result.quoteNumber}.`);
      } else {
        toast.success(isEditing ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!");
      }
      router.push("/orcamentos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o orçamento.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="sr-only">Carregando orçamento</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? "Editar orçamento" : "Novo orçamento"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {draftSavedAt
            ? `Rascunho salvo às ${new Date(draftSavedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "As alterações são salvas automaticamente neste aparelho."}
        </p>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card className="border-border/60 border-t-2 border-t-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="size-5 text-primary" /> Dados do cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome do cliente</Label>
              <Input
                id="client-name"
                list="clients-list"
                value={form.clientName}
                onChange={(event) => {
                  const name = event.target.value;
                  const client = clients.find((option) => option.name === name);
                  setForm((current) => ({
                    ...current,
                    clientName: name,
                    clientAddress: client?.address ?? current.clientAddress,
                    clientPhone: client?.phone ?? current.clientPhone,
                  }));
                }}
                autoComplete="name"
                placeholder="Ex.: João da Silva"
                required
                className="border-l-4 border-l-primary bg-primary/5 font-medium sm:text-lg"
              />
              <datalist id="clients-list">
                {clients.map((client) => <option key={client.name} value={client.name} />)}
              </datalist>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-address">Endereço</Label>
                <Input
                  id="client-address"
                  value={form.clientAddress}
                  onChange={(event) => updateField("clientAddress", event.target.value)}
                  autoComplete="street-address"
                  placeholder="Rua, número e bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Celular</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.clientPhone}
                  onChange={(event) => updateField("clientPhone", event.target.value)}
                  autoComplete="tel"
                  placeholder="(86) 99999-9999"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-primary" /> Detalhes do orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-number">Número</Label>
              <Input
                id="quote-number"
                type="text"
                inputMode="numeric"
                value={form.quoteNumber}
                onChange={(event) => updateField("quoteNumber", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-date">Data</Label>
              <Input id="quote-date" type="date" value={form.quoteDate} onChange={(event) => updateField("quoteDate", event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Previsão de entrega</Label>
              <Input id="delivery-date" type="date" value={form.deliveryDate} onChange={(event) => updateField("deliveryDate", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-until">Válido até</Label>
              <Input id="valid-until" type="date" value={form.validUntil} onChange={(event) => updateField("validUntil", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="quote-status">Status</Label>
              <Select value={form.status} onValueChange={(value) => updateField("status", value as QuoteStatus)}>
                <SelectTrigger id="quote-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="size-5 text-primary" /> Itens ({form.items.length})
            </CardTitle>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              <Plus className="size-4" /> <span className="hidden sm:inline">Adicionar item</span>
              <span className="sm:hidden">Item</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.items.map((item, index) => (
              <QuoteItemEditor
                key={item.localId}
                item={item}
                index={index}
                expanded={item.localId === activeItemId}
                canRemove={form.items.length > 1}
                images={images}
                onToggle={handleToggleItem}
                onRemove={handleRemoveItem}
                onChange={handleItemChange}
                onAddDimension={handleAddDimension}
                onDimensionChange={handleDimensionChange}
                onRemoveDimension={handleRemoveDimension}
              />
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={handleAddItem}>
              <Plus className="size-4" /> Adicionar outro item
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-lg">Condições e observações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-conditions">Condições de pagamento</Label>
                <Input id="payment-conditions" value={form.paymentConditions} onChange={(event) => updateField("paymentConditions", event.target.value)} placeholder="50% na entrada e 50% na entrega" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (R$)</Label>
                <Input id="discount" type="text" inputMode="decimal" value={form.discount} onChange={(event) => updateField("discount", event.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <AutoResizeTextarea id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} maxRows={8} placeholder="Informações que aparecerão no PDF..." />
            </div>
          </CardContent>
        </Card>
      </form>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-transform md:translate-y-0 ${editingField ? "max-md:translate-y-full" : "translate-y-0"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="truncate text-2xl font-black tracking-tight text-primary">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowPreview(true)} aria-label="Visualizar e compartilhar PDF">
              <FileDown className="size-4" /> <span className="hidden sm:inline">PDF e compartilhar</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span className="hidden sm:inline">{saving ? "Salvando..." : "Salvar orçamento"}</span>
              <span className="sm:hidden">Salvar</span>
            </Button>
          </div>
        </div>
      </div>

      {showPreview && (
        <QuotePreview
          client={{ name: form.clientName, address: form.clientAddress, phone: form.clientPhone }}
          quote={{
            quote_number: form.quoteNumber,
            date: form.quoteDate,
            delivery_date: form.deliveryDate,
            valid_until: form.validUntil,
            payment_conditions: form.paymentConditions,
            discount: parseLocaleNumber(form.discount) ?? 0,
            notes: form.notes,
            total,
            items: form.items.map((item) => ({
              localId: item.localId,
              title: item.title,
              image_url: item.image_url,
              width: parseLocaleNumber(item.width) ?? 0,
              height: parseLocaleNumber(item.height) ?? 0,
              glass: item.glass,
              aluminum: item.aluminum,
              hardware: item.hardware,
              quantity: parseLocaleNumber(item.quantity) ?? 1,
              unit_price: parseLocaleNumber(item.unit_price) ?? 0,
              total_price: parseLocaleNumber(item.total_price) ?? 0,
              dimensions: item.dimensions.map((dimension) => ({
                localId: dimension.localId,
                label: dimension.label,
                width: parseLocaleNumber(dimension.width) ?? 0,
                height: parseLocaleNumber(dimension.height) ?? 0,
                quantity: parseLocaleNumber(dimension.quantity) ?? 1,
                unit_price: parseLocaleNumber(dimension.unit_price) ?? 0,
                total_price: parseLocaleNumber(dimension.total_price) ?? 0,
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
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
      <QuoteFormContent />
    </Suspense>
  );
}
