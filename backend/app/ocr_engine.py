"""
OCR Engine — Text extraction from PDF and image files.

Supports multiple backends (in priority order):
  1. Tesseract OCR (via pytesseract) — local, no API key needed
  2. EasyOCR — GPU/CPU neural OCR (optional)
  3. Vision LLM abstraction — pluggable for cloud models

For PDFs, pages are rasterized to images using pdf2image (requires poppler-utils).
"""

import io
import os
from typing import Optional


def extract_text(file_path: str, ext: str) -> str:
    """Extract raw text from a document file.

    Args:
        file_path: Path to the temporary file on disk.
        ext: File extension including the dot, e.g. '.pdf', '.png'.

    Returns:
        Extracted text as a single string.
    """
    if ext == ".pdf":
        return _extract_from_pdf(file_path)
    elif ext in (".png", ".jpg", ".jpeg"):
        return _extract_from_image(file_path)
    else:
        raise ValueError(f"Unsupported extension: {ext}")


def _extract_from_pdf(file_path: str) -> str:
    """Rasterize PDF pages and OCR each page."""
    try:
        from pdf2image import convert_from_path
    except ImportError:
        raise RuntimeError("pdf2image is required for PDF processing. Install poppler-utils and pdf2image.")

    images = convert_from_path(file_path)
    texts = []
    for img in images:
        texts.append(_ocr_image_pytesseract(img))
    return "\n\n".join(texts)


def _extract_from_image(file_path: str) -> str:
    """OCR a single image file."""
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow is required for image processing.")

    image = Image.open(file_path)
    return _ocr_image_pytesseract(image)


def _ocr_image_pytesseract(image) -> str:
    """Extract text using Tesseract OCR (primary backend)."""
    try:
        import pytesseract
    except ImportError:
        raise RuntimeError("pytesseract is not installed. Run: pip install pytesseract")

    return pytesseract.image_to_string(image, lang="eng")


def _ocr_image_easyocr(file_path: str) -> str:
    """Alternative OCR backend using EasyOCR (optional, slower but more accurate)."""
    try:
        import easyocr
    except ImportError:
        raise RuntimeError("easyocr is not installed. Run: pip install easyocr")

    reader = easyocr.Reader(["en"], gpu=False)
    results = reader.readtext(file_path)
    return "\n".join([text for _, text, _ in results])


def extract_with_vision_llm(image_bytes: bytes, api_key: Optional[str] = None) -> str:
    """Pluggable abstraction for cloud Vision LLM OCR (e.g. GPT-4V, Gemini, Claude Vision).

    Implement this method with your preferred provider's API.
    """
    raise NotImplementedError(
        "Vision LLM OCR not configured. Set your provider API key and implement this method."
    )
