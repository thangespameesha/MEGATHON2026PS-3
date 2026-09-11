import { useState } from "react";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text: string;
  scope?: string;
  pipeline?: {
    tokenization: boolean;
    riskAnalysis: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    egressCheck: "PASSED" | "BLOCKED";
    classification: string;
  };
  sources?: string[];
  status?: "AUTHORIZED" | "BLOCKED";
}

interface LumoSecureChatProps {
  role: "employee" | "security" | "mainhead";
  roleTitle: string;
  subTitle: string;
  placeholder: string;
  samplePrompts: string[];
  initialMessageText: string;
  onQuery?: (query: string) => Promise<{
    text: string;
    status: "AUTHORIZED" | "BLOCKED";
    sources?: string[];
    riskAnalysis: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    egressCheck: "PASSED" | "BLOCKED";
    classification: string;
  }>;
  onSimulateQuery?: (query: string) => {
    text: string;
    status: "AUTHORIZED" | "BLOCKED";
    sources?: string[];
    riskAnalysis: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    egressCheck: "PASSED" | "BLOCKED";
    classification: string;
  };
}

export default function LumoSecureChat({
  role,
  roleTitle,
  subTitle,
  placeholder,
  samplePrompts,
  initialMessageText,
  onQuery,
  onSimulateQuery,
}: LumoSecureChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-init",
      sender: "assistant",
      timestamp: "14:20",
      text: initialMessageText,
      scope: role.toUpperCase(),
      pipeline: {
        tokenization: true,
        riskAnalysis: "LOW",
        egressCheck: "PASSED",
        classification: "SYSTEM GREETING",
      },
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  function defaultQueryHandler(q: string) {
    const lower = q.toLowerCase();

    if (role === "employee") {
      const blockedKeys = ["salary", "payroll", "password", "confidential", "ssn", "personnel"];
      if (blockedKeys.some((k) => lower.includes(k))) {
        return {
          text: "LUMO3 cannot provide this information. You do not have permission to access restricted employee financial or credential records. Security classification: BLOCKED.",
          status: "BLOCKED" as const,
          riskAnalysis: "CRITICAL" as const,
          egressCheck: "BLOCKED" as const,
          classification: "UNAUTHORIZED ACCESS ATTEMPT",
        };
      }
      if (lower.includes("leave") || lower.includes("vacation") || lower.includes("policy")) {
        return {
          text: "Based on authorized company policy, employees receive up to 20 days of annual leave per year. Unused leave carries forward up to 5 days into the next calendar cycle. For remote work policies, approval requires 48 hours notice to your tenant lead.",
          status: "AUTHORIZED" as const,
          sources: ["company_policy.pdf", "employee_handbook_2026.docx"],
          riskAnalysis: "LOW" as const,
          egressCheck: "PASSED" as const,
          classification: "AUTHORIZED KNOWLEDGE RETRIEVAL",
        };
      }
      return {
        text: `Query "${q}" processed successfully. Based on your department knowledge base, your workspace documents have been parsed with verified integrity. No anomalies detected.`,
        status: "AUTHORIZED" as const,
        sources: ["authorized_workspace_index.enc"],
        riskAnalysis: "LOW" as const,
        egressCheck: "PASSED" as const,
        classification: "STANDARD KNOWLEDGE QUERY",
      };
    }

    if (role === "security") {
      const forbiddenInLead = ["master key", "root private key", "exfiltrate"];
      if (forbiddenInLead.some((k) => lower.includes(k))) {
        return {
          text: "REQUEST BLOCKED: Access to cryptographic hardware master keys is restricted by enclave policy RFC-0941. SecOps authorization does not grant raw root key extraction.",
          status: "BLOCKED" as const,
          riskAnalysis: "CRITICAL" as const,
          egressCheck: "BLOCKED" as const,
          classification: "ENCLAVE BOUNDARY RESTRICTION",
        };
      }
      if (lower.includes("injection") || lower.includes("threat") || lower.includes("incident")) {
        return {
          text: "SECURITY INCIDENT SUMMARY: 37 prompt injection attempts logged in the last 24 hours. Primary cluster: Engineering tenant (file employee_policy.pdf, chunk CHK-00427). Threat vector: instruction override. Ingestion quarantine remains 100% effective.",
          status: "AUTHORIZED" as const,
          sources: ["threat_log_2026.json", "incident_telemetry_chunk_00427.enc"],
          riskAnalysis: "MEDIUM" as const,
          egressCheck: "PASSED" as const,
          classification: "THREAT FORENSIC AUDIT",
        };
      }
      return {
        text: `Security intelligence retrieved for "${q}". Verification confirms Zero Trust policies are active across all 3 tenant nodes. Review queue currently holds 3 quarantined files awaiting manual disposition.`,
        status: "AUTHORIZED" as const,
        sources: ["soc_telemetry_db.enc", "quarantine_review_index.enc"],
        riskAnalysis: "LOW" as const,
        egressCheck: "PASSED" as const,
        classification: "SECOPS INTELLIGENCE QUERY",
      };
    }

    // Main Head
    if (lower.includes("master key") || lower.includes("raw key")) {
      return {
        text: "REQUEST BLOCKED: Hardware Enclave (AMD SEV-SNP) policy prevents raw cryptographic key export even under Main Head administrative credentials. All enclave operations are Zero-Knowledge.",
        status: "BLOCKED" as const,
        riskAnalysis: "CRITICAL" as const,
        egressCheck: "BLOCKED" as const,
        classification: "POLICY BOUNDARY ENFORCED",
      };
    }
    if (lower.includes("board") || lower.includes("posture") || lower.includes("score")) {
      return {
        text: "EXECUTIVE BOARD SUMMARY: Organization maintains a 94/100 Security Score. Over 1,284 documents ingested with 93.2% clean ingestion rate. 87 quarantined threats isolated with zero cross-tenant bleed. Recommendation: Maintain current strict Zero Trust enclave parameters.",
        status: "AUTHORIZED" as const,
        sources: ["q3_telemetry_report.pdf", "enclave_audit_log_2026.json"],
        riskAnalysis: "LOW" as const,
        egressCheck: "PASSED" as const,
        classification: "EXECUTIVE AUDIT SUMMARY",
      };
    }
    return {
      text: `EXECUTIVE QUERY VERIFIED: Analysis completed for organizational query "${q}". Security boundary checks confirmed. Cross-department metrics verify zero active vulnerabilities. All operational units conform to executive cybersecurity protocol LUMO3-SEC-2026.`,
      status: "AUTHORIZED" as const,
      sources: ["org_security_database.enc", "mainhead_executive_policy.kb"],
      riskAnalysis: "LOW" as const,
      egressCheck: "PASSED" as const,
      classification: "ORGANIZATION WIDE QUERY",
    };
  }

  async function handleSend(textToSend?: string) {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      timestamp: "Just now",
      text: q,
      scope: role.toUpperCase(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      let res;
      if (onQuery) {
        res = await onQuery(q);
      } else if (onSimulateQuery) {
        res = onSimulateQuery(q);
      } else {
        res = defaultQueryHandler(q);
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        timestamp: "Just now",
        text: res.text,
        status: res.status,
        sources: res.sources,
        pipeline: {
          tokenization: true,
          riskAnalysis: res.riskAnalysis,
          egressCheck: res.egressCheck,
          classification: res.classification,
        },
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Query handling error:", err);
      const fallback = defaultQueryHandler(q);
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        timestamp: "Just now",
        text: fallback.text,
        status: fallback.status,
        sources: fallback.sources,
        pipeline: {
          tokenization: true,
          riskAnalysis: fallback.riskAnalysis,
          egressCheck: fallback.egressCheck,
          classification: fallback.classification,
        },
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  const roleSenderLabel = {
    employee: "EMPLOYEE // USER",
    security: "SECURITY LEAD // SECOPS",
    mainhead: "MAIN HEAD // EXECUTIVE",
  }[role];

  return (
    <div className="fade-in flex flex-col gap-6">
      {/* Top Banner / Heading */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            &gt; LUMO3 // SECURE CHAT
          </p>
          <h2 className="font-display text-base font-700 tracking-wider text-white mt-1">
            ◆ {roleTitle}
          </h2>
          <p className="font-mono-custom text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
            {subTitle}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono-custom text-xs"
          style={{ background: "rgba(14, 11, 26, 0.6)", borderColor: "var(--border)" }}
        >
          <span className="w-2 h-2 rounded-full pulse-purple" style={{ background: "#c084fc" }} />
          <span style={{ color: "#a78bfa" }}>ZERO TRUST PIPELINE ACTIVE</span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-col gap-2">
        <span className="font-mono-custom text-[11px] tracking-wider font-600" style={{ color: "var(--text-secondary)" }}>
          SUGGESTED QUERIES
        </span>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="px-3 py-1.5 rounded-lg font-mono-custom text-xs text-left transition-all border"
              style={{
                background: "rgba(18, 11, 34, 0.75)",
                borderColor: "rgba(168, 85, 247, 0.3)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(192, 132, 252, 0.7)";
                (e.currentTarget as HTMLElement).style.background = "rgba(168, 85, 247, 0.18)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(168, 85, 247, 0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(168, 85, 247, 0.3)";
                (e.currentTarget as HTMLElement).style.background = "rgba(18, 11, 34, 0.75)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div className="glass-card p-6 flex flex-col gap-4 min-h-[320px] max-h-[460px] overflow-y-auto" style={{ borderTop: "2px solid #a855f7" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Sender Meta */}
            <div className="flex items-center gap-2 font-mono-custom text-[11px]">
              <span className="font-600" style={{ color: msg.sender === "user" ? "#e879f9" : "#c084fc" }}>
                {msg.sender === "user" ? roleSenderLabel : "LUMO3 ASSISTANT"}
              </span>
              <span style={{ color: "var(--text-dim)" }}>•</span>
              <span style={{ color: "var(--text-dim)" }}>{msg.timestamp}</span>
              {msg.status && (
                <span
                  className="px-2 py-0.5 rounded font-mono-custom text-[10px] font-700 tracking-wider"
                  style={{
                    background: msg.status === "AUTHORIZED" ? "rgba(168, 85, 247, 0.2)" : "rgba(217, 70, 239, 0.2)",
                    border: `1px solid ${msg.status === "AUTHORIZED" ? "rgba(192, 132, 252, 0.5)" : "rgba(217, 70, 239, 0.5)"}`,
                    color: msg.status === "AUTHORIZED" ? "#d8b4fe" : "#f5d0fe",
                    boxShadow: msg.status === "AUTHORIZED" ? "0 0 8px rgba(168, 85, 247, 0.3)" : "0 0 8px rgba(217, 70, 239, 0.3)",
                  }}
                >
                  {msg.status === "AUTHORIZED" ? "✓ AUTHORIZED" : "✕ BLOCKED"}
                </span>
              )}
            </div>

            {/* Bubble */}
            <div
              className="p-4 rounded-xl max-w-xl font-mono-custom text-xs leading-relaxed"
              style={{
                background:
                  msg.sender === "user"
                    ? "linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(192, 38, 211, 0.15))"
                    : msg.status === "BLOCKED"
                    ? "rgba(180, 40, 100, 0.12)"
                    : "rgba(15, 10, 28, 0.9)",
                border:
                  msg.sender === "user"
                    ? "1px solid rgba(192, 132, 252, 0.45)"
                    : msg.status === "BLOCKED"
                    ? "1px solid rgba(217, 70, 239, 0.45)"
                    : "1px solid var(--border)",
                color: "#ffffff",
              }}
            >
              {msg.text}

              {/* Verified Pipeline Badges */}
              {msg.pipeline && (
                <div className="mt-3 pt-2.5 border-t border-[rgba(168,85,247,0.18)] flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded font-600" style={{ background: "rgba(168,85,247,0.18)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.3)" }}>
                    ✓ TOKENIZED
                  </span>
                  <span className="px-2 py-0.5 rounded font-600" style={{ background: "rgba(168,85,247,0.18)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.3)" }}>
                    RISK: {msg.pipeline.riskAnalysis}
                  </span>
                  <span className="px-2 py-0.5 rounded font-600" style={{ background: "rgba(168,85,247,0.18)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.3)" }}>
                    EGRESS: {msg.pipeline.egressCheck}
                  </span>
                  <span className="text-[10px] font-600" style={{ color: "#a78bfa" }}>
                    [{msg.pipeline.classification}]
                  </span>
                </div>
              )}

              {/* Source Documents */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[rgba(168,85,247,0.12)] flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>SOURCE:</span>
                  {msg.sources.map((s) => (
                    <span key={s} className="underline font-600" style={{ color: "#c084fc" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 font-mono-custom text-xs" style={{ color: "#c084fc" }}>
            <span className="w-2 h-2 rounded-full pulse-purple" style={{ background: "#c084fc", boxShadow: "0 0 8px #c084fc" }} />
            <span>Processing query through security pipeline...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="glass-card p-2 flex items-center gap-2" style={{ border: "1px solid rgba(192, 132, 252, 0.35)" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-4 py-3 font-mono-custom text-xs text-white placeholder-gray-400 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl font-mono-custom text-xs font-700 flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #c026d3)",
            color: "white",
            cursor: query.trim() ? "pointer" : "not-allowed",
            boxShadow: query.trim() ? "0 0 16px rgba(192, 38, 211, 0.45)" : "none",
          }}
        >
          <span>SEND</span>
          <span>▶</span>
        </button>
      </div>
    </div>
  );
}
