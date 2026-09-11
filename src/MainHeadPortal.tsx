import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import LumoSecureChat from "./LumoSecureChat";

type NavPage = "overview" | "analytics" | "reports" | "chat" | "settings";
type ReportScope = "employees" | "security" | "all";
type TimeFilter = "today" | "7d" | "30d" | "1y" | "custom";

// ── Shared UI Helper matching Employee and Security Lead ───────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #a78bfa, #6d28d9)" }} />
      <h2 className="font-mono-custom text-xs tracking-widest font-600 uppercase" style={{ color: "var(--text-secondary)" }}>
        {children}
      </h2>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2" style={{ border: "1px solid rgba(139,92,246,0.4)" }}>
      <p className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey || p.name} className="font-mono-custom text-xs font-600" style={{ color: p.color || "#a78bfa" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function DecisionBadge({ d }: { d: string }) {
  const styles: Record<string, { bg: string; border: string; color: string; label: string }> = {
    BLOCKED:     { bg: "rgba(180,40,100,0.1)", border: "rgba(180,40,100,0.3)", color: "#c084fc", label: "✕ BLOCKED" },
    QUARANTINED: { bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.4)", color: "#a78bfa", label: "⚠ QUARANTINED" },
    ESCALATED:   { bg: "rgba(109,40,217,0.15)", border: "rgba(109,40,217,0.4)", color: "#c4b5fd", label: "▲ ESCALATED" },
    ALLOWED:     { bg: "rgba(79,60,120,0.1)", border: "rgba(79,60,120,0.25)", color: "#6b5fa0", label: "✓ ALLOWED" },
  };
  const s = styles[d] ?? styles["ALLOWED"];
  return (
    <span className="font-mono-custom text-xs px-2 py-1 rounded-md whitespace-nowrap" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const overviewThreatActivity = [
  { day: "MON", threats: 12, blocked: 38 },
  { day: "TUE", threats: 19, blocked: 52 },
  { day: "WED", threats: 14, blocked: 44 },
  { day: "THU", threats: 26, blocked: 67 },
  { day: "FRI", threats: 16, blocked: 42 },
];

const docMonthlyTrend = [
  { month: "MAY", uploads: 820, saved: 770 },
  { month: "JUN", uploads: 940, saved: 885 },
  { month: "JUL", uploads: 1050, saved: 980 },
  { month: "AUG", uploads: 1180, saved: 1102 },
  { month: "SEP", uploads: 1284, saved: 1197 },
];

const fileTypeData = [
  { type: "PDF DOCUMENTS", count: 694, pct: 54, color: "#c084fc" },
  { type: "DOCX FILES", count: 308, pct: 24, color: "#a855f7" },
  { type: "CSV DATASETS", count: 154, pct: 12, color: "#8b5cf6" },
  { type: "TXT LOGS", count: 90, pct: 7, color: "#7c3aed" },
  { type: "JSON OBJECTS", count: 38, pct: 3, color: "#6d28d9" },
];

const threatCategories = [
  { name: "PROMPT INJECTION", pct: 42, color: "#c084fc" },
  { name: "DATA POISONING", pct: 26, color: "#a855f7" },
  { name: "AUTHORITY OVERRIDE", pct: 18, color: "#8b5cf6" },
  { name: "DATA EXTRACTION", pct: 9, color: "#7c3aed" },
  { name: "OTHER", pct: 5, color: "#581c87" },
];

const chatQueryTrend = [
  { day: "MON", total: 420, blocked: 34 },
  { day: "TUE", total: 510, blocked: 48 },
  { day: "WED", total: 480, blocked: 41 },
  { day: "THU", total: 620, blocked: 68 },
  { day: "FRI", total: 540, blocked: 52 },
  { day: "SAT", total: 210, blocked: 18 },
];

interface ReportItem {
  id: string;
  role: "EMPLOYEE" | "SECURITY LEAD";
  actor: string;
  department: string;
  action: string;
  target: string;
  risk: number;
  status: "ALLOWED" | "BLOCKED" | "QUARANTINED" | "ESCALATED";
  timestamp: string;
}

const reportDatabase: ReportItem[] = [
  { id: "REP-904", role: "EMPLOYEE", actor: "e.chen@corp.com", department: "Engineering", action: "Upload Document", target: "employee_policy.pdf", risk: 87, status: "QUARANTINED", timestamp: "10 SEP 14:32" },
  { id: "REP-903", role: "EMPLOYEE", actor: "m.patel@corp.com", department: "Procurement", action: "Upload Document", target: "vendor_contract.docx", risk: 91, status: "QUARANTINED", timestamp: "10 SEP 13:14" },
  { id: "REP-902", role: "EMPLOYEE", actor: "s.williams@corp.com", department: "Finance", action: "LUMO3 Query", target: "Unmasked Q3 EBITDA & Salary Sheet", risk: 89, status: "BLOCKED", timestamp: "10 SEP 12:45" },
  { id: "REP-901", role: "SECURITY LEAD", actor: "sec.lead.1@corp.com", department: "SecOps", action: "Confirm Threat", target: "Threat #L3-013 (Data Poisoning)", risk: 91, status: "BLOCKED", timestamp: "10 SEP 11:20" },
  { id: "REP-900", role: "SECURITY LEAD", actor: "sec.lead.2@corp.com", department: "SecOps", action: "Release Document", target: "notes_draft.txt (Cleared Safe)", risk: 18, status: "ALLOWED", timestamp: "10 SEP 10:15" },
  { id: "REP-899", role: "EMPLOYEE", actor: "k.tanaka@corp.com", department: "Design", action: "Upload Document", target: "brand_guidelines_2026.pdf", risk: 14, status: "ALLOWED", timestamp: "10 SEP 09:40" },
  { id: "REP-898", role: "SECURITY LEAD", actor: "sec.lead.1@corp.com", department: "SecOps", action: "Investigation", target: "Cross-Tenant Vector CHK-00427", risk: 84, status: "ESCALATED", timestamp: "09 SEP 18:22" },
  { id: "REP-897", role: "EMPLOYEE", actor: "j.morales@corp.com", department: "Legal", action: "LUMO3 Query", target: "Contract Compliance Guidelines", risk: 8, status: "ALLOWED", timestamp: "09 SEP 17:15" },
  { id: "REP-896", role: "EMPLOYEE", actor: "r.kim@corp.com", department: "HR", action: "Upload Document", target: "org_restructure_draft.docx", risk: 78, status: "QUARANTINED", timestamp: "09 SEP 16:50" },
  { id: "REP-895", role: "SECURITY LEAD", actor: "sec.lead.2@corp.com", department: "SecOps", action: "Security Quarantine", target: "Document Ingestion Block #L3-014", risk: 82, status: "QUARANTINED", timestamp: "09 SEP 15:30" },
];

// ── 1. Overview Page ──────────────────────────────────────────────────────────

function OverviewPage({ onNavigate }: { onNavigate: (page: NavPage) => void }) {
  return (
    <div className="fade-in flex flex-col gap-8">
      {/* 1. Security Metric Boxes (Row 1, Row 2, Row 3) */}
      <div className="flex flex-col gap-4">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ borderTop: "2px solid #a855f7" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-custom text-xs tracking-widest font-600" style={{ color: "var(--text-secondary)" }}>
                TOTAL DOCUMENTS
              </span>
              <span className="font-mono-custom text-[10px] px-2 py-0.5 rounded font-600" style={{ background: "rgba(168, 85, 247, 0.18)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.3)" }}>
                +14% MONTHLY
              </span>
            </div>
            <div className="my-3">
              <p className="font-display text-4xl sm:text-5xl font-800 tracking-tight text-white glow-text-purple">
                1,284
              </p>
              <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--text-muted)" }}>Employee uploads</p>
            </div>
            <div className="pt-3 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono-custom" style={{ color: "var(--text-dim)" }}>
              <span>Stream: ACTIVE</span>
              <span style={{ color: "#c084fc" }}>100% PARSED</span>
            </div>
          </div>

          <div
            className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ borderTop: "2px solid #c084fc" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-custom text-xs tracking-widest font-600" style={{ color: "var(--text-secondary)" }}>
                SAVED DOCUMENTS
              </span>
              <span className="font-mono-custom text-[10px] px-2 py-0.5 rounded font-600" style={{ background: "rgba(192, 132, 252, 0.18)", color: "#f0eafa", border: "1px solid rgba(192,132,252,0.3)" }}>
                93.2% INGESTED
              </span>
            </div>
            <div className="my-3">
              <p className="font-display text-4xl sm:text-5xl font-800 tracking-tight text-white glow-text-purple">
                1,197
              </p>
              <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--text-muted)" }}>Secure database</p>
            </div>
            <div className="pt-3 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono-custom" style={{ color: "var(--text-dim)" }}>
              <span>Encrypted vault</span>
              <span style={{ color: "#d8b4fe" }}>AES-256-GCM</span>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ borderTop: "2px solid #e879f9" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-custom text-xs tracking-widest font-600" style={{ color: "#f472b6" }}>
                THREATS DETECTED
              </span>
              <span className="font-mono-custom text-[10px] px-2 py-0.5 rounded font-600" style={{ background: "rgba(217, 70, 239, 0.2)", color: "#f5d0fe", border: "1px solid rgba(217,70,239,0.4)" }}>
                ISOLATED
              </span>
            </div>
            <div className="my-3">
              <p className="font-display text-4xl sm:text-5xl font-800 tracking-tight text-white glow-text-magenta">
                87
              </p>
              <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--text-muted)" }}>Quarantined docs</p>
            </div>
            <div className="pt-3 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono-custom" style={{ color: "var(--text-dim)" }}>
              <span>Containment</span>
              <span style={{ color: "#e879f9" }}>100% CONTAINED</span>
            </div>
          </div>

          <div
            className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ borderTop: "2px solid #8b5cf6" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-custom text-xs tracking-widest font-600" style={{ color: "var(--text-secondary)" }}>
                BLOCKED REQUESTS
              </span>
              <span className="font-mono-custom text-[10px] px-2 py-0.5 rounded font-600" style={{ background: "rgba(139, 92, 246, 0.18)", color: "#ddd6fe", border: "1px solid rgba(139,92,246,0.3)" }}>
                ENFORCED
              </span>
            </div>
            <div className="my-3">
              <p className="font-display text-4xl sm:text-5xl font-800 tracking-tight text-white glow-text-purple">
                243
              </p>
              <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--text-muted)" }}>All user roles</p>
            </div>
            <div className="pt-3 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono-custom" style={{ color: "var(--text-dim)" }}>
              <span>Zero Trust Policy</span>
              <span style={{ color: "#c084fc" }}>ACTIVE GATEWAY</span>
            </div>
          </div>
        </div>

        {/* Row 3: Security Score (Central HUD component with eye-catching glow) */}
        <div
          className="glass-card p-7 flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{
            borderTop: "2px solid #c084fc",
            background: "linear-gradient(180deg, rgba(24, 15, 45, 0.94), rgba(15, 10, 30, 0.96))",
          }}
        >
          <span className="font-mono-custom text-xs tracking-widest font-700 uppercase" style={{ color: "#d8b4fe" }}>
            ORGANIZATIONAL SECURITY SCORE
          </span>

          <div className="my-3 flex items-baseline gap-2">
            <span
              className="font-display text-5xl sm:text-6xl font-900 tracking-tight text-white glow-text-purple"
            >
              94
            </span>
            <span className="font-display text-2xl font-600" style={{ color: "var(--text-muted)" }}>
              / 100
            </span>
          </div>

          {/* Segmented bar with glowing segments */}
          <div className="w-full max-w-lg flex items-center justify-between gap-1.5 my-3">
            {Array.from({ length: 20 }).map((_, idx) => {
              const isLit = idx < 19;
              return (
                <div
                  key={idx}
                  className="h-3.5 flex-1 rounded-sm transition-all duration-300"
                  style={{
                    background: isLit
                      ? "linear-gradient(180deg, #e879f9, #7c3aed)"
                      : "rgba(139, 92, 246, 0.12)",
                    boxShadow: isLit ? "0 0 10px rgba(217, 70, 239, 0.65)" : "none",
                    border: isLit ? "none" : "1px solid rgba(139, 92, 246, 0.15)",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                background: "rgba(168, 85, 247, 0.22)",
                border: "1px solid rgba(216, 180, 254, 0.5)",
                boxShadow: "0 0 16px rgba(168, 85, 247, 0.35)",
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full pulse-purple" style={{ background: "#c084fc", boxShadow: "0 0 8px #c084fc" }} />
              <span className="font-mono-custom text-xs font-700 tracking-widest text-white">
                ● SYSTEM SECURE
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono-custom" style={{ color: "var(--text-muted)" }}>
              <span>Zero active breaches</span>
              <span>•</span>
              <span>99.8% Policy compliance</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RISK DISTRIBUTION (Visual chart + Bars with glowing details) */}
      <div className="glass-card p-6" style={{ borderTop: "2px solid #a855f7" }}>
        <SectionHeading>Risk Distribution</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Visual Donut Chart */}
          <div className="relative flex items-center justify-center py-2">
            <div className="w-52 h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e879f9" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: "Risk Profile", value: 62 },
                      { name: "Buffer Margin", value: 38 },
                    ]}
                    innerRadius={62}
                    outerRadius={82}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="url(#riskGrad)" />
                    <Cell fill="rgba(139, 92, 246, 0.12)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="font-mono-custom text-[11px] tracking-widest font-600" style={{ color: "var(--text-secondary)" }}>
                  RISK PROFILE
                </span>
                <span className="font-display text-4xl font-800 text-white my-0.5 glow-text-purple">
                  62%
                </span>
                <span className="font-mono-custom text-[10px] tracking-wider" style={{ color: "#c084fc" }}>
                  OPERATIONAL BUFFER
                </span>
              </div>
            </div>
          </div>

          {/* Risk Level Bars */}
          <div className="flex flex-col gap-4">
            {[
              { label: "CRITICAL", count: 12, pct: "12%", color: "#e879f9" },
              { label: "HIGH", count: 27, pct: "27%", color: "#c084fc" },
              { label: "MEDIUM", count: 41, pct: "41%", color: "#8b5cf6" },
              { label: "LOW", count: 18, pct: "18%", color: "#6d28d9" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="font-mono-custom text-xs w-20 tracking-wider font-700" style={{ color: item.color }}>
                  {item.label}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-[rgba(139,92,246,0.12)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: item.pct,
                      background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                      boxShadow: `0 0 10px ${item.color}66`,
                    }}
                  />
                </div>
                <span className="font-mono-custom text-xs w-8 text-right font-bold text-white">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SECURITY ANALYTICS PREVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Activity Line/Area Graph */}
        <div className="glass-card p-6 flex flex-col justify-between" style={{ borderTop: "2px solid #c084fc" }}>
          <SectionHeading>Security Activity</SectionHeading>
          <p className="font-mono-custom text-[11px] -mt-3 mb-3" style={{ color: "var(--text-muted)" }}>
            Threats over time (Mon – Fri)
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overviewThreatActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mainThreatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#4a3d6b" tick={{ fill: "#a78bfa", fontSize: 11 }} tickLine={false} />
                <YAxis stroke="#4a3d6b" tick={{ fill: "#a78bfa", fontSize: 11 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="threats" name="Threats" stroke="#c084fc" strokeWidth={2.5} fill="url(#mainThreatGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Decisions Preview */}
        <div className="glass-card p-6 flex flex-col justify-between" style={{ borderTop: "2px solid #8b5cf6" }}>
          <SectionHeading>System Decisions</SectionHeading>
          <p className="font-mono-custom text-[11px] -mt-3 mb-3" style={{ color: "var(--text-muted)" }}>
            Automated gatekeeper actions
          </p>

          <div className="flex flex-col gap-3.5 my-1">
            {[
              { label: "ALLOWED", count: 1420, bar: "80%", color: "#c4b5fd" },
              { label: "BLOCKED", count: 243, bar: "35%", color: "#e879f9" },
              { label: "QUARANTINED", count: 87, bar: "20%", color: "#c084fc" },
              { label: "ESCALATED", count: 32, bar: "10%", color: "#8b5cf6" },
            ].map((d) => (
              <div key={d.label} className="flex flex-col gap-1 font-mono-custom text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-600" style={{ color: d.color }}>{d.label}</span>
                  <span className="text-white font-bold">{d.count}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-[rgba(139,92,246,0.12)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: d.bar,
                      background: `linear-gradient(90deg, ${d.color}88, ${d.color})`,
                      boxShadow: `0 0 8px ${d.color}66`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[rgba(168,85,247,0.15)] flex items-center justify-between text-xs font-mono-custom" style={{ color: "var(--text-dim)" }}>
            <span>Total: 1,782</span>
            <button onClick={() => onNavigate("analytics")} className="text-[#c084fc] font-600 hover:underline">
              FULL ANALYTICS →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Analytics Page ─────────────────────────────────────────────────────────

function AnalyticsPage() {
  const [subTab, setSubTab] = useState<"DOCS" | "THREATS" | "USERS" | "PERF">("DOCS");

  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
          LUMO3 // DEEP SECURITY INTELLIGENCE
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: "DOCS", label: "DOCUMENTS" },
            { id: "THREATS", label: "THREATS" },
            { id: "USERS", label: "USERS" },
            { id: "PERF", label: "PERFORMANCE" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className="px-3 py-1 rounded-lg font-mono-custom text-xs transition-all"
              style={{
                color: subTab === t.id ? "#c084fc" : "var(--text-dim)",
                background: subTab === t.id ? "rgba(192,38,211,0.08)" : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Analytics */}
      {subTab === "DOCS" && (
        <div className="flex flex-col gap-6 fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "TOTAL DOCUMENTS", val: "1,284" },
              { label: "EMPLOYEE UPLOADS", val: "1,041" },
              { label: "SAVED DOCUMENTS", val: "1,197" },
              { label: "UNDER REVIEW", val: "18" },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4">
                <p className="font-mono-custom text-[11px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="font-display text-2xl font-700 text-white mt-1">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <SectionHeading>Document Ingestion Trajectory</SectionHeading>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={docMonthlyTrend}>
                  <defs>
                    <linearGradient id="docArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#4a3d6b" tick={{ fill: "#6b5fa0", fontSize: 11 }} tickLine={false} />
                  <YAxis stroke="#4a3d6b" tick={{ fill: "#6b5fa0", fontSize: 11 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="uploads" name="Uploads" stroke="#8b5cf6" strokeWidth={2} fill="url(#docArea)" />
                  <Area type="monotone" dataKey="saved" name="Saved" stroke="#a78bfa" strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <SectionHeading>Ingested File Formats</SectionHeading>
            <div className="flex flex-col gap-3">
              {fileTypeData.map((f) => (
                <div key={f.type} className="flex flex-col gap-1 font-mono-custom text-xs">
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-primary)" }}>{f.type}</span>
                    <span style={{ color: f.color }}>{f.count} ({f.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-[rgba(139,92,246,0.1)]">
                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Threat Analytics */}
      {subTab === "THREATS" && (
        <div className="flex flex-col gap-6 fade-in">
          <div className="glass-card p-6">
            <SectionHeading>Threat Categories</SectionHeading>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-48 h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={threatCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="pct">
                      {threatCategories.map((e, idx) => (
                        <Cell key={`cell-${idx}`} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2 font-mono-custom text-xs w-full">
                {threatCategories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(139,92,246,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    </div>
                    <span className="font-600" style={{ color: c.color }}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Activity */}
      {subTab === "USERS" && (
        <div className="flex flex-col gap-6 fade-in">
          <div className="glass-card p-6">
            <SectionHeading>LUMO3 Chat Query Activity</SectionHeading>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chatQueryTrend}>
                  <XAxis dataKey="day" stroke="#4a3d6b" tick={{ fill: "#6b5fa0", fontSize: 11 }} tickLine={false} />
                  <YAxis stroke="#4a3d6b" tick={{ fill: "#6b5fa0", fontSize: 11 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Queries" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="blocked" name="Blocked Requests" fill="#c084fc" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Security Performance */}
      {subTab === "PERF" && (
        <div className="flex flex-col gap-6 fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "SECURITY SCORE", val: "94 / 100", sub: "EXECUTIVE SAFE" },
              { label: "THREAT DETECTION RATE", val: "98.4%", sub: "ML INFERENCE" },
              { label: "BLOCK RATE", val: "14.6%", sub: "POLICY CONFORMANCE" },
              { label: "SAFE INTERACTIONS", val: "89.2%", sub: "AUTHORIZED WORKSPACES" },
            ].map((p) => (
              <div key={p.label} className="glass-card p-5">
                <span className="font-mono-custom text-[10px] tracking-wider" style={{ color: "var(--text-muted)" }}>{p.label}</span>
                <p className="font-display text-2xl font-700 text-white my-1">{p.val}</p>
                <p className="font-mono-custom text-[10px]" style={{ color: "#a78bfa" }}>{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Reports Page ──────────────────────────────────────────────────────────

function ReportsPage() {
  const [scope, setScope] = useState<ReportScope>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [downloadMsg, setDownloadMsg] = useState(false);

  const filteredItems = reportDatabase.filter((item) => {
    if (scope === "employees" && item.role !== "EMPLOYEE") return false;
    if (scope === "security" && item.role !== "SECURITY LEAD") return false;
    return true;
  });

  const handleDownload = () => {
    const csv = [
      ["ID", "Role", "Actor", "Department", "Action", "Target", "Risk", "Status", "Timestamp"].join(","),
      ...filteredItems.map((r) => [r.id, r.role, r.actor, r.department, `"${r.action}"`, `"${r.target}"`, r.risk, r.status, r.timestamp].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LUMO3_Organization_Report_${scope}_${timeFilter}.csv`;
    link.click();

    setDownloadMsg(true);
    setTimeout(() => setDownloadMsg(false), 3000);
  };

  return (
    <div className="fade-in flex flex-col gap-6">
      {downloadMsg && (
        <div className="glass-card p-3 font-mono-custom text-xs text-center fade-in" style={{ border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa" }}>
          ✓ Report exported to CSV. Encrypted session logged.
        </div>
      )}

      <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
        LUMO3 // ORGANIZATION REPORT
      </div>

      {/* Filter Row 1: Scope */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "employees", label: "EMPLOYEES" },
          { id: "security", label: "SECURITY LEADS" },
          { id: "all", label: "ALL ACTIVITY" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScope(tab.id as any)}
            className="px-4 py-2 font-mono-custom text-xs tracking-wider rounded-lg transition-all"
            style={{
              color: scope === tab.id ? "#c084fc" : "var(--text-dim)",
              background: scope === tab.id ? "rgba(192,38,211,0.08)" : "transparent",
              border: scope === tab.id ? "1px solid rgba(192,38,211,0.25)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Row 2: Time */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: "today", label: "TODAY" },
            { id: "7d", label: "7 DAYS" },
            { id: "30d", label: "30 DAYS" },
            { id: "1y", label: "1 YEAR" },
            { id: "custom", label: "CUSTOM" },
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeFilter(tf.id as any)}
              className="px-3 py-1 rounded-md font-mono-custom text-xs transition-all"
              style={{
                color: timeFilter === tf.id ? "#f0eafa" : "var(--text-dim)",
                background: timeFilter === tf.id ? "rgba(139,92,246,0.15)" : "transparent",
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded-lg font-mono-custom text-xs tracking-wider transition-all"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
        >
          ↓ DOWNLOAD REPORT
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-custom text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(14,11,26,0.6)" }}>
                <th className="py-3 px-4 text-gray-400 font-600">ID</th>
                <th className="py-3 px-4 text-gray-400 font-600">ROLE</th>
                <th className="py-3 px-4 text-gray-400 font-600">ACTOR</th>
                <th className="py-3 px-4 text-gray-400 font-600">ACTION</th>
                <th className="py-3 px-4 text-gray-400 font-600">TARGET</th>
                <th className="py-3 px-4 text-gray-400 font-600">DECISION</th>
                <th className="py-3 px-4 text-gray-400 font-600 text-right">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(139,92,246,0.1)]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[rgba(139,92,246,0.04)] transition-colors">
                  <td className="py-3 px-4 text-white font-600">{item.id}</td>
                  <td className="py-3 px-4 text-[11px]" style={{ color: "#a78bfa" }}>{item.role}</td>
                  <td className="py-3 px-4" style={{ color: "var(--text-muted)" }}>{item.actor}</td>
                  <td className="py-3 px-4 text-white">{item.action}</td>
                  <td className="py-3 px-4 max-w-xs truncate" style={{ color: "var(--text-muted)" }}>{item.target}</td>
                  <td className="py-3 px-4">
                    <DecisionBadge d={item.status} />
                  </td>
                  <td className="py-3 px-4 text-right" style={{ color: "var(--text-dim)" }}>{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 4. Settings Page ─────────────────────────────────────────────────────────

function SettingsPage() {
  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
        ◆ SETTINGS
      </div>

      {/* DATA */}
      <div className="glass-card p-6">
        <SectionHeading>Data</SectionHeading>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Organization / account data
        </p>
        <div className="flex flex-col gap-3 font-mono-custom text-xs">
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>ORGANIZATION</span>
            <span className="text-white">LUMOS CYBERDEFENSE CORP</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>ORG ID</span>
            <span style={{ color: "#a78bfa" }}>L3-ORG-99201-GLOBAL</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>STORAGE ENCRYPTION</span>
            <span className="text-white">AES-256-GCM / Post-Quantum Kyber-1024</span>
          </div>
          <div className="flex justify-between py-2">
            <span style={{ color: "var(--text-dim)" }}>DATA RETENTION</span>
            <span className="text-white">365 Days (Enforced)</span>
          </div>
        </div>
      </div>

      {/* LICENSE */}
      <div className="glass-card p-6">
        <SectionHeading>License</SectionHeading>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          LUMO3 license information
        </p>
        <div className="flex flex-col gap-3 font-mono-custom text-xs">
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>PLAN</span>
            <span style={{ color: "#c084fc" }}>LUMO3 ENTERPRISE SUPREME</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>LICENSE KEY</span>
            <span className="text-white">L3-ENT-9948-X771-V402-AUTH</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
            <span style={{ color: "var(--text-dim)" }}>HARDWARE ENCLAVE</span>
            <span className="text-white">AMD SEV-SNP Confidential Computing Active</span>
          </div>
          <div className="flex justify-between py-2">
            <span style={{ color: "var(--text-dim)" }}>EXPIRATION</span>
            <span className="text-white">31 DEC 2028</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shell / Main Head Portal Export ──────────────────────────────────────────

const MAIN_NAV: { id: NavPage; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "analytics", label: "ANALYTICS" },
  { id: "reports", label: "REPORTS" },
  { id: "chat", label: "LUMO3 CHAT" },
  { id: "settings", label: "SETTINGS" },
];

export default function MainHeadPortal({ onSwitch }: { onSwitch: () => void; onRoleSelect?: any }) {
  const [page, setPage] = useState<NavPage>("overview");

  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Background ambient glow matching Employee & Security Lead */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 500,
          background: "radial-gradient(ellipse at center, rgba(180,40,217,0.1) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* Consistent Navigation Bar */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 py-4 flex-wrap gap-3"
        style={{
          background: "rgba(14,11,26,0.95)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #c026d3)",
              boxShadow: "0 0 16px rgba(192,38,211,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.2" fill="none" />
              <path d="M7 4v6M4.5 5.5l5 3M4.5 8.5l5-3" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="font-display text-sm font-700 tracking-widest text-white">LUMO3</span>
            <span className="font-mono-custom text-xs ml-2" style={{ color: "#c084fc" }}>
              // MAIN HEAD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {MAIN_NAV.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="relative px-3.5 sm:px-4 py-2 font-mono-custom text-xs tracking-widest rounded-lg transition-all duration-200"
                style={{
                  color: active ? "#ffffff" : "var(--text-muted)",
                  background: active ? "rgba(168, 85, 247, 0.22)" : "transparent",
                  border: active ? "1px solid rgba(192, 132, 252, 0.45)" : "1px solid transparent",
                  boxShadow: active ? "0 0 14px rgba(168, 85, 247, 0.25)" : "none",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pulse-purple" style={{ background: "#c084fc" }} />
            <span className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>
              MAIN HEAD
            </span>
          </div>
          <button
            onClick={onSwitch}
            className="px-3 py-1.5 rounded-lg font-mono-custom text-xs tracking-wider transition-all duration-200 hover:border-purple-400 hover:text-purple-200"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            LOG OUT
          </button>
        </div>
      </nav>

      {/* Main Content Area: exact same max-w-4xl mx-auto w-full as Employee and Security Lead */}
      <main className="relative z-10 flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {page === "overview" && <OverviewPage onNavigate={setPage} />}
        {page === "analytics" && <AnalyticsPage />}
        {page === "reports" && <ReportsPage />}
        {page === "chat" && (
          <LumoSecureChat
            role="mainhead"
            roleTitle="LUMO3 ASSISTANT // EXECUTIVE"
            subTitle="Ask about authorized organizational data..."
            placeholder="Enter organizational query..."
            samplePrompts={[
              "Generate organization security posture summary for Board of Directors",
              "Audit cross-department prompt injection attempts this week",
              "Show quarantined financial document breakdown",
              "Attempt raw cryptographic master key extraction (Test Policy Block)",
            ]}
            initialMessageText="Greetings, Main Head. Executive clearance granted with organization-wide visibility across all corporate clusters. Ready to assist with strategic threat analysis, policy auditing, or cross-department intelligence."
          />
        )}
        {page === "settings" && <SettingsPage />}
      </main>

      {/* Consistent Footer */}
      <footer className="relative z-10 text-center py-4" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="font-mono-custom text-xs" style={{ color: "var(--text-dim)" }}>
          LUMO3 EXECUTIVE COMMAND — CLASSIFIED & ENCRYPTED
        </span>
      </footer>
    </div>
  );
}
