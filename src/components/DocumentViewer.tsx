import { FileText, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ExtractedInvoice, UploadedDocument } from '@/types/invoice';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface DocumentViewerProps {
  document: UploadedDocument;
  invoice: ExtractedInvoice | null;
}

export default function DocumentViewer({ document: doc, invoice }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const isImage = doc.type.startsWith('image/');

  useEffect(() => {
    setPdfDataUrl(null);
    if (!doc.isSample && !isImage && doc.url) {
      fetch(doc.url)
        .then((r) => r.arrayBuffer())
        .then(async (buf) => {
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          setPdfDataUrl(canvas.toDataURL('image/png'));
        })
        .catch(() => {});
    }
  }, [doc.url, doc.isSample, isImage]);

  const showImage = isImage ? doc.url : pdfDataUrl;
  const showPdfPreview = !isImage && !doc.isSample && pdfDataUrl;
  const showSamplePreview = !isImage && doc.isSample;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="truncate text-sm font-medium text-white">{doc.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {doc.url && (
            <a
              href={doc.url}
              download={doc.name}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-950/50 p-4 sm:p-8">
        <div
          className="mx-auto origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, maxWidth: '650px' }}
        >
          {showImage ? (
            <img src={showImage} alt={doc.name} className="w-full rounded-lg shadow-2xl" />
          ) : showPdfPreview ? (
            <img src={pdfDataUrl || ''} alt={doc.name} className="w-full rounded-lg shadow-2xl" />
          ) : showSamplePreview ? (
            <InvoicePaperPreview doc={doc} invoice={invoice} />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoicePaperPreview({ doc, invoice }: { doc: UploadedDocument; invoice: ExtractedInvoice | null }) {
  const isReceipt = doc.name.toLowerCase().includes('receipt');

  return (
    <div className="rounded-lg bg-white p-8 shadow-2xl" style={{ fontFamily: 'Georgia, serif' }}>
      {isReceipt ? (
        <ReceiptPreview invoice={invoice} />
      ) : (
        <GstInvoicePreview invoice={invoice} />
      )}
    </div>
  );
}

function GstInvoicePreview({ invoice }: { invoice: ExtractedInvoice | null }) {
  if (!invoice) {
    return <div className="py-20 text-center text-gray-400">Loading document...</div>;
  }
  const fmt = (v: string) => parseFloat(v || '0').toFixed(2);
  const hasIgst = parseFloat(invoice.igst.value || '0') > 0;

  return (
    <div className="text-gray-800">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between border-b-2 border-gray-800 pb-4">
        <div>
          <div className="mb-2 text-xl font-bold tracking-tight">{invoice.vendorName.value || 'TAX INVOICE'}</div>
          {invoice.vendorAddress.value && (
            <div className="max-w-xs text-xs leading-relaxed text-gray-500">{invoice.vendorAddress.value}</div>
          )}
          {invoice.cin.value && <div className="mt-1 text-[10px] text-gray-400">CIN: {invoice.cin.value}</div>}
        </div>
        <div className="text-right">
          <div className="mb-1 text-lg font-bold text-gray-700">TAX INVOICE</div>
          <div className="text-xs text-gray-500">Invoice No: <span className="font-semibold text-gray-700">{invoice.invoiceNumber.value}</span></div>
          <div className="text-xs text-gray-500">Date: {invoice.invoiceDate.value}</div>
          {invoice.dueDate.value && <div className="text-xs text-gray-500">Due: {invoice.dueDate.value}</div>}
        </div>
      </div>

      {/* Supplier & Recipient */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-1 font-semibold text-gray-600">SUPPLIER DETAILS</div>
          <div className="font-medium text-gray-800">{invoice.vendorName.value}</div>
          <div className="text-gray-500">{invoice.gstin.value}</div>
          <div className="text-gray-500">PAN: {invoice.pan.value}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-1 font-semibold text-gray-600">RECIPIENT DETAILS</div>
          <div className="font-medium text-gray-800">{invoice.recipientName.value || '—'}</div>
          <div className="text-gray-500">{invoice.recipientAddress.value || '—'}</div>
          <div className="text-gray-500">GSTIN: {invoice.recipientGstin.value || '—'}</div>
        </div>
      </div>

      {/* Order & Supply Info */}
      <div className="mb-4 grid grid-cols-4 gap-2 text-[10px]">
        <div className="rounded border border-gray-200 p-2">
          <span className="text-gray-400">PO No:</span> <span className="font-medium">{invoice.poNumber.value || '—'}</span>
        </div>
        <div className="rounded border border-gray-200 p-2">
          <span className="text-gray-400">PO Date:</span> <span className="font-medium">{invoice.poDate.value || '—'}</span>
        </div>
        <div className="rounded border border-gray-200 p-2">
          <span className="text-gray-400">Order No:</span> <span className="font-medium">{invoice.orderNumber.value || '—'}</span>
        </div>
        <div className="rounded border border-gray-200 p-2">
          <span className="text-gray-400">Place of Supply:</span> <span className="font-medium">{invoice.placeOfSupply.value || '—'}</span>
        </div>
      </div>

      {/* Line Items */}
      <table className="mb-4 w-full text-xs">
        <thead>
          <tr className="border-b-2 border-gray-400 text-left text-gray-500">
            <th className="pb-2">#</th>
            <th className="pb-2">Description</th>
            <th className="pb-2 text-center">HSN</th>
            <th className="pb-2 text-center">Qty</th>
            <th className="pb-2 text-right">Rate</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-1.5">{i + 1}</td>
              <td className="py-1.5">{item.description}</td>
              <td className="py-1.5 text-center font-mono">{item.hsnCode || '—'}</td>
              <td className="py-1.5 text-center">{item.quantity} {item.unit}</td>
              <td className="py-1.5 text-right">₹{item.unitPrice.toFixed(2)}</td>
              <td className="py-1.5 text-right">₹{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tax Breakdown */}
      <div className="flex justify-between">
        <div className="w-1/2 text-[10px] text-gray-500">
          {invoice.totalAmountInWords.value && (
            <div className="rounded bg-gray-50 p-2">
              <span className="font-semibold">Invoice Amount in Words: </span>
              {invoice.totalAmountInWords.value}
            </div>
          )}
        </div>
        <div className="w-56 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Taxable Value:</span>
            <span>₹{fmt(invoice.subtotal.value)}</span>
          </div>
          {hasIgst ? (
            <div className="flex justify-between">
              <span className="text-gray-500">IGST:</span>
              <span>₹{fmt(invoice.igst.value)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">CGST:</span>
                <span>₹{fmt(invoice.cgst.value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SGST:</span>
                <span>₹{fmt(invoice.sgst.value)}</span>
              </div>
            </>
          )}
          {parseFloat(invoice.tcs.value || '0') > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">TCS:</span>
              <span>₹{fmt(invoice.tcs.value)}</span>
            </div>
          )}
          {parseFloat(invoice.roundOff.value || '0') !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Round Off:</span>
              <span>₹{fmt(invoice.roundOff.value)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-300 pt-1">
            <span className="text-gray-500">Total Tax:</span>
            <span>₹{fmt(invoice.totalTax.value)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-gray-800 pt-1.5 text-sm font-bold">
            <span>Grand Total:</span>
            <span>₹{fmt(invoice.grandTotal.value)}</span>
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div className="mt-6 border-t border-gray-200 pt-3">
        <div className="text-[10px] text-gray-400">
          <span className="font-semibold">Declaration: </span>
          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-gray-400">
          <div>Reverse Charge: {invoice.reverseCharge.value || 'No'}</div>
          <div>This is a computer-generated invoice.</div>
        </div>
      </div>
    </div>
  );
}

function ReceiptPreview({ invoice }: { invoice: ExtractedInvoice | null }) {
  if (!invoice) {
    return <div className="py-20 text-center text-gray-400">Loading document...</div>;
  }
  const fmt = (v: string) => parseFloat(v || '0').toFixed(2);
  return (
    <div className="text-gray-800">
      <div className="mb-4 text-center">
        <div className="mb-1 text-xl font-bold uppercase tracking-wider">{invoice.vendorName.value}</div>
        {invoice.vendorAddress.value && <div className="text-xs text-gray-500">{invoice.vendorAddress.value}</div>}
        {invoice.gstin.value && <div className="text-xs text-gray-500">GSTIN: {invoice.gstin.value}</div>}
      </div>
      <div className="mb-3 border-y border-dashed border-gray-300 py-2 text-center text-xs text-gray-500">
        RECEIPT #{invoice.invoiceNumber.value} — {invoice.invoiceDate.value}
      </div>
      <table className="mb-3 w-full text-sm">
        <tbody>
          {invoice.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-dashed border-gray-100">
              <td className="py-1.5">
                {item.description}
                <span className="block text-xs text-gray-400">{item.quantity} {item.unit} x ₹{item.unitPrice.toFixed(2)}</span>
              </td>
              <td className="py-1.5 text-right">₹{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-dashed border-gray-300 pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal:</span>
          <span>₹{fmt(invoice.subtotal.value)}</span>
        </div>
        {parseFloat(invoice.cgst.value || '0') > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">CGST + SGST:</span>
            <span>₹{fmt(invoice.totalTax.value)}</span>
          </div>
        )}
        {parseFloat(invoice.igst.value || '0') > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">IGST:</span>
            <span>₹{fmt(invoice.igst.value)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL:</span>
          <span>₹{fmt(invoice.grandTotal.value)}</span>
        </div>
      </div>
      <div className="mt-4 text-center text-xs text-gray-400">
        Thank you for your business!
      </div>
    </div>
  );
}
