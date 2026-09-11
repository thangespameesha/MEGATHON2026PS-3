from fastapi import FastAPI
from pydantic import BaseModel, Field

from .contracts import Chunk
from .guard import run_egress_guard
from .action_guard import ActionRequest


app = FastAPI(
    title="LUMO3 Stage 3",
    description="Egress and Answer Security Layer",
    version="1.0.0",
)


class ChunkInput(BaseModel):
    id: str
    text: str
    tenant: str
    source_type: str
    provenance: dict = Field(default_factory=dict)
    taint: bool = True


class ActionInput(BaseModel):
    action_type: str
    description: str
    source: str = "llm"
    # Must reflect a real, out-of-band authorization decision made by
    # server-side policy / an authenticated human -- never populated
    # from the LLM's own output. Default False: an action is
    # unauthorized until the caller proves otherwise.
    role_permitted: bool = False
    user_authorized: bool = False


class GuardRequest(BaseModel):
    output: str
    retrieved_chunks: list[ChunkInput] = Field(default_factory=list)
    action: ActionInput | None = None
    injection_detected: bool = False


@app.get("/")
def root():
    return {
        "service": "LUMO3 Stage 3",
        "status": "running",
    }


@app.post("/api/guard")
def guard_output(request: GuardRequest):

    chunks = [
        Chunk(
            id=chunk.id,
            text=chunk.text,
            tenant=chunk.tenant,
            source_type=chunk.source_type,
            provenance=chunk.provenance,
            taint=chunk.taint,
        )
        for chunk in request.retrieved_chunks
    ]

    action = None

    if request.action:
        action = ActionRequest(
            action_type=request.action.action_type,
            description=request.action.description,
            source=request.action.source,
            role_permitted=request.action.role_permitted,
            user_authorized=request.action.user_authorized,
        )

    try:
        decision = run_egress_guard(
            output=request.output,
            retrieved_chunks=chunks,
            action=action,
            injection_detected=request.injection_detected,
        )
    except Exception as exc:
        # Fail closed even for errors run_egress_guard's own try/except
        # blocks didn't anticipate (e.g. bad request construction
        # above). Never let an unhandled error fall through to a
        # default-allow response.
        return {
            "allow": False,
            "escalate": True,
            "reasons": [f"Fail-closed: unhandled error in guard pipeline ({exc.__class__.__name__})."],
            "evidence": [],
        }

    return {
        "allow": decision.allow,
        "escalate": decision.escalate,
        "reasons": decision.reasons,
        "evidence": decision.evidence,
    }