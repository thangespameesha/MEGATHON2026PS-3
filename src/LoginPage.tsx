import { useState } from "react";
import { loginApi } from "./api";

interface LoginPageProps {
  onLogin: (role: "mainhead" | "security" | "employee") => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedEmail) {
      setError("Please enter your Email ID");
      return;
    }

    if (!trimmedPass) {
      setError("Please enter your Password");
      return;
    }

    setLoading(true);

    try {
      // Authenticate with the real LUMO3 backend
      const result = await loginApi(trimmedEmail, trimmedPass);

      // Store backend authentication token
      localStorage.setItem("lumo3_token", result.token);

      // Store basic session information
      localStorage.setItem("lumo3_email", result.email);
      localStorage.setItem("lumo3_user_id", result.user_id);
      localStorage.setItem("lumo3_role", result.role);

      // Use the role returned by the backend
      if (result.role === "main_head") {
        onLogin("mainhead");
      } else if (result.role === "security_lead") {
        onLogin("security");
      } else if (result.role === "employee") {
        onLogin("employee");
      } else {
        setError("Unknown user role returned by server");
      }
    } catch (err) {
      console.error("Login failed:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to connect to LUMO3 backend";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-full w-full flex flex-col items-center justify-center px-4 py-12 cyber-grid relative overflow-hidden select-none"
      style={{ background: "var(--bg)" }}
    >
      {/* Cyber ambient glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          background:
            "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.16) 0%, rgba(192, 38, 211, 0.08) 45%, transparent 70%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-[340px] flex flex-col items-center">
        {/* User Outline Icon */}
        <div className="w-16 h-16 flex items-center justify-center mb-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(192, 132, 252, 0.35)",
              boxShadow: "0 0 20px rgba(192, 132, 252, 0.25)",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="7.5" r="4" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
          </div>
        </div>

        {/* User Login Title */}
        <h1
          className="text-white text-[30px] font-light tracking-[0.16em] mb-10 text-center glow-text-purple"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          User Login
        </h1>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          {/* Email ID Field */}
          <div
            className="flex items-center gap-3 border-b pb-2 transition-all duration-200"
            style={{
              borderColor: "rgba(168, 85, 247, 0.35)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#c084fc";
              e.currentTarget.style.boxShadow =
                "0 2px 10px rgba(192, 132, 252, 0.35)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor =
                "rgba(168, 85, 247, 0.35)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="Email ID"
              className="w-full bg-transparent outline-none text-sm text-white placeholder-[#7e72a8] font-normal"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div
            className="flex items-center gap-3 border-b pb-2 transition-all duration-200"
            style={{
              borderColor: "rgba(168, 85, 247, 0.35)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#c084fc";
              e.currentTarget.style.boxShadow =
                "0 2px 10px rgba(192, 132, 252, 0.35)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor =
                "rgba(168, 85, 247, 0.35)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="#c084fc"
            >
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V7zm3 7a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-3 0v-2A1.5 1.5 0 0 1 12 14z" />
            </svg>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              className="w-full bg-transparent outline-none text-sm text-white placeholder-[#7e72a8] font-normal"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded-sm accent-[#a78bfa] cursor-pointer"
                disabled={loading}
              />
              <span style={{ color: "var(--text-muted)" }}>
                Remember me
              </span>
            </label>

            <button
              type="button"
              onClick={() =>
                setError(
                  "Demo accounts: head@gmail.com, security@gmail.com, emp@gmail.com (Password: 123456789)"
                )
              }
              className="italic hover:text-purple-300 bg-transparent border-none p-0 cursor-pointer text-xs transition-colors"
              style={{ color: "#a78bfa" }}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="text-xs px-3 py-2 rounded text-center font-medium font-mono-custom"
              style={{
                background: "rgba(225, 29, 72, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                color: "#fda4af",
              }}
            >
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 text-white font-semibold text-xs tracking-[0.2em] transition-all duration-300 text-center"
            style={{
              background: loading
                ? "rgba(124, 58, 237, 0.45)"
                : "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
              boxShadow: "0 0 25px rgba(192, 38, 211, 0.45)",
              border: "1px solid rgba(216, 180, 254, 0.3)",
              borderRadius: "4px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}