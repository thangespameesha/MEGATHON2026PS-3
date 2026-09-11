from typing import Any

from .contracts import Chunk


def get_provenance(chunk: Chunk) -> dict[str, Any]:
    """
    Return the provenance information attached to a retrieved chunk.
    """
    return {
        "chunk_id": chunk.id,
        "tenant": chunk.tenant,
        "source_type": chunk.source_type,
        **chunk.provenance,
    }


def build_provenance_record(chunk: Chunk) -> dict[str, Any]:
    """
    Build a normalized provenance record for tracing
    retrieved content through the RAG pipeline.
    """
    provenance = get_provenance(chunk)

    return {
        "chunk_id": provenance.get("chunk_id"),
        "tenant": provenance.get("tenant"),
        "source_type": provenance.get("source_type"),
        "document_id": provenance.get("document_id"),
        "source": provenance.get("source"),
        "tainted": chunk.taint,
    }


def trace_chunks(chunks: list[Chunk]) -> list[dict[str, Any]]:
    """
    Create provenance records for all retrieved chunks.
    """
    return [build_provenance_record(chunk) for chunk in chunks]