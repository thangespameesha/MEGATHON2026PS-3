👤 LUMO3 — EMPLOYEE PORTAL
Top Navigation
◆ LUMO3

> OVERVIEW     UPLOAD     LUMO3 CHAT     MY ACTIVITY

That's it. No Recent Inquiry. No fifth navigation.

1. 🏠 OVERVIEW

This is the employee's main landing page.

Top: 4 statistic boxes

Exactly 2 × 2:

┌────────────────────────┐    ┌────────────────────────┐
│ TOTAL DOCUMENTS        │    │ MY QUERIES             │
│                        │    │                        │
│          24            │    │          86            │
│ Uploaded by me         │    │ LUMO3 Chat             │
└────────────────────────┘    └────────────────────────┘


┌────────────────────────┐    ┌────────────────────────┐
│ UNDER REVIEW           │    │ SECURITY ALERTS        │
│                        │    │                        │
│           3            │    │           7            │
│ Awaiting review        │    │ Blocked requests       │
└────────────────────────┘    └────────────────────────┘
Below: Security graph

Show how securely the employee is interacting with organizational data.

◆ SECURITY ACTIVITY

       Security Score / Activity Trend

100 ┤                  ╭─────╮
 80 ┤            ╭─────╯     ╰──
 60 ┤       ╭────╯
 40 ┤  ╭────╯
    └────────────────────────────
      MON TUE WED THU FRI SAT
Below/alongside: Activity pie chart

Show the employee's activity distribution, such as:

Documents uploaded
LUMO3 queries
Blocked requests
Other security events
2. 📤 UPLOAD

This is where the employee uploads a document.

> LUMO3 // SECURE UPLOAD

┌─────────────────────────────────────────────┐
│                                             │
│             ◆ UPLOAD DOCUMENT              │
│                                             │
│             DROP FILE HERE                 │
│                                             │
│          PDF • DOCX • TXT • CSV             │
│                                             │
│              [ SELECT FILE ]                │
│                                             │
└─────────────────────────────────────────────┘

After selecting:

◆ DOCUMENT SCAN

FILE: company_report.pdf
SIZE: 2.4 MB

TOKENIZATION             ✓
CONTENT SCAN             ✓
SECURITY ANALYSIS        ...

Then the backend result is displayed.

Accepted
✓ DOCUMENT ACCEPTED

Security checks passed.
Document added to your authorized workspace.
Quarantined
⚠ DOCUMENT QUARANTINED

Suspicious content detected.

Your document has been sent to the
Security Lead for review.

STATUS: UNDER REVIEW

The employee cannot release it themselves.

3. 💬 LUMO3 CHAT

This is the employee's secure RAG interface.

> LUMO3 // SECURE CHAT

┌────────────────────────────────────────────────┐
│                                                │
│       ◆ LUMO3 KNOWLEDGE ASSISTANT             │
│                                                │
│  Ask something about your authorized data...  │
│                                                │
│                                                │
│ [ Type your question here...          ] [▶]    │
│                                                │
└────────────────────────────────────────────────┘

If authorized:

✓ REQUEST AUTHORIZED

LUMO3 RESPONSE

[ Answer ]

SOURCE
company_policy.pdf

If unauthorized:

✕ REQUEST BLOCKED

LUMO3 cannot provide this information.

You do not have permission to access
the requested information.

SECURITY STATUS: BLOCKED

So the employee sees the result, while the backend handles the actual authorization, retrieval, LLM processing and security checks.

4. 📋 MY ACTIVITY

This page contains two sections.

A. Document History
◆ DOCUMENT HISTORY

┌─────────────────────────────────────────────────────┐
│ DOCUMENT       SIZE      TIMESTAMP       RESULT     │
├─────────────────────────────────────────────────────┤
│ policy.pdf     2.4 MB    10 Sep 14:32    ✓ ACCEPTED │
│ report.pdf     8.1 MB    10 Sep 13:14    ⚠ REVIEW   │
│ notes.txt      120 KB    09 Sep 18:42    ✓ ACCEPTED │
└─────────────────────────────────────────────────────┘

Information shown:

Document name
Size
Upload timestamp
Result
B. Query History
◆ QUERY HISTORY

┌──────────────────────────────────────────────────────┐
│ QUERY                    TIME             RESULT      │
├──────────────────────────────────────────────────────┤
│ What is our leave...     14:42            ✓ PROVIDED  │
│ Show employee salary     14:39            ✕ BLOCKED   │
│ Explain security...      14:21            ✓ PROVIDED  │
└──────────────────────────────────────────────────────┘

Information shown:

Question asked
Timestamp
Whether LUMO3 provided the response or blocked it

We don't need to display the complete answer in the history.

🎮 Final Employee Flow
                    LUMO3 LOGIN
                        │
                        ▼
               EMPLOYEE DASHBOARD
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
      OVERVIEW        UPLOAD       LUMO3 CHAT
          │             │             │
          │             │             ├── Answer
          │             │             │
          │             │             └── Block
          │             │
          │             ├── Accepted
          │             └── Quarantined
          │
          ▼
    4 STATISTIC BOXES
          │
          ├── Security Graph
          │
          └── Activity Pie Chart

                        +
                        
                  MY ACTIVITY
                    │       │
                    ▼       ▼
                Document   Query
                 History   History

So the employee portal has exactly four navigations:

OVERVIEW | UPLOAD | LUMO3 CHAT | MY ACTIVITY

We'll keep the retro-game aesthetic throughout, but this is now the fixed employee structure