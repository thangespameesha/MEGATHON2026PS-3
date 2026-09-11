"""
Authorization-scoped retrieval.

    Identity + Role + Tenant
            |
      build_scope()              <-- from rbac.py, identity only
            |
     vector_store.search(scope)  <-- predicate applied INSIDE search
            |
      enough authorized chunks?
        /              \\
     yes                no
      |                  |
   return chunks      DECLINED   (never: retry without the tenant filter)

The single invariant this module exists to protect: if the tenant-
scoped search does not return enough authorized material, the response
is DECLINED. There is no fallback path anywhere in this module that
re-runs the search with the tenant/doc predicate removed or widened.
"""

from __future__ import annotations

from .contracts import Identity, RetrievalResult, Scope
from .rbac import build_scope, narrow_scope
from .vector_store import VectorStore

DEFAULT_MIN_REQUIRED = 1


def retrieve(
    store: VectorStore,
    identity: Identity,
    query: str,
    *,
    top_k: int = 5,
    min_required: int = DEFAULT_MIN_REQUIRED,
    requested_scope: Scope | None = None,
) -> RetrievalResult:
    """
    Run an authorization-scoped retrieval for `identity`.

    `requested_scope`, if given (e.g. "search only this folder"), can
    only narrow the identity-derived scope -- see narrow_scope(). It is
    never used to widen access, and it never originates from retrieved
    or generated content in this codebase; callers must only construct
    it from other authenticated, server-side data.
    """
    base_scope = build_scope(identity)

    scope = base_scope if requested_scope is None else narrow_scope(base_scope, requested_scope)

    chunks = store.search(query=query, scope=scope, top_k=top_k)
    chunks = [chunk for chunk in chunks if chunk.score > 0]

    if len(chunks) < min_required:
        # Fail closed. Do NOT retry with a relaxed/removed tenant
        # filter -- that is exactly the cross-tenant leak this stage
        # exists to prevent.
        return RetrievalResult(
            chunks=[],
            declined=True,
            decline_reason=(
                f"Insufficient authorized results ({len(chunks)}/{min_required}) "
                f"within scope; declining rather than widening the search scope."
            ),
            scope_applied=scope,
            requested_k=top_k,
            min_required=min_required,
        )

    return RetrievalResult(
        chunks=chunks,
        declined=False,
        decline_reason=None,
        scope_applied=scope,
        requested_k=top_k,
        min_required=min_required,
    )
