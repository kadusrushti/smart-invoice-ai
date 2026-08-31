"""
SmartInvoice AI — FastAPI Backend
=================================

Run locally:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Then POST a file to http://localhost:8000/api/v1/extract-invoice
"""

import io
import os
import tempfile
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .ocr_engine import extract_text
from .extractor import parse_invoice

app = FastAPI(
    title="SmartInvoice AI",
    description="Intelligent Invoice & Receipt Processing API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ExtractionResponse(BaseModel):
    vendor_name: dict
    invoice_number: dict
    invoice_date: dict
    due_date: dict
    tax_id: dict
    subtotal: dict
    tax_amount: dict
    grand_total: dict
    currency: dict
    line_items: list
    overall_confidence: float
    raw_text: str


@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="smartinvoice-ai", version="1.0.0")


@app.post("/api/v1/extract-invoice", response_model=ExtractionResponse)
async def extract_invoice(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed = {".pdf", ".png", ".jpg", ".jpeg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed)}",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        raw_text = extract_text(tmp_path, ext)
        result = parse_invoice(raw_text)
        result["raw_text"] = raw_text
        return JSONResponse(content=result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(exc)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/")
async def root():
    return {"message": "SmartInvoice AI API", "docs": "/docs"}
