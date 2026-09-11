"""
A small in-memory vector store used to demonstrate/enforce the
authorization-scoped retrieval pattern.

The one property that matters for PS3 is in `search()`: the tenant/doc
predicate is applied to the CANDIDATE SET before similarity ranking,
not to the top-k results afterwards. That ordering is what prevents a
higher-scoring out-of-scope document from ever occupying a top-k slot.

Embeddings here are a deterministic hashing-trick bag-of-words vector.
That keeps the module dependency-light and fully offline/deterministic
for tests, while still giving nearest-neighbour semantics good enough
to demonstrate (and adversarially test) the security property. Swap
`embed()` for a real embedding model in production; the search/ scoping
logic does not change.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

import numpy as np

from .contracts import Scope, ScopedChunk

_DIM = 256
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _token_index(token: str) -> int:
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % _DIM


def embed(text: str) -> np.ndarray:
    vector = np.zeros(_DIM, dtype=np.float64)
    for token in _TOKEN_RE.findall(text.lower()):
        vector[_token_index(token)] += 1.0
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector /= norm
    return vector


@dataclass
class _Record:
    chunk: ScopedChunk
    vector: np.ndarray


class VectorStore:
    def __init__(self) -> None:
        self._records: list[_Record] = []

    def add(self, chunk: ScopedChunk, vector: np.ndarray | None = None) -> None:
        self._records.append(_Record(chunk=chunk, vector=vector if vector is not None else embed(chunk.text)))

    def add_text(self, *, id: str, text: str, tenant: str, document_id: str, source_type: str = "document") -> None:
        self.add(ScopedChunk(id=id, text=text, tenant=tenant, document_id=document_id, source_type=source_type))

    def search(self, query: str, scope: Scope, top_k: int = 5) -> list[ScopedChunk]:
        """
        Authorization-scoped search.

        CRITICAL ORDERING: candidates are filtered by `scope` FIRST,
        and top-k is computed only over that authorized subset. This is
        the "predicate inside the search" requirement -- an
        out-of-scope document with a higher raw similarity score must
        never be able to bump an authorized document out of the top-k,
        because it is never in the candidate pool to begin with.
        """
        query_vector = embed(query)

        candidates = [
            record for record in self._records
            if scope.permits_document(record.chunk.document_id, record.chunk.tenant)
        ]

        scored = [
            (float(np.dot(query_vector, record.vector)), record.chunk)
            for record in candidates
        ]
        scored.sort(key=lambda pair: pair[0], reverse=True)

        results = []
        for score, chunk in scored[:top_k]:
            scoped_chunk = ScopedChunk(
                id=chunk.id,
                text=chunk.text,
                tenant=chunk.tenant,
                document_id=chunk.document_id,
                source_type=chunk.source_type,
                score=score,
                provenance=dict(chunk.provenance),
            )
            results.append(scoped_chunk)
        return results

    def unscoped_search_FOR_TESTS_ONLY(self, query: str, top_k: int = 5) -> list[ScopedChunk]:
        """
        Deliberately unscoped search, used only by the adversarial
        property test to construct a scenario where an out-of-tenant
        document is the closest match. Never call this from
        application code.
        """
        query_vector = embed(query)
        scored = [(float(np.dot(query_vector, record.vector)), record.chunk) for record in self._records]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [chunk for _, chunk in scored[:top_k]]
