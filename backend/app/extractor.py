"""
Indian GST Invoice Extractor — parses structured fields from raw OCR text.

Handles Indian GST invoice formats: GSTIN, PAN, CGST/SGST/IGST,
HSN codes, Place of Supply, DD/MM/YYYY dates, Rupee amounts.
"""

import re
from typing import Dict, List, Optional, Tuple


def _confidence(match_quality: float) -> float:
    return round(max(0.5, min(0.99, match_quality)), 2)


def _find_pattern(text: str, patterns: List[str], flags: int = 0) -> Optional[Tuple[str, float]]:
    for i, pattern in enumerate(patterns):
        match = re.search(pattern, text, flags | re.IGNORECASE)
        if match and match.group(1):
            score = _confidence(0.98 - (i * 0.05))
            return match.group(1).strip(), score
    return None


def _parse_amount(raw: str) -> str:
    cleaned = re.sub(r'[,$₹]', '', raw).strip()
    cleaned = re.sub(r'[^\d.]', '', cleaned)
    try:
        return f"{float(cleaned):.2f}"
    except (ValueError, TypeError):
        return ""


def _normalize_date(raw: str) -> str:
    s = raw.strip()
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # DD/MM/YYYY (Indian standard)
    m = re.match(r'(\d{1,2})[/.](\d{1,2})[/.](\d{4})', s)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        if day <= 31 and month <= 12:
            return f"{m.group(3)}-{month:02d}-{day:02d}"

    return s


def _extract_vendor_name(text: str) -> Dict:
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    if not lines:
        return {"value": "", "confidence": 0.2}

    skip_words = {"invoice", "receipt", "bill", "tax", "statement", "date", "number", "gstin", "pan", "hsn", "cgst", "sgst", "igst", "total"}
    for line in lines[:8]:
        lower = line.lower()
        if len(line) < 3:
            continue
        if any(w in lower for w in skip_words):
            continue
        if re.match(r'^\d', line):
            continue
        if re.match(r'^(date|invoice|receipt|bill|gstin|pan|hsn|place)', line, re.I):
            continue
        if "GSTIN" in line:
            continue
        cleaned = re.sub(r'\s+', ' ', line).strip()
        if len(cleaned) >= 3 and re.search(r'[a-zA-Z]', cleaned):
            return {"value": cleaned, "confidence": 0.85}

    return {"value": lines[0], "confidence": 0.6}


def _extract_invoice_number(text: str) -> Dict:
    result = _find_pattern(text, [
        r"invoice\s*(?:no|number|#|num)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]+)",
        r"\b(?:invoice|inv|bill)\s*#?\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{3,})",
        r"\b(INV[-\/]\d{3,}[-\/]?\d*)\b",
    ])
    if result:
        return {"value": result[0], "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_date(text: str, label: str, fallback: str = "") -> Dict:
    patterns = [
        rf"{label}\s*[:.]?\s*(\d{{4}}[-/]\d{{1,2}}[-/]\d{{1,2}})",
        rf"{label}\s*[:.]?\s*(\d{{1,2}}[/.]\d{{1,2}}[/.]\d{{4}})",
        rf"{label}\s*[:.]?\s*(\d{{1,2}}-\d{{1,2}}-\d{{4}})",
    ]
    result = _find_pattern(text, patterns)
    if not result and fallback:
        result = _find_pattern(text, [
            rf"{fallback}\s*[:.]?\s*(\d{{4}}[-/]\d{{1,2}}[-/]\d{{1,2}})",
            rf"{fallback}\s*[:.]?\s*(\d{{1,2}}[/.]\d{{1,2}}[/.]\d{{4}})",
        ])
    if result:
        return {"value": _normalize_date(result[0]), "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_gstin(text: str) -> Dict:
    result = _find_pattern(text, [
        r"GSTIN\s*[:.]?\s*([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)",
        r"\b([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)\b",
        r"GST\s*(?:No|Number|ID)?\s*[:.]?\s*([0-9]{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d)",
    ])
    if result:
        return {"value": result[0].upper(), "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_pan(text: str) -> Dict:
    result = _find_pattern(text, [
        r"PAN\s*[:.]?\s*([A-Z]{5}\d{4}[A-Z])\b",
        r"\b([A-Z]{5}\d{4}[A-Z])\b",
    ])
    if result:
        return {"value": result[0].upper(), "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_place_of_supply(text: str) -> Dict:
    result = _find_pattern(text, [
        r"place\s*of\s*supply\s*[:.]?\s*(.+?)(?:\n|$)",
        r"supply\s*[:.]?\s*(.+?)(?:\n|$)",
    ])
    if result:
        return {"value": result[0], "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_amount(text: str, labels: List[str]) -> Dict:
    patterns = [rf"{label}\s*[:.]?\s*₹?\s*\$?\s*([\d,]+\.?\d{{2}})" for label in labels]
    result = _find_pattern(text, patterns)
    if result:
        val = _parse_amount(result[0])
        if val:
            return {"value": val, "confidence": result[1]}
    return {"value": "", "confidence": 0.3}


def _extract_line_items(text: str) -> List[Dict]:
    items = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    start_idx = -1
    end_idx = len(lines)

    for i, line in enumerate(lines):
        lower = line.lower()
        if start_idx == -1:
            if re.search(r"description|item|product|particulars|goods", lower) and \
               re.search(r"qty|quantity|price|amount|total|rate|hsn", lower):
                start_idx = i + 1
        else:
            if re.search(r"subtotal|total|tax|grand|cgst|sgst|igst|amount due|balance", lower):
                end_idx = i
                break

    if start_idx == -1:
        return _fallback_line_items(lines)

    for i in range(start_idx, end_idx):
        item = _parse_line_row(lines[i])
        if item:
            items.append(item)

    if not items:
        return _fallback_line_items(lines)

    return items


def _parse_line_row(line: str) -> Optional[Dict]:
    cleaned = re.sub(r'\s+', ' ', line).strip()

    hsn_match = re.search(r'HSN[:.]?\s*(\d{4,8})', cleaned, re.I)
    hsn_code = hsn_match.group(1) if hsn_match else ""

    patterns = [
        r'^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:NOS|PCS|KG|LTR|BOX|SET|HRS|DAY|UNIT|MTR)?\s*₹?([\d,]+\.?\d{2})\s+₹?([\d,]+\.?\d{2})$',
        r'^(.+?)\s+(\d+(?:\.\d+)?)\s+₹?([\d,]+\.?\d{2})\s+₹?([\d,]+\.?\d{2})$',
        r'^(.+?)\s+₹?([\d,]+\.?\d{2})$',
    ]

    for i, pattern in enumerate(patterns):
        m = re.match(pattern, cleaned, re.I)
        if not m:
            continue
        if i < 2:
            desc = re.sub(r'HSN[:.]?\s*\d{4,8}', '', m.group(1), flags=re.I).strip()
            qty = float(m.group(2))
            unit_price = float(m.group(3).replace(',', ''))
            line_total = float(m.group(4).replace(',', ''))
            if desc and not (isNaN(qty) or isNaN(unit_price) or isNaN(line_total)):
                return {
                    "id": f"item-{len(items) + 1}" if 'items' in dir() else f"item-1",
                    "description": desc,
                    "hsnCode": hsn_code,
                    "quantity": qty,
                    "unit": "NOS",
                    "unitPrice": unit_price,
                    "discount": 0,
                    "lineTotal": line_total,
                    "confidence": 0.88,
                }
        else:
            desc = re.sub(r'HSN[:.]?\s*\d{4,8}', '', m.group(1), flags=re.I).strip()
            line_total = float(m.group(2).replace(',', ''))
            if desc and not isNaN(line_total) and line_total > 0:
                return {
                    "id": f"item-1",
                    "description": desc,
                    "hsnCode": hsn_code,
                    "quantity": 1,
                    "unit": "NOS",
                    "unitPrice": line_total,
                    "discount": 0,
                    "lineTotal": line_total,
                    "confidence": 0.7,
                }
    return None


def isNaN(v) -> bool:
    try:
        return v != v
    except Exception:
        return True


def _fallback_line_items(lines: List[str]) -> List[Dict]:
    items = []
    for line in lines:
        numbers = re.findall(r'₹?[\d,]+\.\d{2}', line)
        if len(numbers) >= 2 and len(line) > 10:
            if re.search(r'subtotal|total|tax|grand|cgst|sgst|igst|amount due|balance', line, re.I):
                continue
            item = _parse_line_row(line)
            if item:
                item["id"] = f"item-{len(items) + 1}"
                items.append(item)
    return items[:20]


def parse_invoice(raw_text: str) -> Dict:
    """Parse raw OCR text into a structured Indian GST invoice dictionary."""
    vendor_name = _extract_vendor_name(raw_text)
    invoice_number = _extract_invoice_number(raw_text)
    invoice_date = _extract_date(raw_text, "invoice date", "date")
    due_date = _extract_date(raw_text, "due date", "payment due")
    gstin = _extract_gstin(raw_text)
    pan = _extract_pan(raw_text)
    place_of_supply = _extract_place_of_supply(raw_text)
    subtotal = _extract_amount(raw_text, ["subtotal", "sub total", "taxable value", "taxable amount", "net amount"])
    cgst = _extract_amount(raw_text, ["cgst", "central tax"])
    sgst = _extract_amount(raw_text, ["sgst", "state tax", "utgst"])
    igst = _extract_amount(raw_text, ["igst", "integrated tax"])
    total_tax = _extract_amount(raw_text, ["total tax", "total gst", "tax amount"])
    grand_total = _extract_amount(raw_text, ["grand total", "total amount", "total", "amount payable", "round off"])
    line_items = _extract_line_items(raw_text)

    # Compute missing values
    if not subtotal["value"] and line_items:
        subtotal = {"value": f"{sum(i['lineTotal'] for i in line_items):.2f}", "confidence": 0.75}

    if not total_tax["value"]:
        cg = float(cgst["value"] or 0)
        sg = float(sgst["value"] or 0)
        ig = float(igst["value"] or 0)
        if cg + sg + ig > 0:
            total_tax = {"value": f"{cg + sg + ig:.2f}", "confidence": 0.8}

    if not grand_total["value"] and subtotal["value"]:
        grand_total = {"value": f"{float(subtotal['value']) + float(total_tax['value'] or 0):.2f}", "confidence": 0.7}

    all_confidences = [v["confidence"] for v in [vendor_name, invoice_number, invoice_date, due_date,
                                                  gstin, pan, place_of_supply, subtotal, cgst, sgst,
                                                  igst, total_tax, grand_total]]
    all_confidences.extend([item.get("confidence", 0.8) for item in line_items])
    overall = round(sum(all_confidences) / max(len(all_confidences), 1), 2)

    return {
        "vendorName": vendor_name,
        "vendorAddress": {"value": "", "confidence": 0.3},
        "invoiceNumber": invoice_number,
        "invoiceDate": invoice_date,
        "dueDate": due_date,
        "gstin": gstin,
        "pan": pan,
        "placeOfSupply": place_of_supply,
        "currency": {"value": "INR", "confidence": 0.6},
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "totalTax": total_tax,
        "grandTotal": grand_total,
        "lineItems": line_items,
        "overall_confidence": overall,
    }
