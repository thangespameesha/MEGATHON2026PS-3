import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import LumoSecureChat from "./LumoSecureChat";

type SecPage = "overview" | "review" | "log" | "report" | "chat";
type LogFilter = "ALL" | "ALLOWED" | "BLOCKED" | "QUARANTINED" | "ESCALATED";
type ReportPeriod = "24H" | "7D" | "30D";

// ── Data ──────────────────────────────────────────────────────────────────────

const threats = [
  { id: "L3-014", doc: "employee_report.pdf", uploader: "e.chen@corp.com", risk: 82, class: "DATA POISONING", status: "UNDER INVESTIGATION" },
  { id: "L3-013", doc: "vendor_contract.docx", uploader: "m.patel@corp.com", risk: 91, class: "PROMPT INJECTION", status: "UNDER INVESTIGATION" },
  { id: "L3-011", doc: "q3_financials.csv", uploader: "j.lee@corp.com", risk: 67, class: "DATA EXTRACTION", status: "ESCALATED" },
];

const reviewQueue = [
  {
    doc: "employee_policy.pdf", risk: 87, uploader: "e.chen@corp.com", tenant: "Engineering",
    uploaded: "10 SEP 2026 • 14:32", threatClass: "PROMPT INJECTION", stage: "INGESTION",
    status: "UNDER REVIEW", chunkId: "CHK-00427", provenance: "EMPLOYEE PORTAL",
    evidence: ["Instruction override detected", "Authority escalation attempt", "Data extraction pattern"],
  },
  {
    doc: "vendor_contract.docx", risk: 91, uploader: "m.patel@corp.com", tenant: "Procurement",
    uploaded: "10 SEP 2026 • 13:14", threatClass: "DATA POISONING", stage: "INGESTION",
    status: "UNDER REVIEW", chunkId: "CHK-00389", provenance: "EMPLOYEE PORTAL",
    evidence: ["Malicious instruction embedded", "Training data contamination pattern"],
  },
  {
    doc: "notes_draft.txt", risk: 74, uploader: "r.kim@corp.com", tenant: "HR",
    uploaded: "09 SEP 2026 • 18:42", threatClass: "AUTHORITY OVERRIDE", stage: "INGESTION",
    status: "UNDER REVIEW", chunkId: "CHK-00341", provenance: "EMPLOYEE PORTAL",
    evidence: ["Role escalation attempt", "System prompt injection"],
  },
];

const securityEvents = [
  { time: "14:42:17", type: "PROMPT INJECTION", severity: "HIGH", decision: "BLOCKED" },
  { time: "14:39:02", type: "DATA POISONING", severity: "CRITICAL", decision: "QUARANTINED" },
  { time: "14:31:44", type: "AUTHORITY OVERRIDE", severity: "MEDIUM", decision: "BLOCKED" },
  { time: "14:28:10", type: "NORMAL REQUEST", severity: "LOW", decision: "ALLOWED" },
  { time: "14:21:53", type: "DATA EXTRACTION", severity: "HIGH", decision: "ESCALATED" },
  { time: "14:15:07", type: "NORMAL REQUEST", severity: "LOW", decision: "ALLOWED" },
];

const threatCategories = [
  { name: "PROMPT INJECTION", pct: 42, color: "#8b5cf6" },
  { name: "DATA POISONING", pct: 26, color: "#7c3aed" },
  { name: "AUTHORITY OVERRIDE", pct: 18, color: "#6d28d9" },
  { name: "DATA EXTRACTION", pct: 9, color: "#5b21b6" },
  { name: "OTHER", pct: 5, color: "#4c1d95" },
];

const logData = [
  { time: "14:42:17", user: "E042", type: "INJECTION", risk: 92, decision: "BLOCKED" },
  { time: "14:39:02", user: "E017", type: "UPLOAD", risk: 87, decision: "QUARANTINED" },
  { time: "14:31:44", user: "E021", type: "QUERY", risk: 76, decision: "BLOCKED" },
  { time: "14:28:10", user: "E031", type: "UPLOAD", risk: 12, decision: "ALLOWED" },
  { time: "14:21:53", user: "E008", type: "QUERY", risk: 81, decision: "ESCALATED" },
  { time: "14:15:07", user: "E044", type: "UPLOAD", risk: 8, decision: "ALLOWED" },
  { time: "14:09:22", user: "E012", type: "INJECTION", risk: 95, decision: "BLOCKED" },
  { time: "14:02:44", user: "E027", type: "QUERY", risk: 14, decision: "ALLOWED" },
];

const activityTrend = [
  { day: "MON", threats: 4, blocked: 12, allowed: 38 },
  { day: "TUE", threats: 7, blocked: 18, allowed: 42 },
  { day: "WED", threats: 5, blocked: 14, allowed: 51 },
  { day: "THU", threats: 11, blocked: 24, allowed: 47 },
  { day: "FRI", threats: 8, blocked: 19, allowed: 55 },
  { day: "SAT", threats: 2, blocked: 7, allowed: 28 },
];

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #a78bfa, #6d28d9)" }} />
      <h2 className="font-mono-custom text-xs tracking-widest font-600 uppercase" style={{ color: "var(--text-secondary)" }}>{children}</h2>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2" style={{ border: "1px solid rgba(139,92,246,0.4)" }}>
      <p className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono-custom text-xs font-600" style={{ color: p.color || "#a78bfa" }}>{p.name}: {p.value}</p>
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
    <span className="font-mono-custom text-xs px-2 py-1 rounded-md whitespace-nowrap" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{s.label}</span>
  );
}

function SeverityDot({ s }: { s: string }) {
  const colors: Record<string, string> = { CRITICAL: "#c084fc", HIGH: "#a78bfa", MEDIUM: "#7c3aed", LOW: "#4c1d95" };
  return <span className="font-mono-custom text-xs" style={{ color: colors[s] ?? "#6b5fa0" }}>{s}</span>;
}

function RiskBar({ value }: { value: number }) {
  const color = value >= 80 ? "#c084fc" : value >= 60 ? "#a78bfa" : "#6b5fa0";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
      <span className="font-mono-custom text-xs w-10 text-right" style={{ color }}>{value}/100</span>
    </div>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────────

function OverviewPage() {
  return (
    <div className="fade-in flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "ACTIVE THREATS", value: "12", sub: "Awaiting investigation" },
          { label: "QUARANTINED", value: "8", sub: "Confirmed threats" },
          { label: "BLOCKED REQUESTS", value: "37", sub: "LUMO3 security blocks" },
          { label: "THREAT DETECTION RATE", value: "94.7%", sub: "Current detection rate" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-6 flex flex-col gap-3">
            <p className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="font-display text-4xl font-700" style={{ background: "linear-gradient(135deg, #e0d7ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active Threats */}
      <div className="glass-card p-6">
        <SectionHeading>Active Threats</SectionHeading>
        <div className="flex flex-col gap-3">
          {threats.map((t) => (
            <div key={t.id} className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-mono-custom text-xs font-600" style={{ color: "#c084fc" }}>⚠ THREAT #{t.id}</p>
                  <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {t.doc} &nbsp;·&nbsp; <span style={{ color: "var(--text-dim)" }}>{t.uploader}</span>
                  </p>
                </div>
                <span className="font-mono-custom text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(180,40,100,0.1)", border: "1px solid rgba(180,40,100,0.25)", color: "#c084fc" }}>{t.class}</span>
              </div>
              <RiskBar value={t.risk} />
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs" style={{ color: "var(--text-dim)" }}>{t.status}</span>
                <button className="font-mono-custom text-xs px-3 py-1.5 rounded-lg transition-all duration-200" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
                  REVIEW →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Categories */}
      <div className="glass-card p-6">
        <SectionHeading>Threat Categories</SectionHeading>
        <div className="flex flex-col gap-3">
          {threatCategories.map((tc) => (
            <div key={tc.name} className="flex items-center gap-3">
              <span className="font-mono-custom text-xs w-40 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{tc.name}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${tc.pct}%`, background: tc.color }} />
              </div>
              <span className="font-mono-custom text-xs w-8 text-right" style={{ color: "var(--text-dim)" }}>{tc.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Events */}
      <div className="glass-card p-6">
        <SectionHeading>Security Events</SectionHeading>
        <div className="flex flex-col">
          {securityEvents.map((ev, i) => (
            <div key={i} className="flex items-center gap-4 py-3 flex-wrap" style={{ borderBottom: i < securityEvents.length - 1 ? "1px solid rgba(139,92,246,0.06)" : "none" }}>
              <span className="font-mono-custom text-xs w-20 flex-shrink-0" style={{ color: "var(--text-dim)" }}>{ev.time}</span>
              <span className="font-mono-custom text-xs flex-1" style={{ color: "var(--text-muted)" }}>{ev.type}</span>
              <SeverityDot s={ev.severity} />
              <DecisionBadge d={ev.decision} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPage() {
  const [decisions, setDecisions] = useState<Record<number, "released" | "confirmed">>({});
  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>LUMO3 // THREAT REVIEW</div>
      {reviewQueue.map((item, idx) => {
        const decided = decisions[idx];
        return (
          <div key={idx} className="glass-card overflow-hidden fade-in" style={{ border: decided === "confirmed" ? "1px solid rgba(180,40,100,0.4)" : decided === "released" ? "1px solid rgba(139,92,246,0.4)" : "1px solid var(--border)" }}>
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "rgba(139,92,246,0.03)" }}>
              <p className="font-mono-custom text-xs font-600" style={{ color: "var(--text-primary)" }}>DOCUMENT: {item.doc}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: item.risk >= 80 ? "#c084fc" : "#a78bfa" }} />
                <span className="font-display text-sm font-700" style={{ color: item.risk >= 80 ? "#c084fc" : "#a78bfa" }}>
                  {item.risk} / 100
                </span>
              </div>
            </div>

            {/* Meta grid */}
            <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
              {[
                ["Uploaded By", item.uploader],
                ["Tenant", item.tenant],
                ["Uploaded", item.uploaded],
                ["Threat Class", item.threatClass],
                ["Detection Stage", item.stage],
                ["Threat Status", item.status],
                ["Chunk ID", item.chunkId],
                ["Provenance", item.provenance],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono-custom text-xs mb-0.5" style={{ color: "var(--text-dim)" }}>{k}</p>
                  <p className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Evidence */}
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="font-mono-custom text-xs tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>DETECTION EVIDENCE</p>
              <div className="flex flex-col gap-2">
                {item.evidence.map((e) => (
                  <p key={e} className="font-mono-custom text-xs" style={{ color: "#c084fc" }}>⚠ {e}</p>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-5">
              {decided ? (
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono-custom text-xs tracking-wider`}
                    style={decided === "released"
                      ? { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }
                      : { background: "rgba(180,40,100,0.1)", border: "1px solid rgba(180,40,100,0.3)", color: "#c084fc" }}>
                    {decided === "released" ? "✓ DOCUMENT RELEASED" : "✕ THREAT CONFIRMED"}
                  </div>
                  <button onClick={() => setDecisions((d) => { const n = { ...d }; delete n[idx]; return n; })}
                    className="font-mono-custom text-xs" style={{ color: "var(--text-dim)" }}>undo</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-mono-custom text-xs tracking-widest w-full mb-1" style={{ color: "var(--text-dim)" }}>REVIEW ACTION</p>
                  <button onClick={() => setDecisions((d) => ({ ...d, [idx]: "released" }))}
                    className="flex-1 py-2.5 rounded-xl font-mono-custom text-xs tracking-wider transition-all duration-200"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
                    ✓ RELEASE DOCUMENT
                  </button>
                  <button onClick={() => setDecisions((d) => ({ ...d, [idx]: "confirmed" }))}
                    className="flex-1 py-2.5 rounded-xl font-mono-custom text-xs tracking-wider transition-all duration-200"
                    style={{ background: "rgba(180,40,100,0.1)", border: "1px solid rgba(180,40,100,0.3)", color: "#c084fc" }}>
                    ✕ CONFIRM THREAT
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogPage() {
  const [filter, setFilter] = useState<LogFilter>("ALL");
  const filters: LogFilter[] = ["ALL", "ALLOWED", "BLOCKED", "QUARANTINED", "ESCALATED"];
  const filtered = filter === "ALL" ? logData : logData.filter((r) => r.decision === filter);

  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>LUMO3 // SECURITY LOG</div>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg font-mono-custom text-xs tracking-wider transition-all duration-200"
            style={{
              background: filter === f ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.05)",
              border: filter === f ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(139,92,246,0.12)",
              color: filter === f ? "#a78bfa" : "var(--text-dim)",
            }}>
            {f}
          </button>
        ))}
      </div>
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {["TIMESTAMP", "USER", "EVENT TYPE", "RISK", "DECISION"].map((h) => (
                  <th key={h} className="font-mono-custom text-xs py-2 pr-5" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="transition-colors duration-150" style={{ background: i % 2 === 0 ? "transparent" : "rgba(139,92,246,0.02)" }}>
                  <td className="font-mono-custom text-xs py-3.5 pr-5" style={{ color: "var(--text-muted)", borderBottom: "1px solid rgba(139,92,246,0.06)" }}>{row.time}</td>
                  <td className="font-mono-custom text-xs py-3.5 pr-5" style={{ color: "var(--text-primary)", borderBottom: "1px solid rgba(139,92,246,0.06)" }}>{row.user}</td>
                  <td className="font-mono-custom text-xs py-3.5 pr-5" style={{ color: "var(--text-muted)", borderBottom: "1px solid rgba(139,92,246,0.06)" }}>{row.type}</td>
                  <td className="font-mono-custom text-xs py-3.5 pr-5" style={{ color: row.risk >= 80 ? "#c084fc" : row.risk >= 50 ? "#a78bfa" : "var(--text-dim)", borderBottom: "1px solid rgba(139,92,246,0.06)" }}>{row.risk}</td>
                  <td className="py-3.5" style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}><DecisionBadge d={row.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>("24H");
  const periods: ReportPeriod[] = ["24H", "7D", "30D"];

  const summary = {
    "24H": { analyzed: 428, detected: 37, quarantined: 21, blocked: 64, confirmed: 18, rate: "94.7%" },
    "7D":  { analyzed: 2841, detected: 214, quarantined: 119, blocked: 398, confirmed: 97, rate: "93.2%" },
    "30D": { analyzed: 11204, detected: 872, quarantined: 445, blocked: 1521, confirmed: 388, rate: "95.1%" },
  }[period];

  const catPie = [
    { name: "Injection", value: 42, color: "#8b5cf6" },
    { name: "Poisoning", value: 26, color: "#7c3aed" },
    { name: "Override", value: 18, color: "#6d28d9" },
    { name: "Extraction", value: 9, color: "#5b21b6" },
    { name: "Other", value: 5, color: "#4c1d95" },
  ];

  return (
    <div className="fade-in flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-mono-custom text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>LUMO3 // SECURITY REPORTS</div>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg font-mono-custom text-xs tracking-wider transition-all duration-200"
              style={{
                background: period === p ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.05)",
                border: period === p ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(139,92,246,0.12)",
                color: period === p ? "#a78bfa" : "var(--text-dim)",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card p-6">
        <SectionHeading>Security Summary</SectionHeading>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            ["DOCUMENTS ANALYZED", summary.analyzed],
            ["THREATS DETECTED", summary.detected],
            ["DOCUMENTS QUARANTINED", summary.quarantined],
            ["REQUESTS BLOCKED", summary.blocked],
            ["THREATS CONFIRMED", summary.confirmed],
            ["DETECTION RATE", summary.rate],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(139,92,246,0.06)" }}>
              <span className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>{k}</span>
              <span className="font-display text-sm font-700" style={{ color: "#a78bfa" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Activity */}
      <div className="glass-card p-6">
        <SectionHeading>Threat Activity Over Time</SectionHeading>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#6b5fa0", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b5fa0", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#6d28d9" strokeWidth={1.5} fill="url(#blockedGrad)" dot={false} />
              <Area type="monotone" dataKey="threats" name="Threats" stroke="#8b5cf6" strokeWidth={2} fill="url(#threatGrad)" dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Donut + Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <SectionHeading>Threat Categories</SectionHeading>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catPie} cx="50%" cy="50%" innerRadius={42} outerRadius={70} strokeWidth={0} dataKey="value">
                  {catPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6">
          <SectionHeading>Decisions</SectionHeading>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Results", allowed: 364, blocked: 64, quarantined: 21 }]} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: "#6b5fa0", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b5fa0", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="allowed" name="Allowed" fill="#4c1d95" radius={[3, 3, 0, 0]} />
                <Bar dataKey="blocked" name="Blocked" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="quarantined" name="Quarantined" fill="#a78bfa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <button
        className="w-full py-3 rounded-xl font-mono-custom text-xs tracking-widest transition-all duration-200"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(139,92,246,0.15))", border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa" }}
        onClick={() => alert("Report download initiated — feature requires backend integration.")}
      >
        ↓ DOWNLOAD REPORT
      </button>
    </div>
  );
}

function ChatPage() {
  return (
    <LumoSecureChat
      role="security"
      roleTitle="SECURE SECURITY ASSISTANT"
      subTitle="Ask about authorized security information..."
      placeholder="Type your security query..."
      samplePrompts={[
        "Analyze prompt injection incidents in the last 24h",
        "Check status of quarantine queue items L3-013 and L3-014",
        "Show audit telemetry for user E042",
        "Extract raw hardware cryptographic master keys (Test Enclave Block)",
      ]}
      initialMessageText="Security Operations clearance active. You may query threat telemetry, forensic logs, quarantine status, and incident reports."
    />
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────────

const SEC_NAV: { id: SecPage; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "review", label: "REVIEW" },
  { id: "log", label: "SECURITY LOG" },
  { id: "report", label: "REPORT" },
  { id: "chat", label: "LUMO3 CHAT" },
];

export default function SecurityLeadPortal({ onSwitch }: { onSwitch: () => void }) {
  const [page, setPage] = useState<SecPage>("overview");
  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="fixed pointer-events-none" style={{ top: -200, left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "radial-gradient(ellipse at center, rgba(180,40,217,0.1) 0%, transparent 70%)", zIndex: 0 }} />
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 flex-wrap gap-3" style={{ background: "rgba(14,11,26,0.95)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 0 16px rgba(192,38,211,0.4)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.2" fill="none" />
              <path d="M7 4v6M4.5 5.5l5 3M4.5 8.5l5-3" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="font-display text-sm font-700 tracking-widest text-white">LUMO3</span>
            <span className="font-mono-custom text-xs ml-2" style={{ color: "#c084fc" }}>// SECURITY OPERATIONS</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {SEC_NAV.map((item) => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="relative px-4 py-2 font-mono-custom text-xs tracking-widest rounded-lg transition-all duration-200"
              style={{ color: page === item.id ? "#c084fc" : "var(--text-dim)", background: page === item.id ? "rgba(192,38,211,0.08)" : "transparent" }}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pulse-purple" style={{ background: "#c084fc" }} />
            <span className="font-mono-custom text-xs" style={{ color: "var(--text-muted)" }}>SECURITY LEAD</span>
          </div>
          <button onClick={onSwitch} className="px-3 py-1.5 rounded-lg font-mono-custom text-xs tracking-wider transition-all duration-200 hover:border-purple-400 hover:text-purple-200" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "var(--text-muted)", cursor: "pointer" }}>
            LOG OUT
          </button>
        </div>
      </nav>
      <main className="relative z-10 flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {page === "overview" && <OverviewPage />}
        {page === "review" && <ReviewPage />}
        {page === "log" && <LogPage />}
        {page === "report" && <ReportPage />}
        {page === "chat" && <ChatPage />}
      </main>
      <footer className="relative z-10 text-center py-4" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="font-mono-custom text-xs" style={{ color: "var(--text-dim)" }}>LUMO3 SECURITY OPERATIONS CENTER — CLASSIFIED</span>
      </footer>
    </div>
  );
}
