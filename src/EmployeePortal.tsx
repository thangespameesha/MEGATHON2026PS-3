import { useState, useRef, useEffect } from "react";
import { uploadApi, dashboardApi, chatApi } from "./api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import LumoSecureChat from "./LumoSecureChat";

type Page = "overview" | "upload" | "chat" | "activity";
type UploadState = "idle" | "scanning" | "accepted" | "quarantined";

type ActivityEvent = {
  type: string;
  document?: string;
  document_id?: string;
  status?: string;
  decision?: string;
  query?: string;
  timestamp?: string;
};

type DashboardStats = {
  total_documents: number;
  my_queries: number;
  under_review: number;
  security_alerts: number;
  activity_distribution: {
    docs_uploaded: number;
    lumo3_queries: number;
    blocked_requests: number;
    other_events: number;
  };
  activity: ActivityEvent[];
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const count = payload[0].value;

  return (
    <div
      className="glass-card px-3 py-2"
      style={{ border: "1px solid rgba(139,92,246,0.4)" }}
    >
      <p
        className="font-mono-custom text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>

      <p
        className="font-display text-sm font-600"
        style={{ color: "#a78bfa" }}
      >
        {count} {count === 1 ? "Event" : "Events"}
      </p>
    </div>
  );
}

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-1 h-4 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, #a78bfa, #6d28d9)",
        }}
      />

      <h2
        className="font-mono-custom text-xs tracking-widest font-600 uppercase"
        style={{ color: "var(--text-secondary)" }}
      >
        {children}
      </h2>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="glass-card p-6 flex flex-col gap-3">
      <p
        className="font-mono-custom text-xs tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>

      <p
        className="font-display text-4xl font-700"
        style={{
          background:
            "linear-gradient(135deg, #e0d7ff, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {value}
      </p>

      <p
        className="text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {sub}
      </p>
    </div>
  );
}

function ScanStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span
        className="font-mono-custom text-xs tracking-wider"
        style={{
          color: done
            ? "var(--text-primary)"
            : active
              ? "var(--text-secondary)"
              : "var(--text-dim)",
        }}
      >
        {label}
      </span>

      {done ? (
        <span
          style={{ color: "#a78bfa" }}
          className="font-mono-custom text-xs"
        >
          ✓
        </span>
      ) : active ? (
        <span
          className="font-mono-custom text-xs pulse-purple"
          style={{ color: "#a78bfa" }}
        >
          ...
        </span>
      ) : (
        <span
          style={{ color: "var(--text-dim)" }}
          className="font-mono-custom text-xs"
        >
          —
        </span>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const normalized = result.toUpperCase();

  const isNegative =
    normalized === "BLOCKED" ||
    normalized === "REVIEW" ||
    normalized === "QUARANTINED" ||
    normalized === "CONFIRMED_THREAT";

  return (
    <span
      className="font-mono-custom text-xs px-2.5 py-1 rounded-md"
      style={{
        background: isNegative
          ? "rgba(180,40,100,0.1)"
          : "rgba(139,92,246,0.1)",
        border: `1px solid ${isNegative
          ? "rgba(180,40,100,0.25)"
          : "rgba(139,92,246,0.25)"
          }`,
        color: isNegative ? "#c084fc" : "#a78bfa",
      }}
    >
      {isNegative
        ? normalized === "REVIEW" ||
          normalized === "QUARANTINED"
          ? "⚠ REVIEW"
          : "✕ BLOCKED"
        : "✓ " + normalized}
    </span>
  );
}


/* =========================================================
   OVERVIEW
========================================================= */

function OverviewPage({
  stats,
  loading,
}: {
  stats: DashboardStats;
  loading: boolean;
}) {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const dayIndexMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const activityByDay: Record<string, number> = {
    MON: 0,
    TUE: 0,
    WED: 0,
    THU: 0,
    FRI: 0,
    SAT: 0,
    SUN: 0,
  };

  stats.activity.forEach((event) => {
    if (!event.timestamp) return;

    const date = new Date(event.timestamp);
    if (Number.isNaN(date.getTime())) return;

    const dayName = dayIndexMap[date.getDay()];
    if (dayName) {
      activityByDay[dayName] = (activityByDay[dayName] || 0) + 1;
    }
  });

  const securityTrend = days.map((day) => ({
    day,
    score: activityByDay[day] || 0,
  }));

  return (
    <div className="fade-in flex flex-col gap-8">
      {/* =================================================
          TOP STATISTICS
      ================================================= */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="TOTAL DOCUMENTS"
          value={loading ? "..." : stats.total_documents}
          sub="Uploaded by me"
        />

        <StatCard
          label="MY QUERIES"
          value={loading ? "..." : stats.my_queries}
          sub="LUMO3 Chat"
        />

        <StatCard
          label="UNDER REVIEW"
          value={loading ? "..." : stats.under_review}
          sub="Awaiting review"
        />

        <StatCard
          label="SECURITY ALERTS"
          value={loading ? "..." : stats.security_alerts}
          sub="Blocked requests"
        />
      </div>

      {/* =================================================
          REAL ACTIVITY TREND (LIVE)
      ================================================= */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-1">
          <SectionHeading>Security Activity</SectionHeading>
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono-custom text-[11px] text-emerald-400">
              LIVE DATA STREAM
            </span>
          </div>
        </div>

        <p
          className="font-mono-custom text-xs mb-5"
          style={{ color: "var(--text-dim)" }}
        >
          LUMO3 Activity / Daily Event Count
        </p>

        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={securityTrend}
              margin={{
                top: 10,
                right: 10,
                bottom: 0,
                left: -20,
              }}
            >
              <defs>
                <linearGradient id="purpleGradE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="day"
                tick={{
                  fill: "#6b5fa0",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                domain={[0, (dataMax: number) => Math.max(dataMax + 1, 4)]}
                tick={{
                  fill: "#6b5fa0",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#purpleGradE)"
                dot={{
                  fill: "#8b5cf6",
                  r: 4,
                  strokeWidth: 0,
                }}
                activeDot={{
                  fill: "#c084fc",
                  r: 6,
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   UPLOAD
========================================================= */

function UploadPage({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void;
}) {
  const [state, setState] =
    useState<UploadState>("idle");

  const [fileName, setFileName] =
    useState("");

  const [fileSize, setFileSize] =
    useState("");

  const [scanStep, setScanStep] =
    useState(0);

  const [dragging, setDragging] =
    useState(false);

  const fileRef =
    useRef<HTMLInputElement>(null);

  async function startScan(file: File) {
    setFileName(file.name);

    const kb = file.size / 1024;

    setFileSize(
      kb < 1024
        ? `${kb.toFixed(0)} KB`
        : `${(kb / 1024).toFixed(1)} MB`
    );

    setState("scanning");
    setScanStep(1);

    try {
      setScanStep(2);

      const result =
        await uploadApi(file);

      if (result.status === "accepted") {
        setState("accepted");
        onUploadSuccess?.();
      } else if (
        result.status === "quarantined"
      ) {
        setState("quarantined");
        onUploadSuccess?.();
      }

    } catch (error) {

      console.error(
        "Upload failed:",
        error
      );

      setState("idle");

      const message =
        error instanceof Error
          ? error.message
          : "Unknown upload error";

      alert(
        `LUMO3 Upload Error: ${message}`
      );
    }
  }

  function handleFile(file: File) {
    startScan(file);
  }

  return (
    <div className="fade-in flex flex-col gap-6">

      <div
        className="font-mono-custom text-xs tracking-widest"
        style={{
          color: "var(--text-muted)",
        }}
      >
        LUMO3 // SECURE UPLOAD
      </div>

      {state === "idle" && (
        <div
          className="glass-card p-10 flex flex-col items-center gap-5 cursor-pointer transition-all duration-200"
          style={{
            border: dragging
              ? "1.5px solid rgba(139,92,246,0.6)"
              : "1.5px dashed rgba(139,92,246,0.2)",

            boxShadow: dragging
              ? "0 0 32px rgba(139,92,246,0.15)"
              : "none",
          }}

          onClick={() =>
            fileRef.current?.click()
          }

          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}

          onDragLeave={() =>
            setDragging(false)
          }

          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);

            const f =
              e.dataTransfer.files[0];

            if (f) handleFile(f);
          }}
        >

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background:
                "rgba(139,92,246,0.1)",
              border:
                "1px solid rgba(139,92,246,0.2)",
            }}
          >

            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 4L12 16M12 4L8 8M12 4L16 8"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M4 18H20"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

          </div>

          <div className="text-center">

            <p
              className="font-display text-sm font-600 mb-1"
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              UPLOAD DOCUMENT
            </p>

            <p
              className="font-mono-custom text-xs"
              style={{
                color: "var(--text-dim)",
              }}
            >
              DROP FILE HERE
            </p>

          </div>

          <p
            className="font-mono-custom text-xs"
            style={{
              color: "var(--text-dim)",
            }}
          >
            PDF • DOCX • TXT
          </p>

          <button
            type="button"
            className="px-6 py-2.5 rounded-lg font-mono-custom text-xs tracking-widest"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(139,92,246,0.2))",
              border:
                "1px solid rgba(139,92,246,0.4)",
              color: "#a78bfa",
            }}
          >
            SELECT FILE
          </button>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              const f =
                e.target.files?.[0];

              if (f) handleFile(f);
            }}
          />

        </div>
      )}


      {state === "scanning" && (
        <div className="glass-card p-7 flex flex-col gap-2">

          <SectionHeading>
            Document Scan
          </SectionHeading>

          <p
            className="font-mono-custom text-xs mb-4"
            style={{
              color: "var(--text-muted)",
            }}
          >
            FILE:{" "}
            <span
              style={{
                color: "var(--text-primary)",
              }}
            >
              {fileName}
            </span>

            &nbsp;

            SIZE:{" "}
            <span
              style={{
                color: "var(--text-primary)",
              }}
            >
              {fileSize}
            </span>
          </p>

          <div
            className="h-px w-full mb-2"
            style={{
              background: "var(--border)",
            }}
          />

          <ScanStep
            label="TOKENIZATION"
            done={scanStep >= 1}
            active={scanStep === 0}
          />

          <ScanStep
            label="CONTENT SCAN"
            done={scanStep >= 2}
            active={scanStep === 1}
          />

          <ScanStep
            label="SECURITY ANALYSIS"
            done={false}
            active={scanStep === 2}
          />

        </div>
      )}


      {state === "accepted" && (
        <div
          className="glass-card p-8 flex flex-col items-center gap-4 fade-in"
          style={{
            border:
              "1px solid rgba(139,92,246,0.4)",
          }}
        >

          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "rgba(139,92,246,0.15)",
              border:
                "1px solid rgba(139,92,246,0.4)",
            }}
          >
            <span
              style={{
                color: "#a78bfa",
                fontSize: 22,
              }}
            >
              ✓
            </span>
          </div>

          <p
            className="font-display text-sm font-700 tracking-widest"
            style={{
              color: "#a78bfa",
            }}
          >
            DOCUMENT ACCEPTED
          </p>

          <p
            className="text-xs text-center"
            style={{
              color: "var(--text-muted)",
            }}
          >
            Security checks passed.
            <br />
            Document added to your authorized workspace.
          </p>

          <button
            onClick={() =>
              setState("idle")
            }
            className="mt-2 px-5 py-2 rounded-lg font-mono-custom text-xs tracking-wider"
            style={{
              background:
                "rgba(139,92,246,0.1)",
              border:
                "1px solid rgba(139,92,246,0.3)",
              color: "var(--text-muted)",
            }}
          >
            UPLOAD ANOTHER
          </button>

        </div>
      )}


      {state === "quarantined" && (
        <div
          className="glass-card p-8 flex flex-col items-center gap-4 fade-in"
          style={{
            border:
              "1px solid rgba(180,40,100,0.35)",
          }}
        >

          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "rgba(180,40,100,0.12)",
              border:
                "1px solid rgba(180,40,100,0.35)",
            }}
          >
            <span
              style={{
                color: "#c084fc",
                fontSize: 22,
              }}
            >
              ⚠
            </span>
          </div>

          <p
            className="font-display text-sm font-700 tracking-widest"
            style={{
              color: "#c084fc",
            }}
          >
            DOCUMENT QUARANTINED
          </p>

          <p
            className="text-xs text-center"
            style={{
              color: "var(--text-muted)",
            }}
          >
            Suspicious content detected.
            <br />
            Sent to Security Lead for review.
          </p>

          <div
            className="px-4 py-2 rounded-lg font-mono-custom text-xs tracking-widest"
            style={{
              background:
                "rgba(180,40,100,0.1)",
              border:
                "1px solid rgba(180,40,100,0.25)",
              color: "#c084fc",
            }}
          >
            STATUS: UNDER REVIEW
          </div>

          <button
            onClick={() =>
              setState("idle")
            }
            className="mt-1 px-5 py-2 rounded-lg font-mono-custom text-xs tracking-wider"
            style={{
              background:
                "rgba(139,92,246,0.1)",
              border:
                "1px solid rgba(139,92,246,0.3)",
              color: "var(--text-muted)",
            }}
          >
            UPLOAD ANOTHER
          </button>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   CHAT
========================================================= */

function ChatPage({
  onQuerySuccess,
}: {
  onQuerySuccess?: () => void;
}) {
  const handleQuery = async (q: string) => {
    try {
      const response = await chatApi(q);

      // Instantly notify parent so stats.my_queries increments and graph updates live
      onQuerySuccess?.();

      const isAllowed = response.status === "allowed";
      const sources = response.sources
        ?.map((s: any) => s.provenance?.filename || s.document_id)
        .filter(Boolean);

      return {
        text:
          response.answer ||
          (isAllowed
            ? "Query processed successfully."
            : "Request restricted by security controls."),
        status: (isAllowed ? "AUTHORIZED" : "BLOCKED") as "AUTHORIZED" | "BLOCKED",
        sources: sources && sources.length > 0 ? sources : undefined,
        riskAnalysis: (isAllowed ? "LOW" : "HIGH") as "LOW" | "HIGH",
        egressCheck: (isAllowed ? "PASSED" : "BLOCKED") as "PASSED" | "BLOCKED",
        classification:
          response.reasons?.[0] ||
          (isAllowed ? "AUTHORIZED RAG INFERENCE" : "ZERO TRUST POLICY BLOCK"),
      };
    } catch (err) {
      console.error("Chat API error:", err);
      onQuerySuccess?.();
      throw err;
    }
  };

  return (
    <LumoSecureChat
      role="employee"
      roleTitle="LUMO3 KNOWLEDGE ASSISTANT"
      subTitle="Ask something about your authorized data..."
      placeholder="Type your question here..."
      samplePrompts={[
        "What is our annual leave policy?",
        "Explain employee remote work guidelines",
        "Summarize data retention protocol",
        "Show confidential employee salary sheet (Test Boundary)",
      ]}
      initialMessageText="Hello! I am your LUMO3 Secure Assistant. Ask about your authorized departmental documents, company policies, or workspace knowledge."
      onQuery={handleQuery}
    />
  );
}


/* =========================================================
   MY ACTIVITY
========================================================= */

function ActivityPage({
  activity,
  loading,
}: {
  activity: ActivityEvent[];
  loading: boolean;
}) {
  /* =======================================================
     DOCUMENT HISTORY
  ======================================================= */

  const docHistory = activity
    .filter(
      (event) =>
        event.type ===
        "document_upload"
    )
    .map((event) => ({
      name:
        event.document ||
        "Unknown document",

      time:
        event.timestamp
          ? new Date(
            event.timestamp
          ).toLocaleString()
          : "—",

      result:
        event.status ===
          "quarantined"
          ? "REVIEW"
          : "ACCEPTED",
    }));


  /* =======================================================
     QUERY HISTORY
  ======================================================= */

  const queryHistory = activity
    .filter(
      (event) =>
        event.type === "query"
    )
    .map((event) => ({
      query:
        event.query ||
        "Unknown query",

      time:
        event.timestamp
          ? new Date(
            event.timestamp
          ).toLocaleString()
          : "—",

      result:
        event.status === "blocked"
          ? "BLOCKED"
          : "PROVIDED",
    }));


  return (
    <div className="fade-in flex flex-col gap-8">

      {/* =================================================
          DOCUMENT HISTORY
      ================================================= */}

      <div className="glass-card p-6">

        <SectionHeading>
          Document History
        </SectionHeading>

        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead>
              <tr>
                {[
                  "DOCUMENT",
                  "TIMESTAMP",
                  "RESULT",
                ].map((h) => (
                  <th
                    key={h}
                    className="font-mono-custom text-xs py-2 pr-4"
                    style={{
                      color:
                        "var(--text-dim)",
                      borderBottom:
                        "1px solid var(--border)",
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center font-mono-custom text-xs"
                    style={{
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    LOADING ACTIVITY...
                  </td>
                </tr>

              ) : docHistory.length === 0 ? (

                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center font-mono-custom text-xs"
                    style={{
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    NO DOCUMENT ACTIVITY
                  </td>
                </tr>

              ) : (

                docHistory.map(
                  (row, i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(139,92,246,0.02)",
                      }}
                    >

                      <td
                        className="font-mono-custom text-xs py-3.5 pr-4"
                        style={{
                          color:
                            "var(--text-primary)",
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        {row.name}
                      </td>

                      <td
                        className="font-mono-custom text-xs py-3.5 pr-4"
                        style={{
                          color:
                            "var(--text-muted)",
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        {row.time}
                      </td>

                      <td
                        className="py-3.5"
                        style={{
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        <ResultBadge
                          result={row.result}
                        />
                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* =================================================
          QUERY HISTORY
      ================================================= */}

      <div className="glass-card p-6">

        <SectionHeading>
          Query History
        </SectionHeading>

        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead>
              <tr>
                {[
                  "QUERY",
                  "TIME",
                  "RESULT",
                ].map((h) => (
                  <th
                    key={h}
                    className="font-mono-custom text-xs py-2 pr-4"
                    style={{
                      color:
                        "var(--text-dim)",
                      borderBottom:
                        "1px solid var(--border)",
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center font-mono-custom text-xs"
                    style={{
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    LOADING ACTIVITY...
                  </td>
                </tr>

              ) : queryHistory.length === 0 ? (

                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center font-mono-custom text-xs"
                    style={{
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    NO QUERY ACTIVITY
                  </td>
                </tr>

              ) : (

                queryHistory.map(
                  (row, i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(139,92,246,0.02)",
                      }}
                    >

                      <td
                        className="font-mono-custom text-xs py-3.5 pr-4"
                        style={{
                          color:
                            "var(--text-primary)",
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                          maxWidth: 220,
                        }}
                      >
                        <span className="truncate block">
                          {row.query}
                        </span>
                      </td>

                      <td
                        className="font-mono-custom text-xs py-3.5 pr-4"
                        style={{
                          color:
                            "var(--text-muted)",
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        {row.time}
                      </td>

                      <td
                        className="py-3.5"
                        style={{
                          borderBottom:
                            "1px solid rgba(139,92,246,0.06)",
                        }}
                      >
                        <ResultBadge
                          result={row.result}
                        />
                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   NAVIGATION
========================================================= */

const EMP_NAV: {
  id: Page;
  label: string;
}[] = [
    {
      id: "overview",
      label: "OVERVIEW",
    },
    {
      id: "upload",
      label: "UPLOAD",
    },
    {
      id: "chat",
      label: "LUMO3 CHAT",
    },
    {
      id: "activity",
      label: "MY ACTIVITY",
    },
  ];


/* =========================================================
   EMPLOYEE PORTAL
========================================================= */

export default function EmployeePortal({
  onSwitch,
}: {
  onSwitch: () => void;
}) {
  const [page, setPage] =
    useState<Page>("overview");

  const [stats, setStats] = useState<DashboardStats>({
    total_documents: 0,
    my_queries: 0,
    under_review: 0,
    security_alerts: 0,
    activity_distribution: {
      docs_uploaded: 0,
      lumo3_queries: 0,
      blocked_requests: 0,
      other_events: 0,
    },
    activity: [],
  });

  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const data = await dashboardApi();
      setStats({
        total_documents: data.total_documents ?? 0,
        my_queries: data.my_queries ?? 0,
        under_review: data.under_review ?? 0,
        security_alerts: data.security_alerts ?? 0,
        activity_distribution: {
          docs_uploaded: data.activity_distribution?.docs_uploaded ?? 0,
          lumo3_queries: data.activity_distribution?.lumo3_queries ?? 0,
          blocked_requests: data.activity_distribution?.blocked_requests ?? 0,
          other_events: data.activity_distribution?.other_events ?? 0,
        },
        activity: Array.isArray(data.activity) ? data.activity : [],
      });
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Continuous live stream polling every 3 seconds
    const interval = setInterval(loadDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleQuerySuccess = () => {
    // Optimistically increment my_queries & live event count immediately
    setStats((prev) => ({
      ...prev,
      my_queries: prev.my_queries + 1,
      activity: [
        {
          type: "query",
          timestamp: new Date().toISOString(),
          status: "allowed",
        },
        ...prev.activity,
      ],
    }));
    loadDashboard();
  };

  const handleUploadSuccess = () => {
    loadDashboard();
  };

  return (
    <div
      className="min-h-full flex flex-col"
      style={{
        background: "var(--bg)",
      }}
    >

      <div
        className="fixed pointer-events-none"
        style={{
          top: -200,
          left: "50%",
          transform:
            "translateX(-50%)",
          width: 800,
          height: 400,
          background:
            "radial-gradient(ellipse at center, rgba(109,40,217,0.12) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <nav
        className="relative z-10 flex items-center justify-between px-6 py-4 flex-wrap gap-3"
        style={{
          background:
            "rgba(14,11,26,0.9)",
          borderBottom:
            "1px solid var(--border)",
          backdropFilter:
            "blur(16px)",
        }}
      >

        <div className="flex items-center gap-2.5">

          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed, #a855f7)",
              boxShadow:
                "0 0 16px rgba(139,92,246,0.5)",
            }}
          >

            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z"
                stroke="white"
                strokeWidth="1.2"
                fill="none"
              />

              <circle
                cx="7"
                cy="7"
                r="2"
                fill="white"
              />

            </svg>

          </div>

          <span className="font-display text-sm font-700 tracking-widest text-white">
            LUMO3
          </span>

        </div>


        <div className="flex items-center gap-1 flex-wrap">

          {EMP_NAV.map((item) => (

            <button
              key={item.id}
              onClick={() =>
                setPage(item.id)
              }
              className="relative px-4 py-2 font-mono-custom text-xs tracking-widest rounded-lg transition-all duration-200"
              style={{
                color:
                  page === item.id
                    ? "#a78bfa"
                    : "var(--text-dim)",

                background:
                  page === item.id
                    ? "rgba(139,92,246,0.08)"
                    : "transparent",
              }}
            >
              {item.label}
            </button>

          ))}

        </div>


        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2">

            <div
              className="w-2 h-2 rounded-full pulse-purple"
              style={{
                background: "#a78bfa",
              }}
            />

            <span
              className="font-mono-custom text-xs"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              EMPLOYEE
            </span>

          </div>


          <button
            onClick={onSwitch}
            className="px-3 py-1.5 rounded-lg font-mono-custom text-xs tracking-wider transition-all duration-200 hover:border-purple-400 hover:text-purple-200"
            style={{
              background:
                "rgba(139,92,246,0.08)",
              border:
                "1px solid rgba(139,92,246,0.25)",
              color:
                "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            LOG OUT
          </button>

        </div>

      </nav>


      <main
        className="relative z-10 flex-1 px-6 py-8 max-w-4xl mx-auto w-full"
      >

        {page === "overview" && (
          <OverviewPage stats={stats} loading={loading} />
        )}

        {page === "upload" && (
          <UploadPage onUploadSuccess={handleUploadSuccess} />
        )}

        {page === "chat" && (
          <ChatPage onQuerySuccess={handleQuerySuccess} />
        )}

        {page === "activity" && (
          <ActivityPage activity={stats.activity} loading={loading} />
        )}

      </main>


      <footer
        className="relative z-10 text-center py-4"
        style={{
          borderTop:
            "1px solid var(--border)",
        }}
      >

        <span
          className="font-mono-custom text-xs"
          style={{
            color:
              "var(--text-dim)",
          }}
        >
          LUMO3 EMPLOYEE PORTAL — ENCRYPTED & MONITORED
        </span>

      </footer>

    </div>
  );
}