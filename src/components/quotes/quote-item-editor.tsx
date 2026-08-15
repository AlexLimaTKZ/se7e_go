"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp, Plus, Ruler, Trash2 } from "lucide-react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Button } from "@/components/ui/button";
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
import type {
  QuoteDimensionField,
  QuoteItemField,
  QuoteItemState,
} from "@/lib/quotes/quote-state";

interface ImageOption {
  name: string;
  url: string;
}

interface QuoteItemEditorProps {
  index: number;
  item: QuoteItemState;
  expanded: boolean;
  canRemove: boolean;
  images: ImageOption[];
  onToggle: (localId: string) => void;
  onRemove: (localId: string) => void;
  onChange: (localId: string, field: QuoteItemField, value: string) => void;
  onAddDimension: (localId: string) => void;
  onDimensionChange: (
    itemLocalId: string,
    dimensionLocalId: string,
    field: QuoteDimensionField,
    value: string,
  ) => void;
  onRemoveDimension: (itemLocalId: string, dimensionLocalId: string) => void;
}

const decimalProps = {
  inputMode: "decimal" as const,
  type: "text",
};

export const QuoteItemEditor = memo(function QuoteItemEditor({
  index,
  item,
  expanded,
  canRemove,
  images,
  onToggle,
  onRemove,
  onChange,
  onAddDimension,
  onDimensionChange,
  onRemoveDimension,
}: QuoteItemEditorProps) {
  const prefix = `item-${item.localId}`;

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card" aria-labelledby={`${prefix}-title`}>
      <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onToggle(item.localId)}
          aria-expanded={expanded}
          aria-controls={`${prefix}-fields`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span id={`${prefix}-title`} className="block truncate text-sm font-semibold">
              {item.title || `Item ${index + 1} sem título`}
            </span>
            <span className="block text-xs text-muted-foreground">
              {item.dimensions.length > 0
                ? `${item.dimensions.length} dimensão${item.dimensions.length === 1 ? "" : "ões"}`
                : `${item.quantity || "0"} unidade${item.quantity === "1" ? "" : "s"}`}
              {" · "}
              {formatCurrency(Number(item.total_price) || 0)}
            </span>
          </span>
          {expanded ? <ChevronUp className="size-5 shrink-0" /> : <ChevronDown className="size-5 shrink-0" />}
        </button>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.localId)}
            aria-label={`Excluir item ${index + 1}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {expanded && (
        <div id={`${prefix}-fields`} className="space-y-5 border-t border-border/60 p-3 sm:p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-image`}>Imagem</Label>
              <Select
                value={item.image_url || "none"}
                onValueChange={(value) =>
                  onChange(item.localId, "image_url", value === "none" ? "" : String(value))
                }
              >
                <SelectTrigger id={`${prefix}-image`}>
                  <SelectValue placeholder="Selecionar imagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {images.map((image) => (
                    <SelectItem key={image.url} value={image.url}>
                      {image.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-title-input`}>Título</Label>
              <AutoResizeTextarea
                id={`${prefix}-title-input`}
                value={item.title}
                onChange={(event) => onChange(item.localId, "title", event.target.value)}
                placeholder="Ex.: Box de vidro do banheiro"
                maxRows={3}
                required
              />
            </div>
          </div>

          {item.dimensions.length === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-width`}>Largura (mm)</Label>
                  <Input
                    id={`${prefix}-width`}
                    {...decimalProps}
                    value={item.width}
                    onChange={(event) => onChange(item.localId, "width", event.target.value)}
                    placeholder="1200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-height`}>Altura (mm)</Label>
                  <Input
                    id={`${prefix}-height`}
                    {...decimalProps}
                    value={item.height}
                    onChange={(event) => onChange(item.localId, "height", event.target.value)}
                    placeholder="2100"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {([
                  ["glass", "Cor do vidro", "Incolor"],
                  ["aluminum", "Cor do alumínio", "Preto"],
                  ["hardware", "Cor das ferragens", "Cromado"],
                ] as const).map(([field, label, placeholder]) => (
                  <div className="space-y-2" key={field}>
                    <Label htmlFor={`${prefix}-${field}`}>{label}</Label>
                    <Input
                      id={`${prefix}-${field}`}
                      value={item[field]}
                      onChange={(event) => onChange(item.localId, field, event.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-quantity`}>Quantidade</Label>
                  <Input
                    id={`${prefix}-quantity`}
                    type="text"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(event) => onChange(item.localId, "quantity", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-unit-price`}>Valor unitário (R$)</Label>
                  <Input
                    id={`${prefix}-unit-price`}
                    {...decimalProps}
                    value={item.unit_price}
                    onChange={(event) => onChange(item.localId, "unit_price", event.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-total`}>Total do item (R$)</Label>
                  <Input
                    id={`${prefix}-total`}
                    {...decimalProps}
                    value={item.total_price}
                    onChange={(event) => onChange(item.localId, "total_price", event.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {item.dimensions.length > 0 && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Ruler className="size-4 text-primary" /> Dimensões
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddDimension(item.localId)}
                >
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>
              {item.dimensions.map((dimension, dimensionIndex) => {
                const dimensionPrefix = `${prefix}-dimension-${dimension.localId}`;
                return (
                  <fieldset key={dimension.localId} className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-6">
                    <legend className="px-1 text-xs font-semibold text-muted-foreground">
                      Medida {dimensionIndex + 1}
                    </legend>
                    {([
                      ["label", "Local", "Sala"],
                      ["width", "Largura", "mm"],
                      ["height", "Altura", "mm"],
                      ["quantity", "Qtd.", "1"],
                      ["unit_price", "Valor unit.", "0,00"],
                      ["total_price", "Total", "0,00"],
                    ] as const).map(([field, label, placeholder]) => (
                      <div className={field === "label" ? "col-span-2 sm:col-span-1" : "space-y-1"} key={field}>
                        <Label htmlFor={`${dimensionPrefix}-${field}`} className="text-xs">
                          {label}
                        </Label>
                        <Input
                          id={`${dimensionPrefix}-${field}`}
                          {...(field === "label"
                            ? { type: "text" }
                            : field === "quantity"
                              ? { type: "text", inputMode: "numeric" as const }
                              : decimalProps)}
                          value={dimension[field]}
                          onChange={(event) =>
                            onDimensionChange(
                              item.localId,
                              dimension.localId,
                              field,
                              event.target.value,
                            )
                          }
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      className="col-span-2 justify-self-end text-destructive sm:col-span-6"
                      onClick={() => onRemoveDimension(item.localId, dimension.localId)}
                      aria-label={`Excluir medida ${dimensionIndex + 1}`}
                    >
                      <Trash2 className="size-4" /> Excluir medida
                    </Button>
                  </fieldset>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => onAddDimension(item.localId)}
            className="text-muted-foreground"
          >
            <Ruler className="size-4" />
            {item.dimensions.length > 0 ? "Adicionar outra dimensão" : "Usar múltiplas dimensões"}
          </Button>
        </div>
      )}
    </section>
  );
});
