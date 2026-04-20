/**
 * HTTP client for the Riftbounty API.
 * Base URL: NEXT_PUBLIC_API_URL (e.g. http://localhost:3010/v1)
 * Standard response: { status, message?, data }
 */

import { getToken, removeToken } from "./auth";
import { getLocale } from "./locale";
import type { ApiSuccess } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 10000;

/** Opções de fetch; `timeoutMs` é consumido pelo cliente e não é enviado ao `fetch`. */
export type ApiClientOptions = RequestInit & { timeoutMs?: number };

export interface ApiFieldError {
  path: string;
  code?: string;
  message: string;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  fieldErrors?: ApiFieldError[];
  /** Payload `data` do erro da API (ex.: `missingCardNames`). */
  errorData?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: ApiFieldError[],
    errorData?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.errorData = errorData;
  }
}

function isAuthRoute(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/auth/login") || normalized.startsWith("/auth/register");
}

function redirectToLoginFromClient(): void {
  if (typeof window === "undefined") return;
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const url = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  if (window.location.pathname !== "/login") {
    window.location.assign(url);
  }
}

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
  const base = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("API_URL or NEXT_PUBLIC_API_URL must be set (server-side fetch).");
  return `${base}/${pathNormalized}`;
};

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<ApiSuccess<T>> {
  const url = buildUrl(path);
  const { timeoutMs: timeoutOverride, ...fetchOptions } = options;
  const timeoutMs = timeoutOverride ?? DEFAULT_TIMEOUT_MS;

  const token = typeof window !== "undefined" ? getToken() : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept-Language": getLocale(),
    ...fetchOptions.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  // Server-side only: backend exige API_KEY; no browser a chave fica só no proxy
  if (typeof window === "undefined" && process.env.API_KEY) {
    (headers as Record<string, string>)["X-API-Key"] = process.env.API_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller.signal,
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
      // Só 401 = credencial inválida ou expirada. 403 = proibido mas ainda autenticado (ex.: wishlist só membros).
      if (res.status === 401 && typeof window !== "undefined" && !isAuthRoute(path)) {
        removeToken();
        redirectToLoginFromClient();
      }
      const message = body?.message ?? body?.detail ?? `Error ${res.status}`;
      const rawData = body?.data;
      const errorData =
        rawData != null && typeof rawData === "object" && !Array.isArray(rawData)
          ? (rawData as Record<string, unknown>)
          : undefined;
      throw new ApiClientError(
        Array.isArray(message) ? message.join(", ") : message,
        res.status,
        body?.code,
        Array.isArray(body?.data?.fieldErrors) ? body.data.fieldErrors : undefined,
        errorData
      );
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
export async function apiPost<T>(
  path: string,
  data: unknown,
  options: ApiClientOptions = {}
): Promise<ApiSuccess<T>> {
  return apiClient<T>(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

const MULTIPART_TIMEOUT_MS = 120_000;

/** POST multipart/form-data (ex.: upload de ficheiro). Não define Content-Type — o boundary vem do FormData. */
export async function apiPostMultipart<T>(path: string, formData: FormData): Promise<ApiSuccess<T>> {
  const url = buildUrl(path);

  const token = typeof window !== "undefined" ? getToken() : null;
  const headers: HeadersInit = {
    "Accept-Language": getLocale(),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (typeof window === "undefined" && process.env.API_KEY) {
    (headers as Record<string, string>)["X-API-Key"] = process.env.API_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MULTIPART_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
      if (res.status === 401 && typeof window !== "undefined" && !isAuthRoute(path)) {
        removeToken();
        redirectToLoginFromClient();
      }
      const message = body?.message ?? body?.detail ?? `Error ${res.status}`;
      const rawData = body?.data;
      const errorData =
        rawData != null && typeof rawData === "object" && !Array.isArray(rawData)
          ? (rawData as Record<string, unknown>)
          : undefined;
      throw new ApiClientError(
        Array.isArray(message) ? message.join(", ") : message,
        res.status,
        body?.code,
        Array.isArray(body?.data?.fieldErrors) ? body.data.fieldErrors : undefined,
        errorData
      );
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

/** GET; params with undefined/empty values are omitted */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: ApiClientOptions
): Promise<ApiSuccess<T>> {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") search.set(k, String(v));
    }
  }
  const qs = search.toString();
  const url = qs ? `${path}?${qs}` : path;
  return apiClient<T>(url, options ?? {});
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
