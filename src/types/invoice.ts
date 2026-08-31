export interface DetailField {
  label: string;
  value: string;
  confidence: number;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

export interface LineItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  confidence: number;
}

export interface FieldConfidence {
  value: string;
  confidence: number;
}

export interface ExtractedInvoice {
  vendorName: FieldConfidence;
  vendorAddress: FieldConfidence;
  invoiceNumber: FieldConfidence;
  invoiceDate: FieldConfidence;
  dueDate: FieldConfidence;
  gstin: FieldConfidence;
  pan: FieldConfidence;
  cin: FieldConfidence;
  recipientName: FieldConfidence;
  recipientAddress: FieldConfidence;
  recipientGstin: FieldConfidence;
  placeOfSupply: FieldConfidence;
  stateCode: FieldConfidence;
  poNumber: FieldConfidence;
  poDate: FieldConfidence;
  orderNumber: FieldConfidence;
  orderQuantity: FieldConfidence;
  invoiceReference: FieldConfidence;
  reverseCharge: FieldConfidence;
  subtotal: FieldConfidence;
  cgst: FieldConfidence;
  sgst: FieldConfidence;
  igst: FieldConfidence;
  totalTax: FieldConfidence;
  tcs: FieldConfidence;
  roundOff: FieldConfidence;
  grandTotal: FieldConfidence;
  taxAmountInWords: FieldConfidence;
  totalAmountInWords: FieldConfidence;
  currency: FieldConfidence;
  lineItems: LineItem[];
  detailSections: DetailSection[];
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  isSample: boolean;
  thumbnailUrl?: string;
}

export type ExportFormat = 'json' | 'xlsx' | 'csv';

export interface SampleInvoice {
  id: string;
  name: string;
  vendor: string;
  total: number;
  type: 'invoice' | 'receipt';
  preview: string;
  data: ExtractedInvoice;
}
