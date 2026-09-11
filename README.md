# LUMO3 — Secure RAG Architecture

LUMO3 is a three-stage cybersecurity architecture designed to secure Retrieval-Augmented Generation (RAG) systems against malicious documents, prompt injection, unauthorized retrieval, data leakage, and unsafe outbound actions.

## Architecture

```text
                    LUMO3
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       STAGE 1     STAGE 2     STAGE 3
       INGEST      RETRIEVE     EGRESS
          │           │           │
          ▼           ▼           ▼
    Data Integrity   RBAC      Answer Security
    Threat Scan      Scope     Provenance
    Hashing          Tenant    Taint
    Chunking         Isolation URL Guard
          │           │        Sanitizer
          ▼           ▼        Action Guard
     Vector Store  Authorized      │
                    Context        ▼
                              ALLOW / BLOCK
````

## Core Security Invariant

> Retrieved content can provide facts, but cannot widen access, authorize an action, or cause unsafe outbound effects.

## Stage 1 — Ingest & Data Integrity

Every uploaded document is inspected before entering the knowledge base.

* PDF, DOCX and TXT support
* Text extraction
* SHA-256 hashing
* Document chunking
* Prompt-injection detection
* Suspicious-content detection
* Provenance tracking
* Safe documents are stored in the vector database
* Threat documents are sent to quarantine

```text
Document Upload
      ↓
Text Extraction
      ↓
SHA-256 Hash
      ↓
Security Scan
      ↓
   ┌──┴──┐
   ↓     ↓
 SAFE  THREAT
   ↓     ↓
Vector  Quarantine
Store
```

## Stage 2 — Secure Retrieval & Access Control

LUMO3 applies authorization before effective vector retrieval.

* Authentication
* Role-Based Access Control (RBAC)
* Tenant isolation
* Document-level permissions
* Scoped vector retrieval
* Defense-in-depth authorization checks
* Fail-closed behavior
* No unrestricted fallback

```text
User
 ↓
Authentication
 ↓
Identity + Role
 ↓
Tenant / Document Scope
 ↓
Vector Search
 ↓
Authorized Chunks
```

Unauthorized documents are never returned to the user.

## Stage 3 — Answer & Egress Security

LUMO3 protects generated responses before they reach the user or trigger an action.

* Provenance tracking
* Taint tracking
* Prompt-injection boundary checks
* URL/data-exfiltration detection
* Output sanitization
* Action authorization
* Fail-closed security decisions

```text
Authorized Context
       ↓
Answer Generation
       ↓
Egress Security Guard
       ↓
 ┌─────┼─────┐
 ↓     ↓     ↓
ALLOW ESCALATE BLOCK
```

## Quarantine System

Suspicious documents are isolated before entering the vector store.

```text
Employee Upload
      ↓
Stage 1 Scan
      ↓
Threat Detected
      ↓
QUARANTINE
      ↓
Security Lead Review
      ↓
 ┌───────────────┐
 ↓               ↓
RELEASE      CONFIRM THREAT
```

Employees cannot approve their own quarantined documents.

## User Roles

### Employee

* Upload documents
* Use LUMO3 Chat
* Query authorized knowledge
* View uploaded documents
* View personal activity
* View quarantine status

Employees cannot:

* Approve their own quarantined documents
* Access unauthorized documents
* Bypass retrieval scope

### Security Lead

* Review quarantined documents
* Release documents
* Confirm threats
* View security events
* Use LUMO3 Chat

### Main Head

* View organizational security information
* View analytics
* Access reports
* Use LUMO3 Chat
* Access account and settings

## Technology Stack

### Backend

* Python
* FastAPI
* Uvicorn
* Pydantic
* Chroma Vector Store
* PyMuPDF
* python-docx
* SHA-256

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Recharts

### Security

* RBAC
* Tenant Isolation
* Document Authorization
* Prompt Injection Detection
* Provenance
* Taint Analysis
* URL Exfiltration Detection
* Output Sanitization
* Action Authorization
* Fail-Closed Security

## Project Structure

```text
LUMO3/
│
├── backend/
│   ├── main.py
│   │
│   ├── stage2/
│   │   ├── contracts.py
│   │   ├── rbac.py
│   │   ├── retriever.py
│   │   ├── vector_store.py
│   │   └── tests/
│   │
│   └── stage3/
│       ├── action_guard.py
│       ├── api.py
│       ├── contracts.py
│       ├── guard.py
│       ├── provenance.py
│       ├── sanitizer.py
│       ├── taint.py
│       ├── url_guard.py
│       │
│       ├── ingestion/
│       │   ├── document_parser.py
│       │   └── injection_detector.py
│       │
│       └── tests/
│
├── src/
│   ├── App.tsx
│   ├── LoginPage.tsx
│   ├── EmployeePortal.tsx
│   ├── SecurityLeadPortal.tsx
│   ├── MainHeadPortal.tsx
│   ├── LumoSecureChat.tsx
│   ├── api.ts
│   └── ...
│
├── package.json
├── vite.config.ts
└── README.md
```

## Running the Project

### Backend Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r backend/stage2/requirements.txt
pip install -r backend/stage3/requirements.txt
python -m pip install pymupdf
```

Start the backend:

```powershell
python -m uvicorn backend.main:app --port 8001
```

Backend:

```text
http://127.0.0.1:8001
```

### Frontend Setup

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev -- --port 5173
```

Frontend:

```text
http://localhost:5173
```

## Demo Credentials

| Role          | Email                | Password    |
| ------------- | -------------------- | ----------- |
| Employee      | `emp@gmail.com`      | `123456789` |
| Security Lead | `security@gmail.com` | `123456789` |
| Main Head     | `head@gmail.com`     | `123456789` |

> These credentials are for local demonstration only.

## API Endpoints

| Method | Endpoint                                 | Purpose                |
| ------ | ---------------------------------------- | ---------------------- |
| GET    | `/api/health`                            | Backend health         |
| POST   | `/api/login`                             | Authentication         |
| POST   | `/api/upload`                            | Secure document upload |
| GET    | `/api/dashboard`                         | Dashboard data         |
| POST   | `/api/chat`                              | Secure RAG chat        |
| GET    | `/api/quarantine`                        | View quarantine queue  |
| POST   | `/api/quarantine/{document_id}/decision` | Quarantine decision    |

## Security Flow

### Safe Document

```text
Upload
  ↓
Stage 1
  ↓
SAFE
  ↓
Chunk
  ↓
Vector Store
  ↓
Stage 2 Authorization
  ↓
Authorized Retrieval
  ↓
Stage 3 Egress Guard
  ↓
ALLOW
```

### Malicious Document

```text
Upload
  ↓
Stage 1
  ↓
THREAT DETECTED
  ↓
QUARANTINE
  ↓
Security Lead Review
```

### Unauthorized Query

```text
User Query
    ↓
Authentication
    ↓
RBAC / Scope Check
    ↓
Unauthorized
    ↓
DECLINED
```

### Malicious Output

```text
Retrieved Context
       ↓
Answer Generation
       ↓
Stage 3 Egress Guard
       ↓
Security Violation
       ↓
BLOCK
```

## Security Principles

### Never Trust Retrieved Content

Retrieved documents are treated as data, not instructions.

### Authorization Before Retrieval

Access control constrains the retrieval operation itself.

### No Permission Widening

If authorized information is insufficient, LUMO3 declines the request instead of searching outside the user's scope.

### Fail Closed

Security failures result in blocking or escalation rather than unrestricted access.

### Provenance

Retrieved information maintains its source information throughout the security pipeline.

### Content Cannot Authorize Actions

A document or generated response cannot grant itself permission to access data, change authorization, or perform restricted actions.

## Threats Addressed

* Prompt Injection
* Malicious Documents
* RAG Poisoning
* Unauthorized Retrieval
* Cross-Tenant Data Leakage
* Sensitive Data Exposure
* URL/Data Exfiltration
* Unsafe Tool Actions
* Untrusted LLM Output

## Security Testing

The architecture is designed to validate:

* Tenant isolation
* RBAC enforcement
* Document-level authorization
* Unauthorized retrieval rejection
* Prompt-injection detection
* Quarantine workflow
* Quarantine authorization
* Provenance handling
* Taint handling
* URL exfiltration protection
* Output sanitization
* Action authorization
* Fail-closed behavior

### Target Security Property

```text
Cross-Tenant Leak Rate = 0
```

Security metrics should be generated from actual evaluation tests rather than hardcoded demo values.

## LUMO3 Dashboards

### Employee Portal

* Overview
* Upload
* LUMO3 Chat
* My Activity

### Security Lead Portal

* Overview
* Review
* Security Log
* Report
* LUMO3 Chat

### Main Head Portal

* Overview
* Analytics
* Reports
* LUMO3 Chat
* Settings

## Demo Flow

1. Login as Employee
2. Upload a safe document
3. Verify the document is accepted
4. Ask an authorized question
5. Verify the response is allowed
6. Upload a malicious document
7. Verify it is quarantined
8. Login as Security Lead
9. Review the quarantined document
10. Release or confirm the threat
11. Test an unauthorized query
12. Verify the request is declined
13. Test malicious output or exfiltration
14. Verify Stage 3 blocks it

## Future Improvements

* Persistent database storage
* Production-grade authentication
* OAuth / SSO integration
* Enterprise identity providers
* Advanced document-poisoning detection
* Centralized audit logging
* SIEM integration
* Automated security evaluation
* Continuous red-team testing
* Production deployment

## Team

### Team LUMOS

LUMO3 was developed as a cybersecurity-focused solution for the Secure RAG problem.

## Disclaimer

LUMO3 is a cybersecurity hackathon/research prototype demonstrating secure RAG architecture and security controls.

Development credentials and local services are intended for demonstration and testing and should not be used in production.

```
```
