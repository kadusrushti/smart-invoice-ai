import { useState } from 'react';
import { Check, Copy, AlertCircle } from 'lucide-react';
import type { ExtractedInvoice, FieldConfidence } from '@/types/invoice';
import ConfidenceBadge from './ConfidenceBadge';

interface DataEditorProps {
  invoice: ExtractedInvoice;
  onChange: (invoice: ExtractedInvoice) => void;
}

const fieldLabels: Record<string, string> = {
  vendorName: 'Vendor / Supplier Name',
  vendorAddress: 'Vendor Address',
  cin: 'CIN',
  invoiceNumber: 'Invoice Number',
  invoiceDate: 'Invoice Date',
  dueDate: 'Due Date',
  gstin: 'GSTIN (Supplier)',
  pan: 'PAN',
  recipientName: 'Recipient / Customer Name',
  recipientAddress: 'Recipient Address',
  recipientGstin: 'Recipient GSTIN',
  placeOfSupply: 'Place of Supply',
  stateCode: 'State Code',
  poNumber: 'PO Number',
  poDate: 'PO Date',
  orderNumber: 'Order Number',
  orderQuantity: 'Order Quantity',
  invoiceReference: 'Invoice Reference',
  reverseCharge: 'Reverse Charge',
  subtotal: 'Subtotal / Taxable Value',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  totalTax: 'Total Tax',
  tcs: 'TCS',
  roundOff: 'Round Off',
  grandTotal: 'Grand Total',
  taxAmountInWords: 'Tax Amount in Words',
  totalAmountInWords: 'Total Amount in Words',
  currency: 'Currency',
};

const editableFields: Array<{ key: keyof ExtractedInvoice; wide?: boolean }> = [
  { key: 'vendorName' },
  { key: 'vendorAddress', wide: true },
  { key: 'cin', wide: true },
  { key: 'invoiceNumber' },
  { key: 'invoiceDate' },
  { key: 'dueDate' },
  { key: 'gstin' },
  { key: 'pan' },
  { key: 'recipientName', wide: true },
  { key: 'recipientAddress', wide: true },
  { key: 'recipientGstin' },
  { key: 'placeOfSupply' },
  { key: 'stateCode' },
  { key: 'poNumber' },
  { key: 'poDate' },
  { key: 'orderNumber' },
  { key: 'orderQuantity' },
  { key: 'invoiceReference' },
  { key: 'reverseCharge' },
  { key: 'currency' },
  { key: 'subtotal' },
  { key: 'cgst' },
  { key: 'sgst' },
  { key: 'igst' },
  { key: 'totalTax' },
  { key: 'tcs' },
  { key: 'roundOff' },
  { key: 'grandTotal' },
  { key: 'taxAmountInWords', wide: true },
  { key: 'totalAmountInWords', wide: true },
];

const currencyFields = new Set(['subtotal', 'cgst', 'sgst', 'igst', 'totalTax', 'tcs', 'roundOff', 'grandTotal']);

export default function DataEditor({ invoice, onChange }: DataEditorProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const updateField = (key: keyof ExtractedInvoice, value: string) => {
    const f = invoice[key] as FieldConfidence;
    onChange({ ...invoice, [key]: { ...f, value } });
  };

  const copyField = (key: keyof ExtractedInvoice) => {
    const f = invoice[key] as FieldConfidence;
    navigator.clipboard.writeText(f.value);
    setCopiedField(key as string);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Extracted Fields</h3>
        <span className="text-xs text-slate-500">Click any field to edit</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {editableFields.map(({ key, wide }) => {
          const f = invoice[key] as FieldConfidence;
          const isCurrency = currencyFields.has(key as string);
          const isLowConf = f.confidence < 0.75 && f.value !== '';
          return (
            <div key={key} className={wide ? 'sm:col-span-2' : ''}>
              <label className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{fieldLabels[key]}</span>
                {f.value && <ConfidenceBadge confidence={f.confidence} size="sm" />}
              </label>
              <div className="group relative">
                {isCurrency && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
                )}
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => updateField(key, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="—"
                  className={`w-full rounded-lg border bg-slate-900/50 py-2 pr-9 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 ${
                    isCurrency ? 'pl-7' : 'pl-3'
                  } ${
                    isLowConf
                      ? 'border-amber-500/40 focus:border-amber-400 focus:ring-amber-500/20'
                      : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20'
                  }`}
                />
                <button
                  onClick={() => copyField(key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 opacity-0 transition-all hover:text-cyan-400 group-hover:opacity-100"
                  title="Copy value"
                >
                  {copiedField === key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              {isLowConf && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Low confidence — please verify
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
