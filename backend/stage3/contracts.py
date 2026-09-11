from dataclasses import dataclass, field
from typing import Any


@dataclass
class Chunk:
    id: str
    text: str
    tenant: str
    source_type: str
    provenance: dict[str, Any] = field(default_factory=dict)
    taint: bool = True


@dataclass
class RetrievalResult:
    chunks: list[Chunk]
    declined: bool = False
    decline_reason: str | None = None
    scope_applied: dict[str, Any] = field(default_factory=dict)
    latency_ms: float = 0.0


@dataclass
class GuardDecision:
    allow: bool
    escalate: bool
    reasons: list[str] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)