/**
 * HTTP client for the Riftbounty API.
 * Base URL: NEXT_PUBLIC_API_URL (e.g. http://localhost:3010/v1)
 * Standard response: { status, message?, data }
 */

import { getToken } from "./auth";
import type { ApiSuccess } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 10000;

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return "";
  return url.replace(/\/$/, "");
};

/** When true, requests go through Next.js API proxy so backend calls are logged in the Node terminal */
const shouldUseProxy = () =>
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_API_PROXY === "true";

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccess<T>> {
  const pathNormalized = path.startsWith("/") ? path.slice(1) : path;
  const useProxy = shouldUseProxy();
  const base = useProxy
    ? ""
    : getBaseUrl();
  const url = path.startsWith("http")
    ? path
    : base
      ? `${base}/${pathNormalized}`
      : `/api/proxy/${pathNormalized}`;

  if (!base && !path.startsWith("http") && !useProxy) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_URL in .env.local (e.g. http://localhost:3010/v1)."
    );
  }

  const token = typeof window !== "undefined" ? getToken() : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.json().catch(() => {
      throw new Error("Invalid response from API (not JSON). Check NEXT_PUBLIC_API_URL.");
    });

    if (!res.ok) {
      const message = body?.message ?? body?.detail ?? `Error ${res.status}`;
      throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    return body as ApiSuccess<T>;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out. The API is taking too long to respond.");
      }
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error("Could not reach the API. Check if it is running and CORS is allowed.");
      }
    }
    throw err;
  }
}

/** POST for auth/login or auth/register */
export async function apiPost<T>(path: string, data: unknown): Promise<ApiSuccess<T>> {
  return apiClient<T>(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** GET; params with undefined/empty values are omitted */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<ApiSuccess<T>> {
  if (!params) return apiClient<T>(path);
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const qs = search.toString();
  return apiClient<T>(qs ? `${path}?${qs}` : path);
}

/** DELETE */
export async function apiDelete<T>(path: string): Promise<ApiSuccess<T>> {
  return apiClient<T>(path, { method: "DELETE" });
}

/** PATCH with JSON body */
export async function apiPatch<T>(path: string, data: unknown): Promise<ApiSuccess<T>> {
  return apiClient<T>(path, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** PUT with JSON body */
export async function apiPut<T>(path: string, data: unknown): Promise<ApiSuccess<T>> {
  return apiClient<T>(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
