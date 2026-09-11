🛡️ LUMO3 — SECURITY LEAD PORTAL
Top Navigation — 5 items
◆ LUMO3 // SECURITY OPERATIONS

> OVERVIEW     REVIEW     SECURITY LOG     REPORT     LUMO3 CHAT

The active navigation gets the cyan neon HUD treatment.

1. OVERVIEW

This is the Security Lead's main command center.

A. Four top statistic boxes

Exactly the same 2 × 2 structure as the Employee dashboard, but with security-specific metrics.

┌─────────────────────────┐    ┌─────────────────────────┐
│ ACTIVE THREATS          │    │ QUARANTINED             │
│                         │    │                         │
│          12             │    │           8             │
│ Awaiting investigation  │    │ Confirmed threats       │
└─────────────────────────┘    └─────────────────────────┘


┌─────────────────────────┐    ┌─────────────────────────┐
│ BLOCKED REQUESTS        │    │ THREAT DETECTION RATE   │
│                         │    │                         │
│          37             │    │          94.7%          │
│ LUMO3 security blocks   │    │ Current detection rate  │
└─────────────────────────┘    └─────────────────────────┘

These numbers should come dynamically from the backend.

2. ACTIVE THREATS

Below the four cards, have a large Active Threats panel.

This is essentially the Security Lead's investigation queue.

◆ ACTIVE THREATS
────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│ ⚠ THREAT #L3-014                                        │
│                                                         │
│ Document: employee_report.pdf                           │
│ Uploaded by: employee@company.com                       │
│ Risk Score: ███████████████░░░ 82/100                   │
│ Threat Class: DATA POISONING                            │
│ Status: UNDER INVESTIGATION                             │
│                                                         │
│                     [ REVIEW → ]                        │
└─────────────────────────────────────────────────────────┘

Multiple threats can appear as rows/cards.

The Security Lead should immediately understand:

What happened → Who uploaded it → How dangerous → What needs investigation.

3. THREAT CATEGORIES

Another panel should visualize what kinds of threats are being detected.

For example:

◆ THREAT CATEGORIES

PROMPT INJECTION        ████████████  42%
DATA POISONING          ███████       26%
AUTHORITY OVERRIDE      █████          18%
DATA EXTRACTION         ███            9%
OTHER                   ██             5%

You could alternatively make this a donut/pie chart, which would fit the retro HUD style nicely.

The categories should come from your actual security classifications.

4. SECURITY EVENTS / THREAT ACTIVITY

Another overview panel can show the recent security events.

◆ SECURITY EVENTS
────────────────────────────────────────────────────

14:42:17   PROMPT INJECTION       HIGH       BLOCKED
14:39:02   DATA POISONING         CRITICAL   QUARANTINED
14:31:44   AUTHORITY OVERRIDE     MEDIUM     BLOCKED
14:28:10   NORMAL REQUEST         LOW        ALLOWED
14:21:53   DATA EXTRACTION        HIGH       ESCALATED

This gives the Security Lead a quick view of what is happening right now.

5. REVIEW

This is the most important Security Lead page.

> LUMO3 // THREAT REVIEW

The main area is the Quarantine Review Queue.

Each document shows:
┌──────────────────────────────────────────────────────────────┐
│ DOCUMENT: employee_policy.pdf                               │
├──────────────────────────────────────────────────────────────┤
│ Risk Score       87 / 100                                   │
│ Uploaded By      employee@company.com                       │
│ Tenant            Engineering                               │
│ Uploaded         10 SEP 2026 • 14:32                        │
│ Threat Class      PROMPT INJECTION                           │
│ Detection Stage   INGESTION                                 │
│ Threat Status     UNDER REVIEW                              │
│ Chunk ID          CHK-00427                                 │
│ Provenance        EMPLOYEE PORTAL                           │
├──────────────────────────────────────────────────────────────┤
│ DETECTION EVIDENCE                                          │
│                                                             │
│ ⚠ Instruction override detected                            │
│ ⚠ Authority escalation attempt                             │
│ ⚠ Data extraction pattern                                  │
├──────────────────────────────────────────────────────────────┤
│ REVIEW ACTION                                               │
│                                                             │
│ [ ✓ RELEASE DOCUMENT ]       [ ✕ CONFIRM THREAT ]            │
└──────────────────────────────────────────────────────────────┘
Your two actions are clear:

RELEASE DOCUMENT

→ Document passes the security review
→ Goes into the authorized database/knowledge base.

CONFIRM THREAT

→ Document is confirmed malicious
→ It is terminated/blocked and does not enter the database.

No employee-side approval here.

6. SECURITY LOG

This is the complete historical event log.

> LUMO3 // SECURITY LOG

At the top:

[ ALL ] [ ALLOWED ] [ BLOCKED ] [ QUARANTINED ] [ ESCALATED ]

Then the table:

┌─────────────────────────────────────────────────────────────────┐
│ TIMESTAMP │ USER │ EVENT TYPE │ RISK │ DECISION                │
├─────────────────────────────────────────────────────────────────┤
│ 14:42:17  │ E042 │ INJECTION  │ 92   │ BLOCKED                 │
│ 14:39:02  │ E017 │ UPLOAD      │ 87   │ QUARANTINED             │
│ 14:31:44  │ E021 │ QUERY       │ 76   │ BLOCKED                 │
│ 14:28:10  │ E031 │ UPLOAD      │ 12   │ ALLOWED                 │
└─────────────────────────────────────────────────────────────────┘

Each record contains exactly what you described:

Timestamp
User
User ID
Event type
Risk score
Decision
7. REPORT

This should be more analytical.

> LUMO3 // SECURITY REPORTS

At the top:

REPORT PERIOD

[ 24 HOURS ] [ 7 DAYS ] [ 30 DAYS ] [ CUSTOM ]

Then display:

Security Summary
DOCUMENTS ANALYZED          428
THREATS DETECTED             37
DOCUMENTS QUARANTINED        21
REQUESTS BLOCKED             64
THREATS CONFIRMED            18
DETECTION RATE             94.7%

Then graphs:

Threat activity over time
Threat categories
Employee activity/security events
Allowed vs blocked vs quarantined
Detection performance

And finally:

[ ↓ DOWNLOAD REPORT ]

The report should be downloadable, as you requested.

8. LUMO3 CHAT

The Security Lead also gets access to LUMO3 Chat.

But the UI can be slightly more advanced than the employee version.

> LUMO3 // SECURITY ASSISTANT

┌──────────────────────────────────────────────────────┐
│                                                      │
│  ◆ SECURE SECURITY CHAT                              │
│                                                      │
│  Ask about authorized security information...        │
│                                                      │
│ [ Type your query...                       ] [ ▶ ]   │
│                                                      │
└──────────────────────────────────────────────────────┘

The backend still controls:

authentication → authorization → retrieval → LLM → egress security → decision.

🎮 Final Security Lead Structure
                     LUMO3
                       │
              SECURITY LEAD LOGIN
                       │
                       ▼
           SECURITY OPERATIONS CENTER
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   OVERVIEW          REVIEW        SECURITY LOG
       │               │                │
       │               │                └─ All events
       │               │                   ├─ Allowed
       │               │                   ├─ Blocked
       │               │                   ├─ Quarantined
       │               │                   └─ Escalated
       │               │
       │               ├─ Risk score
       │               ├─ Uploader
       │               ├─ Tenant
       │               ├─ Threat class
       │               ├─ Detection stage
       │               ├─ Chunk ID
       │               ├─ Provenance
       │               ├─ Detection evidence
       │               │
       │               ├─ RELEASE
       │               └─ CONFIRM THREAT
       │
       ├─ 4 statistic cards
       ├─ Active Threats
       ├─ Threat Categories
       └─ Security Events

               REPORT
                  │
           Analytics + Graphs
                  │
            Download Report

               LUMO3 CHAT
The key difference from Employee

Employee UI:

“Is my document safe? Can I access this information?”

Security Lead UI:

“What happened? Why was it detected? Who caused it? How severe is it? What should I decide?”

So the Employee portal feels like a secure workspace, while the Security Lead portal feels like a retro cybersecurity investigation console. That distinction will make your three-role architecture much stronger visually and functionally.