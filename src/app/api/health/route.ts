import { NextResponse } from "next/server";

/**
 * GET /api/health — troubleshooting: testa se o backend (API_URL) está acessível
 * a partir do ambiente onde o front está rodando (local ou Vercel).
 * Não expõe API_KEY; mostra só se a variável está definida e se o backend respondeu.
 */
export async function GET() {
  const apiUrl = process.env.API_URL;
  const hasApiKey = Boolean(process.env.API_KEY);

  if (!apiUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "API_URL not set",
        hint: "Set API_URL in Vercel: Project → Settings → Environment Variables (e.g. https://api.riftbounty.com/v1)",
        env: { API_URL: "missing", API_KEY: hasApiKey ? "set" : "not set" },
      },
      { status: 503 }
    );
  }

  const base = apiUrl.replace(/\/$/, "");
  const probeUrl = `${base}/cards/catalog-version`;

  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (process.env.API_KEY) {
      (headers as Record<string, string>)["X-API-Key"] = process.env.API_KEY;
    }
    const res = await fetch(probeUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(body);
    } catch {
      data = body.slice(0, 200);
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Backend returned ${res.status}`,
          backend: base,
          status: res.status,
          body: data,
          env: { API_URL: "set", API_KEY: hasApiKey ? "set" : "not set" },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      backend: base,
      status: res.status,
      data,
      env: { API_URL: "set", API_KEY: hasApiKey ? "set" : "not set" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("timeout") || (err instanceof Error && err.name === "AbortError");
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout ? "Request to backend timed out" : "Failed to reach backend",
        detail: message,
        backend: base,
        env: { API_URL: "set", API_KEY: hasApiKey ? "set" : "not set" },
        hint: "On Vercel, ensure API_URL is https://api.riftbounty.com/v1 and API_KEY matches the backend. Check Vercel → Logs for runtime errors.",
      },
      { status: 502 }
    );
  }
}
