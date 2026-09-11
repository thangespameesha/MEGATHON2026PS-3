from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import tempfile
import uuid
from datetime import datetime

from .stage3.contracts import Chunk

from .stage2.contracts import Identity, Role, ScopedChunk
from .stage2.retriever import retrieve
from .stage2.vector_store import VectorStore

from .stage3.ingestion.document_parser import (
    extract_text,
    chunk_text,
    compute_sha256,
)
from .stage3.ingestion.injection_detector import scan_for_injections
from .stage3.guard import run_egress_guard


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="LUMO3 Secure RAG",
    description="Three-stage secure RAG architecture",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# IN-MEMORY DEMO STORAGE
# =========================================================

store = VectorStore()

USERS = {
    "emp@gmail.com": {
        "password": "123456789",
        "user_id": "EMP-001",
        "tenant": "LUMO3",
        "role": Role.EMPLOYEE,
    },
    "emp2@gmail.com": {
        "password": "123456789",
        "user_id": "EMP-002",
        "tenant": "LUMO3",
        "role": Role.EMPLOYEE,
    },
    "security@gmail.com": {
        "password": "123456789",
        "user_id": "SEC-001",
        "tenant": "LUMO3",
        "role": Role.SECURITY_LEAD,
    },
    "head@gmail.com": {
        "password": "123456789",
        "user_id": "HEAD-001",
        "tenant": "LUMO3",
        "role": Role.MAIN_HEAD,
    },
}

SESSIONS = {}
DOCUMENTS = {}
QUARANTINE = {}
ACTIVITY = {}


# =========================================================
# HELPERS
# =========================================================

def now():
    return datetime.now().isoformat(timespec="seconds")


def get_identity(authorization: Optional[str]) -> Identity:
    """
    Authenticate the request using the Bearer token.
    Fails closed if authentication is missing or invalid.
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    token = authorization.replace("Bearer ", "", 1)
    session = SESSIONS.get(token)

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
        )

    return Identity(
        user_id=session["user_id"],
        tenant=session["tenant"],
        role=session["role"],
        permitted_document_ids=frozenset(
            session.get("permitted_document_ids", [])
        ),
    )


def grant_document_access(user_id: str, document_id: str):
    """
    Grant a document to all active sessions belonging to the uploader.

    This is important because employee retrieval is document-scoped.
    """

    for session in SESSIONS.values():
        if session["user_id"] == user_id:
            current = set(session.get("permitted_document_ids", []))
            current.add(document_id)
            session["permitted_document_ids"] = list(current)


def remove_document_access(user_id: str, document_id: str):
    """
    Remove a document from all active sessions belonging to the uploader.
    """

    for session in SESSIONS.values():
        if session["user_id"] == user_id:
            current = set(session.get("permitted_document_ids", []))
            current.discard(document_id)
            session["permitted_document_ids"] = list(current)


# =========================================================
# HEALTH
# =========================================================

@app.get("/")
def root():
    return {
        "service": "LUMO3 Secure RAG",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "LUMO3",
    }


# =========================================================
# DASHBOARD (ROLE-AWARE & REAL DATA)
# =========================================================

@app.get("/api/dashboard")
def dashboard(authorization: Optional[str] = Header(None)):
    identity = get_identity(authorization)

    # -----------------------------------------------------
    # MAIN HEAD: Org-wide visibility across all users
    # -----------------------------------------------------
    if identity.role == Role.MAIN_HEAD:
        all_documents = list(DOCUMENTS.values())
        all_activity = []
        for user_act in ACTIVITY.values():
            all_activity.extend(user_act)
        all_activity.sort(key=lambda e: e.get("timestamp", ""), reverse=True)

        all_queries = [e for e in all_activity if e.get("type") == "query"]
        doc_uploads = [e for e in all_activity if e.get("type") == "document_upload"]
        blocked = [e for e in all_activity if e.get("status") == "blocked"]
        under_review = list(QUARANTINE.values())

        file_types = {}
        for d in all_documents:
            ext = Path(d.get("filename", "")).suffix.lower() or ".other"
            file_types[ext] = file_types.get(ext, 0) + 1

        return {
            "total_documents": len(all_documents),
            "my_queries": len(all_queries),
            "under_review": len(under_review),
            "security_alerts": len(blocked),
            "activity_distribution": {
                "docs_uploaded": len(doc_uploads),
                "lumo3_queries": len(all_queries),
                "blocked_requests": len(blocked),
                "other_events": max(0, len(all_activity) - len(doc_uploads) - len(all_queries)),
            },
            "activity": all_activity,
            "file_types": file_types,
        }

    # -----------------------------------------------------
    # SECURITY LEAD: Tenant-wide security visibility
    # -----------------------------------------------------
    if identity.role == Role.SECURITY_LEAD:
        tenant_docs = [d for d in DOCUMENTS.values() if d.get("tenant") == identity.tenant]
        tenant_activity = []
        for user_act in ACTIVITY.values():
            tenant_activity.extend(user_act)
        tenant_activity.sort(key=lambda e: e.get("timestamp", ""), reverse=True)

        tenant_queries = [e for e in tenant_activity if e.get("type") == "query"]
        doc_uploads = [e for e in tenant_activity if e.get("type") == "document_upload"]
        blocked = [e for e in tenant_activity if e.get("status") == "blocked"]
        under_review = [q for q in QUARANTINE.values() if q.get("tenant") == identity.tenant]

        return {
            "total_documents": len(tenant_docs),
            "my_queries": len(tenant_queries),
            "under_review": len(under_review),
            "security_alerts": len(blocked),
            "activity_distribution": {
                "docs_uploaded": len(doc_uploads),
                "lumo3_queries": len(tenant_queries),
                "blocked_requests": len(blocked),
                "other_events": max(0, len(tenant_activity) - len(doc_uploads) - len(tenant_queries)),
            },
            "activity": tenant_activity,
        }

    # -----------------------------------------------------
    # EMPLOYEE: Strictly isolated to own documents and activity
    # -----------------------------------------------------
    my_documents = [
        doc
        for doc in DOCUMENTS.values()
        if doc["uploader"] == identity.user_id
        and doc.get("status") in {"accepted", "released"}
    ]


    my_activity = ACTIVITY.get(identity.user_id, [])

    my_queries = [
        event
        for event in my_activity
        if event.get("type") == "query"
    ]

    document_uploads = [
        event
        for event in my_activity
        if event.get("type") == "document_upload"
    ]

    blocked_requests = [
        event
        for event in my_queries
        if event.get("status") == "blocked"
    ]

    other_events = [
        event
        for event in my_activity
        if event.get("type") not in {
            "query",
            "document_upload",
        }
    ]

    under_review = [
        item
        for item in QUARANTINE.values()
        if item["uploader"] == identity.user_id
    ]

    return {
        "total_documents": len(my_documents),
        "my_queries": len(my_queries),
        "under_review": len(under_review),
        "security_alerts": len(blocked_requests),
        "activity_distribution": {
            "docs_uploaded": len(document_uploads),
            "lumo3_queries": len(my_queries),
            "blocked_requests": len(blocked_requests),
            "other_events": len(other_events),
        },
        "activity": my_activity,
    }



# =========================================================
# LOGIN
# =========================================================

class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/login")
def login(request: LoginRequest):
    user = USERS.get(request.email)

    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = uuid.uuid4().hex

    # -----------------------------------------------------
    # Existing accepted documents belonging to this employee
    # -----------------------------------------------------

    permitted_document_ids = [
        document_id
        for document_id, document in DOCUMENTS.items()
        if (
            document["uploader"] == user["user_id"]
            and document["status"] in {"accepted", "released"}
        )
    ]

    SESSIONS[token] = {
        "user_id": user["user_id"],
        "tenant": user["tenant"],
        "role": user["role"],
        "email": request.email,
        "permitted_document_ids": permitted_document_ids,
    }

    ACTIVITY.setdefault(user["user_id"], [])

    return {
        "token": token,
        "email": request.email,
        "user_id": user["user_id"],
        "tenant": user["tenant"],
        "role": user["role"].value,
    }


# =========================================================
# DOCUMENT UPLOAD + STAGE 1 SECURITY SCAN
# =========================================================

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    identity = get_identity(authorization)

    # Only employees can upload
    if identity.role != Role.EMPLOYEE:
        raise HTTPException(
            status_code=403,
            detail="Only employees can upload documents",
        )

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    allowed_extensions = {
        ".txt",
        ".pdf",
        ".docx",
    }

    filename = file.filename or "unknown"
    extension = Path(filename).suffix.lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only .txt, .pdf, and .docx files are supported",
        )

    # -----------------------------------------------------
    # Read file
    # -----------------------------------------------------

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"

    # -----------------------------------------------------
    # Integrity hash
    # -----------------------------------------------------

    file_hash = compute_sha256(file_bytes)

    # -----------------------------------------------------
    # Temporary file for parser
    # -----------------------------------------------------

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=extension,
    ) as temp:
        temp.write(file_bytes)
        temp_path = temp.name

    try:
        text = extract_text(temp_path)
    finally:
        Path(temp_path).unlink(missing_ok=True)

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in document",
        )

    # =====================================================
    # STAGE 1 — DATA INGESTION SECURITY
    # =====================================================

    scan = scan_for_injections(text)

    chunks = chunk_text(
        text,
        chunk_size=500,
        overlap=50,
        doc_id=document_id,
    )

    # -----------------------------------------------------
    # Document metadata
    # -----------------------------------------------------

    document = {
        "id": document_id,
        "filename": filename,
        "tenant": identity.tenant,
        "uploader": identity.user_id,
        "uploader_email": SESSIONS.get(
            authorization.replace("Bearer ", "", 1),
            {},
        ).get("email"),
        "sha256": file_hash,
        "uploaded_at": now(),
        "risk_points": scan["risk_points"],
        "reasons": scan["reasons"],
        "chunk_count": len(chunks),
        "status": (
            "quarantined"
            if scan["is_flagged"]
            else "accepted"
        ),
        "stage": "Stage 1",
    }

    DOCUMENTS[document_id] = document

    # =====================================================
    # THREAT DETECTED → QUARANTINE
    # =====================================================

    if scan["is_flagged"]:
        QUARANTINE[document_id] = {
            **document,
            "chunks": chunks,
            "evidence": scan["reasons"],
        }

        ACTIVITY.setdefault(
            identity.user_id,
            [],
        ).append({
            "type": "document_upload",
            "document": filename,
            "document_id": document_id,
            "status": "quarantined",
            "timestamp": now(),
        })

        return {
            "status": "quarantined",
            "document_id": document_id,
            "filename": filename,
            "risk_points": scan["risk_points"],
            "reasons": scan["reasons"],
            "sha256": file_hash,
            "chunk_count": len(chunks),
        }

    # =====================================================
    # SAFE DOCUMENT → STAGE 2 VECTOR STORE
    # =====================================================

    for chunk in chunks:
        store.add(
            ScopedChunk(
                id=chunk["chunk_id"],
                text=chunk["text"],
                tenant=identity.tenant,
                document_id=document_id,
                source_type="document",
                score=0.0,
                provenance={
                    "document_id": document_id,
                    "filename": filename,
                    "uploader": identity.user_id,
                    "sha256": file_hash,
                },
            )
        )

    # -----------------------------------------------------
    # Grant employee access to their accepted document
    # -----------------------------------------------------

    grant_document_access(
        identity.user_id,
        document_id,
    )

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    ACTIVITY.setdefault(
        identity.user_id,
        [],
    ).append({
        "type": "document_upload",
        "document": filename,
        "document_id": document_id,
        "status": "accepted",
        "timestamp": now(),
    })

    return {
        "status": "accepted",
        "document_id": document_id,
        "filename": filename,
        "risk_points": scan["risk_points"],
        "reasons": scan["reasons"],
        "sha256": file_hash,
        "chunk_count": len(chunks),
    }


# =========================================================
# QUARANTINE REVIEW
# =========================================================

@app.get("/api/quarantine")
def get_quarantine(
    authorization: Optional[str] = Header(None),
):
    identity = get_identity(authorization)

    if identity.role not in {
        Role.SECURITY_LEAD,
        Role.MAIN_HEAD,
    }:
        raise HTTPException(
            status_code=403,
            detail="Only Security Lead or Main Head can review quarantine",
        )

    items = []

    for document_id, item in QUARANTINE.items():

        # Security Lead can only see own tenant
        if (
            item["tenant"] != identity.tenant
            and identity.role != Role.MAIN_HEAD
        ):
            continue

        items.append({
            "id": document_id,
            "document": item["filename"],
            "filename": item["filename"],
            "uploader": item["uploader"],
            "tenant": item["tenant"],
            "uploaded": item["uploaded_at"],
            "threatClass": "Prompt Injection",
            "stage": "Stage 1",
            "status": "quarantined",
            "risk": item["risk_points"],
            "evidence": item["evidence"],
            "chunkId": (
                item["chunks"][0]["chunk_id"]
                if item["chunks"]
                else None
            ),
            "provenance": {
                "sha256": item["sha256"],
                "document_id": document_id,
            },
        })

    return {
        "items": items,
    }


# =========================================================
# QUARANTINE DECISION
# =========================================================

class QuarantineDecision(BaseModel):
    decision: str


@app.post("/api/quarantine/{document_id}/decision")
def quarantine_decision(
    document_id: str,
    request: QuarantineDecision,
    authorization: Optional[str] = Header(None),
):
    identity = get_identity(authorization)

    # Only Security Lead can approve
    if identity.role != Role.SECURITY_LEAD:
        raise HTTPException(
            status_code=403,
            detail="Only Security Lead can approve quarantine decisions",
        )

    item = QUARANTINE.get(document_id)

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Quarantined document not found",
        )

    # Tenant isolation
    if item["tenant"] != identity.tenant:
        raise HTTPException(
            status_code=403,
            detail="Document belongs to another tenant",
        )

    # Separation of duties: Security Lead cannot approve their own uploaded document
    if item.get("uploader") == identity.user_id:
        raise HTTPException(
            status_code=403,
            detail="Conflict of interest: Security Lead cannot review or approve their own uploaded document.",
        )

    if request.decision not in {
        "release",
        "confirm_threat",
    }:
        raise HTTPException(
            status_code=400,
            detail="Decision must be 'release' or 'confirm_threat'",
        )

    # =====================================================
    # CONFIRM THREAT
    # =====================================================

    if request.decision == "confirm_threat":

        DOCUMENTS[document_id]["status"] = "confirmed_threat"

        # Ensure uploader never receives access
        remove_document_access(
            item["uploader"],
            document_id,
        )

        del QUARANTINE[document_id]

        ACTIVITY.setdefault(
            identity.user_id,
            [],
        ).append({
            "type": "quarantine_decision",
            "document": item["filename"],
            "document_id": document_id,
            "decision": "confirmed_threat",
            "timestamp": now(),
        })

        return {
            "success": True,
            "decision": "confirmed_threat",
            "document_id": document_id,
            "status": "confirmed_threat",
        }

    # =====================================================
    # RELEASE
    # =====================================================

    for chunk in item["chunks"]:
        store.add(
            ScopedChunk(
                id=chunk["chunk_id"],
                text=chunk["text"],
                tenant=item["tenant"],
                document_id=document_id,
                source_type="document",
                score=0.0,
                provenance={
                    "document_id": document_id,
                    "filename": item["filename"],
                    "uploader": item["uploader"],
                    "sha256": item["sha256"],
                    "released_by": identity.user_id,
                },
            )
        )

    DOCUMENTS[document_id]["status"] = "released"

    # Grant released document to its uploader
    grant_document_access(
        item["uploader"],
        document_id,
    )

    del QUARANTINE[document_id]

    ACTIVITY.setdefault(
        identity.user_id,
        [],
    ).append({
        "type": "quarantine_decision",
        "document": item["filename"],
        "document_id": document_id,
        "decision": "released",
        "timestamp": now(),
    })

    return {
        "success": True,
        "decision": "released",
        "document_id": document_id,
        "status": "released",
    }


# =========================================================
# SECURE RAG CHAT — STAGE 2 + STAGE 3
# =========================================================

class ChatRequest(BaseModel):
    query: str


@app.post("/api/chat")
def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None),
):
    identity = get_identity(authorization)

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty",
        )

    # =====================================================
    # STAGE 1/3 — SCAN QUERY FOR INJECTIONS & JAILBREAKS
    # =====================================================

    query_scan = scan_for_injections(request.query)
    if query_scan["is_flagged"]:
        ACTIVITY.setdefault(
            identity.user_id,
            [],
        ).append({
            "type": "query",
            "query": request.query,
            "status": "blocked",
            "timestamp": now(),
            "reasons": query_scan["reasons"],
        })

        return {
            "status": "blocked",
            "decision": "BLOCK",
            "answer": (
                "The query was blocked by LUMO3 prompt-injection security controls."
            ),
            "sources": [],
            "reasons": query_scan["reasons"],
            "evidence": [{"risk_points": query_scan["risk_points"]}],
        }

    # =====================================================
    # STAGE 2 — AUTHORIZATION-SCOPED RETRIEVAL
    # =====================================================

    result = retrieve(
        store=store,
        identity=identity,
        query=request.query,
        top_k=5,
        min_required=1,
    )

    # -----------------------------------------------------
    # Insufficient authorized results
    # -----------------------------------------------------

    if result.declined:

        ACTIVITY.setdefault(
            identity.user_id,
            [],
        ).append({
            "type": "query",
            "query": request.query,
            "status": "blocked",
            "timestamp": now(),
            "reasons": [result.decline_reason],
        })

        return {
            "status": "blocked",
            "decision": "DECLINED",
            "answer": (
                "I don't have enough authorized information "
                "to answer that."
            ),
            "sources": [],
            "reasons": [
                result.decline_reason
            ],
        }

    # =====================================================
    # BUILD ANSWER ONLY FROM AUTHORIZED CONTENT
    # =====================================================

    context_parts = []

    for chunk in result.chunks:
        context_parts.append(chunk.text)

    answer = " ".join(context_parts)

    # =====================================================
    # STAGE 3 — EGRESS / ANSWER SECURITY
    # =====================================================

    answer_scan = scan_for_injections(answer)

    decision = run_egress_guard(
        output=answer,
        retrieved_chunks=[
            Chunk(
                id=chunk.id,
                text=chunk.text,
                tenant=chunk.tenant,
                source_type=chunk.source_type,
                provenance=chunk.provenance,
                taint=False,
            )
            for chunk in result.chunks
        ],
        action=None,
        injection_detected=answer_scan["is_flagged"],
    )


    # -----------------------------------------------------
    # Record query activity
    # -----------------------------------------------------

    ACTIVITY.setdefault(
        identity.user_id,
        [],
    ).append({
        "type": "query",
        "query": request.query,
        "status": (
            "allowed"
            if decision.allow
            else "blocked"
        ),
        "timestamp": now(),
    })

    # =====================================================
    # STAGE 3 BLOCK
    # =====================================================

    if not decision.allow:

        return {
            "status": "blocked",
            "decision": "BLOCK",
            "answer": (
                "The response was blocked by "
                "LUMO3 security controls."
            ),
            "sources": [],
            "reasons": decision.reasons,
            "evidence": decision.evidence,
        }

    # =====================================================
    # ALLOWED RESPONSE
    # =====================================================

    return {
        "status": "allowed",
        "decision": "ALLOW",
        "answer": answer,
        "sources": [
            {
                "document_id": chunk.document_id,
                "chunk_id": chunk.id,
                "score": chunk.score,
                "provenance": chunk.provenance,
            }
            for chunk in result.chunks
        ],
        "reasons": decision.reasons,
        "evidence": decision.evidence,
    }