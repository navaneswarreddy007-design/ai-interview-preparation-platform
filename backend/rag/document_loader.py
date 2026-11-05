import hashlib
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import pypdf
import docx

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx"}

def compute_file_hash(file_path: Path) -> str:
    """Compute SHA-256 checksum of a file to detect duplicates and changes."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def extract_from_txt(file_path: Path) -> Dict[str, Any]:
    """Extract sections and content from a TXT or Markdown file."""
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                text = f.read()
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError(f"Could not decode text file {file_path.name} with standard encodings.")

    clean_text = text.strip()
    if not clean_text:
        raise ValueError(f"Document {file_path.name} is empty.")

    # Parse headers for section metadata
    lines = clean_text.splitlines()
    sections = []
    current_title = "General Overview"
    current_lines: List[str] = []
    inferred_category = "General Interview Concepts"

    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("category:"):
            inferred_category = stripped.split(":", 1)[1].strip()

        if stripped.startswith("# ") or stripped.startswith("## "):
            if current_lines:
                sec_text = "\n".join(current_lines).strip()
                if sec_text:
                    sections.append({
                        "title": current_title,
                        "content": sec_text,
                        "page": 1
                    })
                current_lines = []
            current_title = stripped.lstrip("#").strip()
        else:
            current_lines.append(line)

    if current_lines:
        sec_text = "\n".join(current_lines).strip()
        if sec_text:
            sections.append({
                "title": current_title,
                "content": sec_text,
                "page": 1
            })

    if not sections:
        sections.append({
            "title": current_title,
            "content": clean_text,
            "page": 1
        })

    return {
        "full_text": clean_text,
        "sections": sections,
        "category": inferred_category
    }

def extract_from_pdf(file_path: Path) -> Dict[str, Any]:
    """Extract text and page metadata from a PDF file using pypdf."""
    try:
        reader = pypdf.PdfReader(str(file_path))
    except Exception as e:
        raise ValueError(f"Corrupted or invalid PDF file {file_path.name}: {str(e)}")

    if len(reader.pages) == 0:
        raise ValueError(f"PDF file {file_path.name} contains no pages.")

    sections = []
    full_text_parts = []
    inferred_category = "Technical Knowledge (PDF)"

    for page_idx, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text() or ""
        except Exception as e:
            page_text = ""

        page_clean = page_text.strip()
        if page_clean:
            full_text_parts.append(page_clean)
            sections.append({
                "title": f"Page {page_idx + 1}",
                "content": page_clean,
                "page": page_idx + 1
            })

    full_text = "\n\n".join(full_text_parts).strip()
    if not full_text:
        raise ValueError(f"PDF file {file_path.name} contains no extractable text.")

    # Detect category from first page text if present
    for line in full_text.splitlines()[:15]:
        if "category:" in line.lower():
            inferred_category = line.split(":", 1)[1].strip()
            break

    return {
        "full_text": full_text,
        "sections": sections,
        "category": inferred_category
    }

def extract_from_docx(file_path: Path) -> Dict[str, Any]:
    """Extract paragraphs, headings, and tables from a DOCX file using python-docx."""
    try:
        doc = docx.Document(str(file_path))
    except Exception as e:
        raise ValueError(f"Corrupted or invalid DOCX file {file_path.name}: {str(e)}")

    sections = []
    full_text_parts = []
    current_heading = "Overview"
    current_paras: List[str] = []
    inferred_category = "Technical Knowledge (DOCX)"

    for para in doc.paragraphs:
        p_text = para.text.strip()
        if not p_text:
            continue

        if p_text.lower().startswith("category:"):
            inferred_category = p_text.split(":", 1)[1].strip()

        if para.style and para.style.name and "Heading" in para.style.name:
            if current_paras:
                sec_text = "\n".join(current_paras).strip()
                if sec_text:
                    sections.append({
                        "title": current_heading,
                        "content": sec_text,
                        "page": 1
                    })
                current_paras = []
            current_heading = p_text
        else:
            current_paras.append(p_text)
            full_text_parts.append(p_text)

    # Process tables if present
    for table in doc.tables:
        table_rows = []
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                table_rows.append(" | ".join(row_cells))
        if table_rows:
            table_text = "\n".join(table_rows)
            current_paras.append(table_text)
            full_text_parts.append(table_text)

    if current_paras:
        sec_text = "\n".join(current_paras).strip()
        if sec_text:
            sections.append({
                "title": current_heading,
                "content": sec_text,
                "page": 1
            })

    full_text = "\n".join(full_text_parts).strip()
    if not full_text:
        raise ValueError(f"DOCX file {file_path.name} contains no extractable text.")

    return {
        "full_text": full_text,
        "sections": sections,
        "category": inferred_category
    }

def load_document(file_path: Path) -> Dict[str, Any]:
    """Load and extract text and metadata from any supported document format."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: {sorted(list(SUPPORTED_EXTENSIONS))}")

    file_size = path.stat().st_size
    if file_size == 0:
        raise ValueError(f"File '{path.name}' is empty (0 bytes).")

    file_hash = compute_file_hash(path)

    if ext in {".txt", ".md"}:
        extracted = extract_from_txt(path)
    elif ext == ".pdf":
        extracted = extract_from_pdf(path)
    elif ext == ".docx":
        extracted = extract_from_docx(path)
    else:
        raise ValueError(f"Unsupported extension: {ext}")

    return {
        "document_name": path.name,
        "file_path": str(path.resolve()),
        "file_hash": file_hash,
        "file_size": file_size,
        "file_type": ext.lstrip("."),
        "category": extracted.get("category", "General Technical"),
        "full_text": extracted["full_text"],
        "sections": extracted["sections"]
    }

