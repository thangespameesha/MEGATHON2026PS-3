import hashlib
import os
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None


def compute_sha256(file_bytes: bytes) -> str:
    """
    Computes a SHA-256 fingerprint for any uploaded file.
    Even if 1 single letter is modified, this hash completely changes.
    """
    return hashlib.sha256(file_bytes).hexdigest()


def extract_text(file_path: str) -> str:
    """
    Extracts plain text from a .txt, .pdf, or .docx file.
    Uses 'utf-8-sig' to safely strip any standard Windows UTF-8 Byte Order Marks.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = path.suffix.lower()

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
            return f.read()

    elif ext == ".pdf":
        if fitz is None:
            raise ImportError("PyMuPDF is required to parse PDFs. Run: pip install pymupdf")
        doc = fitz.open(file_path)
        pages_text = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            pages_text.append(page.get_text())
        doc.close()
        return "\n".join(pages_text)

    elif ext in [".docx", ".doc"]:
        if docx is None:
            raise ImportError("python-docx is required to parse Word docs. Run: pip install python-docx")
        doc = docx.Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    else:
        raise ValueError(f"Unsupported file extension '{ext}'. Only .pdf, .docx, and .txt are supported.")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50, doc_id: str = "doc") -> list[dict]:
    """
    Cuts long text into small, overlapping chunks.
    This is what Member 2 will convert into vector embeddings.
    """
    clean_text = " ".join(text.split())
    if not clean_text:
        return []

    chunks = []
    start = 0
    chunk_index = 0
    text_length = len(clean_text)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk_content = clean_text[start:end]

        chunks.append({
            "chunk_id": f"{doc_id}_chunk_{chunk_index}",
            "chunk_index": chunk_index,
            "text": chunk_content,
            "char_length": len(chunk_content)
        })

        if end == text_length:
            break

        start += max(1, chunk_size - overlap)
        chunk_index += 1

    return chunks
