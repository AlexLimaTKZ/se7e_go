export interface QuotePreviewClient {
  name: string;
  address: string;
  phone: string;
}

export interface QuotePreviewDimension {
  localId?: string;
  label: string;
  width: number;
  height: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface QuotePreviewItem {
  localId?: string;
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
  dimensions?: QuotePreviewDimension[];
}

export interface QuotePreviewData {
  quote_number: string;
  date: string;
  delivery_date: string;
  valid_until: string;
  payment_conditions?: string;
  discount?: number;
  notes?: string;
  total: number;
  items: QuotePreviewItem[];
}
