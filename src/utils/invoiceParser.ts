/**
 * Indian Invoice Parser — extracts GST invoice fields from raw OCR text.
 *
 * Handles Indian GST invoice formats: GSTIN, PAN, CGST/SGST/IGST,
 * HSN codes, Place of Supply, DD/MM/YYYY dates, Rupee amounts.
 */

import type { DetailField, DetailSection, ExtractedInvoice, FieldConfidence, LineItem } from '@/types/invoice';

const uid = () => Math.random().toString(36).slice(2, 11);

function field(value: string, confidence: number): FieldConfidence {
  return { value: value.trim(), confidence: Math.round(confidence * 100) / 100 };
}

// ---------- Helpers ----------

function tryPatterns(text: string, patterns: RegExp[]): { match: string; index: number } | null {
  for (let i = 0; i < patterns.length; i++) {
    const m = text.match(patterns[i]);
    if (m && m[1]) {
      return { match: m[1].trim(), index: i };
    }
  }
  return null;
}

function confidenceFromIndex(index: number, base = 0.95): number {
  return Math.max(0.5, base - index * 0.05);
}

function parseAmount(raw: string): string {
  let cleaned = raw.replace(/[,$₹]/g, '').trim();
  cleaned = cleaned.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

function normalizeDate(raw: string): string {
  const s = raw.trim();

  // Already ISO: 2024-03-15
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // DD/MM/YYYY (Indian standard — assume DD first)
  m = s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) {
    const day = parseInt(m[1]);
    const month = parseInt(m[2]);
    if (day <= 31 && month <= 12) {
      return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD-MM-YYYY
  m = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m) {
    const day = parseInt(m[1]);
    const month = parseInt(m[2]);
    if (day <= 31 && month <= 12) {
      return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Month DD, YYYY
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
    sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
  };
  m = s.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m && months[m[1].toLowerCase()]) {
    return `${m[3]}-${months[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
  }

  // YYYY/MM/DD
  m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  return s;
}

// ---------- Field extractors ----------

function extractVendorName(text: string): FieldConfidence {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return field('', 0.2);

  const skipWords = ['invoice', 'receipt', 'bill', 'tax', 'statement', 'date', 'number', 'no.', 'from', 'to', 'page', 'gstin', 'pan', 'hsn', 'cgst', 'sgst', 'igst', 'total', 'subtotal', 'grand'];

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (line.length < 3) continue;
    if (skipWords.some((w) => lower === w || lower.startsWith(w + ' '))) continue;
    if (/^\d/.test(line)) continue;
    if (/^(date|invoice|receipt|bill|to|from|ship|bill to|gstin|pan|hsn|place)/i.test(line)) continue;
    if (/GSTIN/i.test(line)) continue;

    const cleaned = line.replace(/[|]{2,}/g, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3 && /[a-zA-Z]/.test(cleaned)) {
      return field(cleaned, 0.85);
    }
  }

  return field(lines[0], 0.6);
}

function extractVendorAddress(text: string): FieldConfidence {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const addrLines: string[] = [];

  for (const line of lines) {
    if (/GSTIN|PAN|HSN|CGST|SGST|IGST|Invoice|Date|Total|Subtotal|Grand/i.test(line)) break;
    if (/\d{6}\s*$/.test(line) || /pincode|pin/i.test(line)) {
      addrLines.push(line);
      break;
    }
    if (line.length > 5 && /\d/.test(line) && /[a-zA-Z]/.test(line)) {
      addrLines.push(line);
    }
    if (addrLines.length >= 3) break;
  }

  if (addrLines.length > 0) return field(addrLines.join(', '), 0.7);
  return field('', 0.3);
}

function extractInvoiceNumber(text: string): FieldConfidence {
  const result = tryPatterns(text, [
    /invoice\s*(?:no|number|#|num)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]+)/i,
    /\b(invoice|inv|bill)\s*#?\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{3,})\b/i,
    /\b(receipt|rec)\s*#?\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{3,})\b/i,
    /\b(INV[-\/]\d{3,}[-\/]?\d*)\b/i,
    /\b#\s*([A-Za-z0-9][A-Za-z0-9\-\/]{3,})\b/i,
  ]);
  if (result) return field(result.match, confidenceFromIndex(result.index, 0.92));
  return field('', 0.3);
}

function extractDate(text: string, label: string, fallbackLabel?: string): FieldConfidence {
  const patterns = [
    new RegExp(`${label}\\s*[:.]?\\s*(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})`, 'i'),
    new RegExp(`${label}\\s*[:.]?\\s*(\\d{1,2}[/.]\\d{1,2}[/.]\\d{4})`, 'i'),
    new RegExp(`${label}\\s*[:.]?\\s*(\\d{1,2}-\\d{1,2}-\\d{4})`, 'i'),
    new RegExp(`${label}\\s*[:.]?\\s*(\\w+\\s+\\d{1,2},?\\s*\\d{4})`, 'i'),
  ];

  let result = tryPatterns(text, patterns);
  if (!result && fallbackLabel) {
    const fbPatterns = [
      new RegExp(`${fallbackLabel}\\s*[:.]?\\s*(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})`, 'i'),
      new RegExp(`${fallbackLabel}\\s*[:.]?\\s*(\\d{1,2}[/.]\\d{1,2}[/.]\\d{4})`, 'i'),
      new RegExp(`${fallbackLabel}\\s*[:.]?\\s*(\\d{1,2}-\\d{1,2}-\\d{4})`, 'i'),
    ];
    result = tryPatterns(text, fbPatterns);
  }

  if (result) {
    return field(normalizeDate(result.match), confidenceFromIndex(result.index, 0.9));
  }
  return field('', 0.3);
}

function extractGSTIN(text: string): FieldConfidence {
  const result = tryPatterns(text, [
    /GSTIN\s*[:.]?\s*([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)/i,
    /GSTIN\s*[:.]?\s*([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)/,
    /\b([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)\b/,
    /GST\s*(?:No|Number|ID)?\s*[:.]?\s*([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)/i,
  ]);
  if (result) return field(result.match.toUpperCase(), confidenceFromIndex(result.index, 0.93));
  return field('', 0.3);
}

function extractPAN(text: string): FieldConfidence {
  const result = tryPatterns(text, [
    /PAN\s*[:.]?\s*([A-Z]{5}\d{4}[A-Z])\b/i,
    /\b([A-Z]{5}\d{4}[A-Z])\b/,
  ]);
  if (result) return field(result.match.toUpperCase(), confidenceFromIndex(result.index, 0.88));
  return field('', 0.3);
}

function extractPlaceOfSupply(text: string): FieldConfidence {
  const result = tryPatterns(text, [
    /place\s*of\s*supply\s*[:.]?\s*(.+?)(?:\n|$)/i,
    /supply\s*[:.]?\s*(.+?)(?:\n|$)/i,
  /place\s*[:.]?\s*(.+?)(?:\n|$)/i,
  ]);
  if (result) return field(result.match, confidenceFromIndex(result.index, 0.85));
  return field('', 0.3);
}

function extractAmount(text: string, labels: string[]): FieldConfidence {
  const patterns = labels.map((label) =>
    new RegExp(`${label}\\s*[:.]?\\s*₹?\\s*\\$?\\s*([\\d,]+\\.?\\d{2})`, 'i')
  );
  const result = tryPatterns(text, patterns);
  if (result) {
    const val = parseAmount(result.match);
    if (val) return field(val, confidenceFromIndex(result.index, 0.9));
  }
  return field('', 0.3);
}


function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeled(text: string, labels: string[], fallback = ''): FieldConfidence {
  const escaped = labels.map((label) => escapeRegex(label));
  const result = tryPatterns(text, escaped.map((label) => new RegExp(`${label}\\s*[:.]?\\s*(.+?)(?:\\n|$)`, 'i')));
  return result ? field(result.match.replace(/\s+/g, ' '), confidenceFromIndex(result.index, 0.84)) : field(fallback, 0.3);
}

function makeDetailSections(text: string): DetailSection[] {
  const sectionDefinitions: Array<{ title: string; fields: Array<[string, string[]]> }> = [
    {
      title: 'Invoice & Order Details',
      fields: [
        ['Invoice Reference', ['invoice reference no', 'invoice ref']],
        ['PO Number', ['recipient po no', 'po number', 'po no']],
        ['PO Date', ['recipient po date', 'po date']],
        ['Order Number', ['order no', 'order number']],
        ['Order Quantity', ['order qty', 'order quantity']],
        ['DC Number', ['d.c.no', 'dc no', 'delivery challan no']],
        ['DC Date', ['d.c.date', 'dc date', 'delivery challan date']],
      ],
    },
    {
      title: 'Delivery & Transport',
      fields: [
        ['Vehicle Number', ['vehicle no', 'vehicle number']],
        ['Transporter', ['transporter', 'transporter name']],
        ['Driver Name', ['driver name']],
        ['Driver Mobile', ['driver mob', 'driver mobile']],
        ['LR Number', ['lr no', 'lorry receipt no']],
        ['LR Date', ['lr date']],
        ['Pump Description', ['pump description']],
        ['Pump Quantity', ['pump qty', 'pump quantity']],
        ['Invoice Time', ['invoice time']],
        ['E-Way Bill No.', ['eway bill no', 'e-way bill no']],
      ],
    },
    {
      title: 'Production Details',
      fields: [
        ['Material Description', ['material description']],
        ['Cement Type', ['cement type']],
        ['Mix Design', ['mix design']],
        ['Max Size', ['max size']],
        ['Slump / Flow', ['slump/flow', 'slump / flow']],
        ['Water Added', ['water added']],
        ['Batching Time', ['batching time']],
        ['Pour Structure', ['pour structure']],
        ['Max W/C Ratio', ['max w/c ratio']],
        ['Admixture', ['admixture']],
      ],
    },
  ];

  return sectionDefinitions.map((section) => ({
    title: section.title,
    fields: section.fields.map(([label, labels]) => {
      const extracted = extractLabeled(text, labels);
      return { label, value: extracted.value, confidence: extracted.confidence };
    }),
  }));
}

function extractCurrency(text: string): FieldConfidence {
  if (/₹|INR|Rs\.?\b/i.test(text)) return field('INR', 0.98);
  const result = tryPatterns(text, [/\b(USD|EUR|GBP|AUD|CAD|JPY|CNY|SGD|AED)\b/i]);
  if (result) return field(result.match.toUpperCase(), 0.95);
  return field('INR', 0.6);
}

// ---------- Line items extraction ----------

function extractLineItems(text: string): LineItem[] {
  const items: LineItem[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let startIdx = -1;
  let endIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (startIdx === -1) {
      if (/description|item|product|service|particulars|goods/i.test(lower) &&
          (/qty|quantity|price|amount|total|rate|hsn/i.test(lower))) {
        startIdx = i + 1;
      }
    } else {
      if (/subtotal|sub total|total|tax|grand total|cgst|sgst|igst|amount due|balance|net total/i.test(lower)) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1) {
    return extractLineItemsFallback(lines);
  }

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    if (line.length < 3) continue;
    const item = parseLineItemRow(line);
    if (item) items.push(item);
  }

  if (items.length === 0) {
    return extractLineItemsFallback(lines);
  }

  return items;
}

function parseLineItemRow(line: string): LineItem | null {
  const cleaned = line.replace(/\s+/g, ' ').trim();

  // Extract HSN code if present
  let hsnCode = '';
  const hsnMatch = cleaned.match(/HSN[:.]?\s*(\d{4,8})/i);
  if (hsnMatch) hsnCode = hsnMatch[1];
  else {
    const hsnMatch2 = cleaned.match(/\b(\d{4,8})\b/);
    if (hsnMatch2 && /\bhsn\b/i.test(cleaned)) hsnCode = hsnMatch2[1];
  }

  // Extract unit if present (NOS, PCS, KG, LTR, BOX, SET, HRS, DAY, UNIT)
  let unit = 'NOS';
  const unitMatch = cleaned.match(/\b(NOS|PCS|KG|LTR|BOX|SET|HRS|DAY|UNIT|MTR|FT|CM|GM|TON)\b/i);
  if (unitMatch) unit = unitMatch[1].toUpperCase();

  const patterns: RegExp[] = [
    // "Description HSN 2 NOS 1500.00 3000.00"
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:NOS|PCS|KG|LTR|BOX|SET|HRS|DAY|UNIT|MTR|FT|CM|GM|TON)?\s*₹?([\d,]+\.?\d{2})\s+₹?([\d,]+\.?\d{2})$/i,
    // "Description 2 1500.00 3000.00"
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+₹?([\d,]+\.?\d{2})\s+₹?([\d,]+\.?\d{2})$/,
    // "Description ₹3000.00"
    /^(.+?)\s+₹?([\d,]+\.?\d{2})$/,
  ];

  for (const pattern of patterns) {
    const m = cleaned.match(pattern);
    if (!m) continue;

    if (pattern.source.includes('₹?[\\d,]+\\.?\\d{2}\\s+₹?[\\d,]')) {
      const description = m[1].replace(/HSN[:.]?\s*\d{4,8}/i, '').replace(/\s{2,}/g, ' ').trim();
      const quantity = parseFloat(m[2]);
      const unitPrice = parseFloat(m[3].replace(/,/g, ''));
      const lineTotal = parseFloat(m[4].replace(/,/g, ''));

      if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(lineTotal) && description.length >= 2) {
        const computed = Math.round(quantity * unitPrice * 100) / 100;
        const conf = Math.abs(computed - lineTotal) < 0.5 ? 0.92 : 0.78;
        return { id: uid(), description, hsnCode, quantity, unit, unitPrice, discount: 0, lineTotal, confidence: conf };
      }
    } else {
      const description = m[1].replace(/HSN[:.]?\s*\d{4,8}/i, '').replace(/\s{2,}/g, ' ').trim();
      const lineTotal = parseFloat(m[2].replace(/,/g, ''));
      if (!isNaN(lineTotal) && description.length >= 3 && lineTotal > 0) {
        return { id: uid(), description, hsnCode, quantity: 1, unit, unitPrice: lineTotal, discount: 0, lineTotal, confidence: 0.7 };
      }
    }
  }

  return null;
}

function extractLineItemsFallback(lines: string[]): LineItem[] {
  const items: LineItem[] = [];
  for (const line of lines) {
    const numbers = line.match(/₹?[\d,]+\.\d{2}/g);
    if (numbers && numbers.length >= 2 && line.length > 10) {
      if (/subtotal|total|tax|grand|cgst|sgst|igst|amount due|balance/i.test(line)) continue;
      const item = parseLineItemRow(line);
      if (item) items.push(item);
    }
  }
  return items.slice(0, 20);
}

// ---------- Main parser ----------

export function parseInvoiceFromText(rawText: string): ExtractedInvoice {
  const vendorName = extractVendorName(rawText);
  const vendorAddress = extractVendorAddress(rawText);
  const recipientName = extractLabeled(rawText, ['name & address of recipient', 'recipient name', 'customer firm name']);
  const recipientAddress = extractLabeled(rawText, ['address of recipient', 'recipient address', 'name & address of delivery']);
  const recipientGstin = extractLabeled(rawText, ['recipient gstin', 'customer gstin', 'gstin of recipient']);
  const stateCode = extractLabeled(rawText, ['state code']);
  const poNumber = extractLabeled(rawText, ['recipient po no', 'po number', 'po no']);
  const poDate = extractDate(rawText, 'recipient po date', 'po date');
  const orderNumber = extractLabeled(rawText, ['order no', 'order number']);
  const orderQuantity = extractLabeled(rawText, ['order qty', 'order quantity']);
  const invoiceReference = extractLabeled(rawText, ['invoice reference no', 'invoice ref']);
  const reverseCharge = extractLabeled(rawText, ['whether tax is payable under reverse charge', 'reverse charge'], 'No');
  const tcs = extractAmount(rawText, ['tcs']);
  const roundOff = extractAmount(rawText, ['rounding off', 'round off']);
  const taxAmountInWords = extractLabeled(rawText, ['tax amount in words']);
  const totalAmountInWords = extractLabeled(rawText, ['invoice amount in words', 'total amount in words']);
  const invoiceNumber = extractInvoiceNumber(rawText);
  const invoiceDate = extractDate(rawText, 'invoice date', 'date');
  const dueDate = extractDate(rawText, 'due date', 'payment due');
  const gstin = extractGSTIN(rawText);
  const pan = extractPAN(rawText);
  const placeOfSupply = extractPlaceOfSupply(rawText);
  const currency = extractCurrency(rawText);
  const subtotal = extractAmount(rawText, ['subtotal', 'sub total', 'sub-total', 'net amount', 'net total', 'taxable value', 'taxable amount']);
  const cgst = extractAmount(rawText, ['cgst', 'central tax', 'cgst amount']);
  const sgst = extractAmount(rawText, ['sgst', 'state tax', 'sgst amount', 'utgst']);
  const igst = extractAmount(rawText, ['igst', 'integrated tax', 'igst amount']);
  const totalTax = extractAmount(rawText, ['total tax', 'total gst', 'tax amount', 'tax total']);
  const grandTotal = extractAmount(rawText, ['grand total', 'total amount', 'total', 'amount payable', 'balance due', 'round off', 'round total']);

  const lineItems = extractLineItems(rawText);

  // If subtotal empty, compute from line items
  let finalSubtotal = subtotal;
  if (!subtotal.value && lineItems.length > 0) {
    const sum = lineItems.reduce((acc, item) => acc + item.lineTotal, 0);
    finalSubtotal = field(sum.toFixed(2), 0.75);
  }

  // If totalTax empty, compute from CGST+SGST+IGST
  let finalTotalTax = totalTax;
  if (!totalTax.value) {
    const cg = parseFloat(cgst.value || '0');
    const sg = parseFloat(sgst.value || '0');
    const ig = parseFloat(igst.value || '0');
    if (cg + sg + ig > 0) {
      finalTotalTax = field((cg + sg + ig).toFixed(2), 0.8);
    }
  }

  // If grandTotal empty, compute from subtotal + totalTax
  let finalGrandTotal = grandTotal;
  if (!grandTotal.value && finalSubtotal.value) {
    const sub = parseFloat(finalSubtotal.value);
    const tax = parseFloat(finalTotalTax.value || '0');
    finalGrandTotal = field((sub + tax).toFixed(2), 0.7);
  }

  return {
    vendorName,
    vendorAddress,
    cin: extractLabeled(rawText, ['cin']),
    recipientName,
    recipientAddress,
    recipientGstin,
    stateCode,
    invoiceNumber,
    invoiceDate,
    dueDate,
    gstin,
    pan,
    poNumber,
    poDate,
    orderNumber,
    orderQuantity,
    invoiceReference,
    reverseCharge,
    placeOfSupply,
    currency,
    subtotal: finalSubtotal,
    cgst,
    sgst,
    igst,
    totalTax: finalTotalTax,
    tcs,
    roundOff,
    grandTotal: finalGrandTotal,
    taxAmountInWords,
    totalAmountInWords,
    lineItems,
    detailSections: makeDetailSections(rawText),
  };
}

export function averageConfidence(invoice: ExtractedInvoice): number {
  const fields = [
    invoice.vendorName,
    invoice.vendorAddress,
    invoice.invoiceNumber,
    invoice.invoiceDate,
    invoice.dueDate,
    invoice.gstin,
    invoice.pan,
    invoice.recipientName,
    invoice.recipientGstin,
    invoice.placeOfSupply,
    invoice.subtotal,
    invoice.cgst,
    invoice.sgst,
    invoice.igst,
    invoice.totalTax,
    invoice.grandTotal,
    invoice.currency,
  ];
  const all = [...fields, ...invoice.lineItems.map((i) => ({ value: '', confidence: i.confidence }))];
  const sum = all.reduce((acc, f) => acc + f.confidence, 0);
  return Math.round((sum / all.length) * 100);
}
