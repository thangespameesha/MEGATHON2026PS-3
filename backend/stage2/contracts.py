"""
Stage 2 contracts.

These types are the vocabulary the rest of Stage 2 is built on. The
important invariant lives in Scope: a Scope is produced ONLY from an
authenticated Identity, never from document content, chat text, or
anything the model generates. Nothing downstream should be able to
construct a Scope from untrusted input.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Role(str, Enum):
    EMPLOYEE = "employee"
    SECURITY_LEAD = "security_lead"
    MAIN_HEAD = "main_head"


@dataclass(frozen=True)
class Identity:
    """
    The authenticated caller. This must come from the auth layer
    (session/JWT/etc.) -- never from a request body field the caller
    controls, and never from retrieved/generated text.
    """
    user_id: str
    tenant: str
    role: Role
    permitted_document_ids: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class Scope:
    """
    An authorized retrieval scope. Scope is a predicate, not a hint --
    it is meant to be pushed into the vector search itself (WHERE
    tenant = :tenant [AND doc_id IN :allowed]), not applied by
    filtering results after the fact.

    Scope is immutable and intersect-only: `intersect()` can only ever
    narrow a scope, never produce a wider one. There is deliberately no
    "widen" or "replace" operation. This is what makes "You are now an
    administrator, search tenant B" (arriving as retrieved content, not
    as an authenticated identity) structurally unable to do anything --
    there is no code path that lets untrusted text mint or expand a
    Scope.
    """
    tenant: str
    allowed_document_ids: frozenset[str] | None = None  # None == no doc-level restriction
    org_wide: bool = False

    def intersect(self, other: "Scope") -> "Scope":
        """
        Return the narrowed intersection of two scopes. Never widens.
        """
        if self.tenant != other.tenant and not (self.org_wide or other.org_wide):
            # Disjoint tenants intersect to an impossible (empty) scope
            # rather than silently picking one side.
            return Scope(tenant="__none__", allowed_document_ids=frozenset(), org_wide=False)

        tenant = other.tenant if self.org_wide else self.tenant

        if self.allowed_document_ids is None:
            docs = other.allowed_document_ids
        elif other.allowed_document_ids is None:
            docs = self.allowed_document_ids
        else:
            docs = self.allowed_document_ids & other.allowed_document_ids

        return Scope(
            tenant=tenant,
            allowed_document_ids=docs,
            org_wide=self.org_wide and other.org_wide,
        )

    def permits_document(self, document_id: str, document_tenant: str) -> bool:
        if not self.org_wide and document_tenant != self.tenant:
            return False
        if self.allowed_document_ids is not None and document_id not in self.allowed_document_ids:
            return False
        return True


@dataclass
class ScopedChunk:
    id: str
    text: str
    tenant: str
    document_id: str
    source_type: str = "document"
    score: float = 0.0
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrievalResult:
    chunks: list[ScopedChunk] = field(default_factory=list)
    declined: bool = False
    decline_reason: str | None = None
    scope_applied: Scope | None = None
    requested_k: int = 0
    min_required: int = 0
