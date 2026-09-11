export const API_BASE = "http://127.0.0.1:8001";

export function getToken() {
  return localStorage.getItem("lumo3_token") || "";
}

export function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...authHeaders(),
    ...(options.headers || {}),
  };

  let response = await fetch(url, { ...options, headers });

  // If token is expired or backend was restarted, re-login transparently once
  if (response.status === 401) {
    const email = localStorage.getItem("lumo3_email") || "emp@gmail.com";
    try {
      const loginRes = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "123456789" }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        localStorage.setItem("lumo3_token", loginData.token);
        const retryHeaders = {
          ...authHeaders(),
          ...(options.headers || {}),
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      }
    } catch {
      // Re-auth failed, return original response
    }
  }

  return response;
}

export async function loginApi(email: string, password: string) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Login failed");
  }

  const data = await response.json();

  localStorage.setItem("lumo3_token", data.token);

  return data;
}

export async function uploadApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function chatApi(query: string) {
  const response = await fetchWithAuth(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Chat request failed");
  }

  return response.json();
}

export async function quarantineApi() {
  const response = await fetchWithAuth(`${API_BASE}/api/quarantine`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to load quarantine");
  }

  return response.json();
}

export async function quarantineDecisionApi(
  documentId: string,
  decision: "release" | "confirm_threat"
) {
  const response = await fetchWithAuth(
    `${API_BASE}/api/quarantine/${documentId}/decision`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decision }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Quarantine decision failed");
  }

  return response.json();
}

export async function dashboardApi() {
  const response = await fetchWithAuth(`${API_BASE}/api/dashboard`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to load dashboard");
  }

  return response.json();
}