# SmartInvoice AI — Backend

FastAPI-based OCR extraction pipeline for invoices and receipts.

## Quick Start

```bash
cd backend
pip install -r requirements.txt

# Tesseract OCR engine (system dependency)
# Ubuntu/Debian:  sudo apt-get install tesseract-ocr poppler-utils
# macOS:         brew install tesseract poppler

uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### `POST /api/v1/extract-invoice`

Upload a PDF, PNG, or JPG invoice/receipt. Returns structured data with confidence scores.

```bash
curl -X POST http://localhost:8000/api/v1/extract-invoice \
  -F "file=@invoice.pdf"
```

### `GET /api/v1/health`

Health check endpoint.

## Architecture

```
backend/
├── app/
│   ├── main.py          # FastAPI server & endpoint definitions
│   ├── ocr_engine.py    # OCR text extraction (Tesseract / EasyOCR / Vision LLM)
│   └── extractor.py     # Regex-based structured data parsing + schema validation
└── requirements.txt
```

## OCR Backends

The `ocr_engine.py` module supports multiple backends:

1. **Tesseract** (default) — local, no API key. Requires `tesseract-ocr` system package.
2. **EasyOCR** — neural network OCR, more accurate for complex layouts. Install with `pip install easyocr`.
3. **Vision LLM** — pluggable abstraction for cloud models (GPT-4V, Gemini, Claude Vision). Implement `extract_with_vision_llm()` with your provider.
