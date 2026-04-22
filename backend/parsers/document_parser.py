"""
parsers/document_parser.py

Extracts plain text from uploaded documents.
Supports PDF, DOCX, and plain text.
"""

import io
from core.logger import logger


class DocumentParser:
    """
    Single entry point for all document text extraction.
    Routes by MIME type to the correct extraction strategy.
    """

    def extract(self, content: bytes, mime_type: str) -> str:
        """Return extracted plain text from file bytes."""
        if mime_type == "application/pdf":
            return self._extract_pdf(content)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return self._extract_docx(content)
        elif mime_type in ("text/plain", "text/markdown"):
            return content.decode("utf-8", errors="replace")
        else:
            logger.warning(f"[DocumentParser] Unsupported MIME type: {mime_type}. Returning raw decode.")
            return content.decode("utf-8", errors="replace")

    def _extract_pdf(self, content: bytes) -> str:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text.strip())
            extracted = "\n\n".join(pages)
            logger.debug(f"[DocumentParser] PDF extracted: {len(extracted)} chars, {len(reader.pages)} pages.")
            return extracted
        except Exception as e:
            logger.error(f"[DocumentParser] PDF extraction failed: {e}")
            return ""

    def _extract_docx(self, content: bytes) -> str:
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            extracted = "\n\n".join(paragraphs)
            logger.debug(f"[DocumentParser] DOCX extracted: {len(extracted)} chars.")
            return extracted
        except Exception as e:
            logger.error(f"[DocumentParser] DOCX extraction failed: {e}")
            return ""


document_parser = DocumentParser()