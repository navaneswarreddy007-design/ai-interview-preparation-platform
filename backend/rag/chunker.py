import hashlib
import re
from typing import List, Dict, Any, Optional

def recursive_split_text(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 120,
    separators: Optional[List[str]] = None
) -> List[str]:
    """
    Recursively split text using semantic boundaries (paragraphs -> sentences -> words)
    while maintaining target chunk size and character overlap.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

    clean_text = text.strip()
    if not clean_text:
        return []

    if len(clean_text) <= chunk_size:
        return [clean_text]

    # Find the highest priority separator present in the text
    chosen_sep = ""
    for sep in separators:
        if sep in clean_text:
            chosen_sep = sep
            break

    if not chosen_sep:
        # Fall back to strict character slicing if no separator exists
        chunks = []
        start = 0
        while start < len(clean_text):
            end = min(start + chunk_size, len(clean_text))
            chunks.append(clean_text[start:end])
            start += max(1, chunk_size - chunk_overlap)
        return chunks

    splits = clean_text.split(chosen_sep)
    remaining_seps = separators[separators.index(chosen_sep) + 1:] if chosen_sep in separators else []

    chunks: List[str] = []
    current_chunk: List[str] = []
    current_length = 0

    for split in splits:
        piece = split.strip()
        if not piece:
            continue

        piece_len = len(piece) + (len(chosen_sep) if current_chunk else 0)

        if piece_len > chunk_size and remaining_seps:
            # Piece itself is larger than chunk_size; recurse with finer separators
            if current_chunk:
                chunks.append(chosen_sep.join(current_chunk).strip())
                current_chunk = []
                current_length = 0
            sub_chunks = recursive_split_text(piece, chunk_size, chunk_overlap, remaining_seps)
            chunks.extend(sub_chunks)
            continue

        if current_length + piece_len <= chunk_size:
            current_chunk.append(piece)
            current_length += piece_len
        else:
            if current_chunk:
                merged = chosen_sep.join(current_chunk).strip()
                if merged:
                    chunks.append(merged)
                
                # Apply overlap by retaining trailing pieces from previous chunk
                overlap_pieces: List[str] = []
                overlap_len = 0
                for prev in reversed(current_chunk):
                    if overlap_len + len(prev) + len(chosen_sep) <= chunk_overlap:
                        overlap_pieces.insert(0, prev)
                        overlap_len += len(prev) + len(chosen_sep)
                    else:
                        break
                current_chunk = overlap_pieces
                current_length = overlap_len

            current_chunk.append(piece)
            current_length += piece_len

    if current_chunk:
        merged = chosen_sep.join(current_chunk).strip()
        if merged:
            chunks.append(merged)

    return chunks

def chunk_document(
    doc_data: Dict[str, Any],
    chunk_size: int = 600,
    chunk_overlap: int = 120
) -> List[Dict[str, Any]]:
    """
    Chunk an extracted document into structured, attributed chunks preserving
    document name, section title, page number, and category metadata.
    """
    doc_name = doc_data.get("document_name", "unknown_document")
    doc_hash = doc_data.get("file_hash", hashlib.sha256(doc_name.encode()).hexdigest()[:16])
    doc_path = doc_data.get("file_path", "")
    category = doc_data.get("category", "General Technical")

    sections = doc_data.get("sections", [])
    if not sections and doc_data.get("full_text"):
        sections = [{"title": "General", "content": doc_data["full_text"], "page": 1}]

    all_chunks: List[Dict[str, Any]] = []
    seen_contents = set()
    global_chunk_idx = 0

    for sec in sections:
        sec_title = sec.get("title", "Section")
        sec_content = sec.get("content", "").strip()
        sec_page = sec.get("page", 1)

        if not sec_content:
            continue

        # Split section content
        raw_chunks = recursive_split_text(sec_content, chunk_size, chunk_overlap)

        for chunk_text in raw_chunks:
            clean = chunk_text.strip()
            if len(clean) < 30:  # Skip trivial fragments
                continue

            content_hash = hashlib.sha256(clean.encode()).hexdigest()
            if content_hash in seen_contents:
                continue  # Avoid duplicate chunks
            seen_contents.add(content_hash)

            chunk_id = f"{doc_hash[:12]}_{global_chunk_idx:04d}"

            chunk_dict = {
                "id": chunk_id,
                "content": clean,
                "metadata": {
                    "document_name": doc_name,
                    "source": doc_path,
                    "document_hash": doc_hash,
                    "section_title": sec_title,
                    "page": int(sec_page) if sec_page is not None else 1,
                    "category": category,
                    "chunk_index": global_chunk_idx,
                    "char_count": len(clean)
                }
            }
            all_chunks.append(chunk_dict)
            global_chunk_idx += 1

    return all_chunks

