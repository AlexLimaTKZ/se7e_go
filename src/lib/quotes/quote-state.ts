import { parseLocaleNumber } from "./quote-input";

export interface QuoteDimensionState {
  localId: string;
  label: string;
  width: string;
  height: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

export interface QuoteItemState extends QuoteDimensionState {
  title: string;
  image_url: string;
  glass: string;
  aluminum: string;
  hardware: string;
  dimensions: QuoteDimensionState[];
}

export type QuoteItemField = Exclude<keyof QuoteItemState, "dimensions" | "localId">;
export type QuoteDimensionField = Exclude<keyof QuoteDimensionState, "localId">;

export function createLocalId(): string {
  return crypto.randomUUID();
}

export function createEmptyQuoteDimension(
  idFactory: () => string = createLocalId,
): QuoteDimensionState {
  return {
    localId: idFactory(),
    label: "",
    width: "",
    height: "",
    quantity: "1",
    unit_price: "",
    total_price: "0",
  };
}

export function createEmptyQuoteItem(
  idFactory: () => string = createLocalId,
): QuoteItemState {
  return {
    ...createEmptyQuoteDimension(idFactory),
    title: "",
    image_url: "",
    glass: "",
    aluminum: "",
    hardware: "",
    dimensions: [],
  };
}

function normalizedNumericValue(value: string): string {
  return value.replace(",", ".");
}

function calculateTotal(quantityValue: string, unitPriceValue: string): string {
  const parsedQuantity = parseLocaleNumber(quantityValue) ?? 0;
  const parsedUnitPrice = parseLocaleNumber(unitPriceValue) ?? 0;
  return (parsedQuantity * parsedUnitPrice).toFixed(2);
}

export function updateQuoteItem(
  items: QuoteItemState[],
  localId: string,
  field: QuoteItemField,
  value: string,
): QuoteItemState[] {
  return items.map((item) => {
    if (item.localId !== localId) return item;
    const nextValue = field === "quantity" || field === "unit_price" ? normalizedNumericValue(value) : value;
    const updated = { ...item, [field]: nextValue };
    if (field === "quantity" || field === "unit_price") {
      updated.total_price = calculateTotal(updated.quantity, updated.unit_price);
    }
    return updated;
  });
}

export function addQuoteDimension(
  items: QuoteItemState[],
  itemLocalId: string,
  idFactory: () => string = createLocalId,
): QuoteItemState[] {
  return items.map((item) =>
    item.localId === itemLocalId
      ? { ...item, dimensions: [...item.dimensions, createEmptyQuoteDimension(idFactory)] }
      : item,
  );
}

export function updateQuoteDimension(
  items: QuoteItemState[],
  itemLocalId: string,
  dimensionLocalId: string,
  field: QuoteDimensionField,
  value: string,
): QuoteItemState[] {
  return items.map((item) => {
    if (item.localId !== itemLocalId) return item;
    const dimensions = item.dimensions.map((dimension) => {
      if (dimension.localId !== dimensionLocalId) return dimension;
      const nextValue =
        field === "quantity" || field === "unit_price" ? normalizedNumericValue(value) : value;
      const updated = { ...dimension, [field]: nextValue };
      if (field === "quantity" || field === "unit_price") {
        updated.total_price = calculateTotal(updated.quantity, updated.unit_price);
      }
      return updated;
    });
    return {
      ...item,
      dimensions,
      total_price: dimensions
        .reduce((sum, dimension) => sum + (parseLocaleNumber(dimension.total_price) ?? 0), 0)
        .toFixed(2),
    };
  });
}

export function removeQuoteDimension(
  items: QuoteItemState[],
  itemLocalId: string,
  dimensionLocalId: string,
): QuoteItemState[] {
  return items.map((item) => {
    if (item.localId !== itemLocalId) return item;
    const dimensions = item.dimensions.filter(
      (dimension) => dimension.localId !== dimensionLocalId,
    );
    return {
      ...item,
      dimensions,
      total_price:
        dimensions.length === 0
          ? item.total_price
          : dimensions
              .reduce(
                (sum, dimension) => sum + (parseLocaleNumber(dimension.total_price) ?? 0),
                0,
              )
              .toFixed(2),
    };
  });
}
