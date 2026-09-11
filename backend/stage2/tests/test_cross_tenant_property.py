"""
Randomized / adversarial Stage-2 property test.

Property under test, for every generated scenario:

    Tenant A asks for information
            |
    Tenant B has the closest matching document
            |
        Retriever
            |
    Tenant B document MUST NOT appear
            |
    If insufficient A documents -> DECLINED

This is deliberately adversarial: it constructs the query as a
near-verbatim copy of the tenant-B document's own text, which is the
worst case for a naive "search everything, filter after" implementation
(tenant-B's chunk should always win the raw similarity ranking) and the
best possible confirmation that the predicate really is applied inside
the search rather than after it.

Target: leak rate == 0 across all generated cases.
"""

from __future__ import annotations

from hypothesis import given, settings, strategies as st

from ..contracts import Identity, Role
from ..retriever import retrieve
from ..vector_store import VectorStore

_WORDS = [
    "revenue", "incident", "password", "contract", "salary", "roadmap",
    "customer", "breach", "merger", "payroll", "vendor", "renewal",
    "forecast", "termination", "penalty", "clause", "acquisition", "audit",
]

_topic = st.lists(st.sampled_from(_WORDS), min_size=3, max_size=6, unique=True).map(" ".join)
_a_doc_count = st.integers(min_value=0, max_value=3)


@settings(max_examples=200, deadline=None)
@given(topic=_topic, a_doc_count=_a_doc_count)
def test_tenant_b_never_leaks_into_tenant_a_results(topic: str, a_doc_count: int):
    store = VectorStore()

    # Tenant B holds the single closest-matching document: an exact
    # copy of the query topic. This maximizes its raw similarity score
    # against the query.
    store.add_text(
        id="b-secret",
        text=f"CONFIDENTIAL tenant B record about {topic} details and figures",
        tenant="tenant-b",
        document_id="doc-b-secret",
    )

    # Tenant A holds zero or more only-loosely-related documents.
    for i in range(a_doc_count):
        store.add_text(
            id=f"a-{i}",
            text=f"tenant A general note #{i}, unrelated filler content about office supplies",
            tenant="tenant-a",
            document_id=f"doc-a-{i}",
        )

    identity = Identity(user_id="attacker-victim-boundary", tenant="tenant-a", role=Role.EMPLOYEE)

    result = retrieve(store, identity, query=topic, top_k=5, min_required=1)

    returned_tenants = {chunk.tenant for chunk in result.chunks}
    assert "tenant-b" not in returned_tenants, (
        f"LEAK: tenant-b document surfaced in tenant-a retrieval for topic={topic!r}"
    )

    if a_doc_count == 0:
        # No authorized tenant-A material exists at all: must decline,
        # never fall back to the (higher-scoring) tenant-B match.
        assert result.declined is True
        assert result.chunks == []


@settings(max_examples=100, deadline=None)
@given(topic=_topic)
def test_security_lead_never_crosses_tenant_either(topic: str):
    """
    Security Lead has a broader in-tenant scope than Employee, but it
    is still confined to their own tenant -- broader RBAC scope must
    never mean cross-tenant.
    """
    store = VectorStore()
    store.add_text(
        id="b-secret",
        text=f"tenant B confidential record about {topic}",
        tenant="tenant-b",
        document_id="doc-b-secret",
    )
    store.add_text(
        id="a-1",
        text="tenant A unrelated filler",
        tenant="tenant-a",
        document_id="doc-a-1",
    )

    identity = Identity(user_id="sec-lead", tenant="tenant-a", role=Role.SECURITY_LEAD)
    result = retrieve(store, identity, query=topic, top_k=5, min_required=1)

    assert all(chunk.tenant == "tenant-a" for chunk in result.chunks)
