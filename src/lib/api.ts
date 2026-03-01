/**
 * HTTP client for the Riftbounty API.
 * Base URL: NEXT_PUBLIC_API_URL (e.g. http://localhost:3010/v1)
 * Standard response: { status, message?, data }
 */

import { getToken } from "./auth";
import type { ApiSuccess } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * No browser: sempre usa /api/proxy/ (Next.js Route Handler server-side)
 * → o backend real nunca aparece no Network tab do browser.
 * No servidor (SSR/RSC): chama o backend direto via API_URL.
 */
const buildUrl = (path: string): string => {
  if (path.startsWith("http")) return path;
  const pathNormalized = path.startsWith("/") ? path.slice(1) : path;
  if (typeof window !== "undefined") {
    return `/api/proxy/${pathNormalized}`;
  }
  const base = (process.env.API_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("API_URL not set in .env.local");
  return `${base}/${pathNormalized}`;
};

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccess<T>> {
  const url = buildUrl(path);

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

    // 204 No Content ou body vazio — resposta válida sem dados
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return { status: "success", data: null as unknown as T };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return { status: "success", data: null as unknown as T };
    }

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
