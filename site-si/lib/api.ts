const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("si_token");
};

/** Prefixa NEXT_PUBLIC_BASE_PATH para fetch de `/api/...` e para src/href de arquivos em `/uploads/...`. */
export function withBasePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_BASE_PATH
      ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, "")
      : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: Record<string, unknown> } = {}
): Promise<{ data?: T; error?: { code: string; message: string }; status: number }> {
  const { method = "GET", body, ...rest } = options;
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = path.startsWith("http") ? path : withBasePath(`/api${path.startsWith("/") ? path : `/${path}`}`);
  const res = await fetch(url, {
    ...rest,
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: { code: data.code || "ERROR", message: data.message || res.statusText }, status: res.status };
  }
  return { data: data as T, status: res.status };
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("si_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("si_token");
}
