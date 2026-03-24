import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL not set");
  return url.replace(/\/$/, "");
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "DELETE");
}

const ALLOWED_PATH_PREFIXES = [
  "auth",
  "cards",
  "abilities",
  "trades",
  "collections",
  "decks",
  "notifications",
  "admin",
  "donations",
  "riot-catalog",
];

function validatePath(segments: string[]): string {
  if (!segments?.length) return "";
  const first = segments[0]?.toLowerCase();
  if (!first || !ALLOWED_PATH_PREFIXES.includes(first)) {
    throw new Error("Invalid path prefix");
  }
  for (const seg of segments) {
    if (seg === ".." || seg.includes("/")) {
      throw new Error("Invalid path segment");
    }
  }
  return segments.join("/");
}

async function proxy(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  let pathSegment: string;
  try {
    pathSegment = validatePath(params.path ?? []);
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request path" },
      { status: 400 }
    );
  }
  const backendBase = getBackendUrl();
  const search = request.nextUrl.search;
  const backendUrl = `${backendBase}/${pathSegment}${search}`;

  let body: unknown = null;
  if (method !== "GET" && method !== "DELETE") {
    try {
      body = await request.json();
    } catch {
      // no body
    }
  }

  const payloadStr = body !== null ? ` | payload: ${JSON.stringify(body)}` : "";

  const headers: HeadersInit = {};
  const forwardHeaders = [
    "accept-language",
    "authorization",
    "content-type",
    "origin",
    "referer",
  ];
  request.headers.forEach((value, key) => {
    if (forwardHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // API key só no servidor: o browser nunca envia, só o proxy adiciona ao chamar o backend
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    (headers as Record<string, string>)["X-API-Key"] = apiKey;
  }

  let res: Response;
  try {
    res = await fetch(backendUrl, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] ${method} /${pathSegment} → BACKEND_ERROR: ${msg}`);
    return NextResponse.json(
      {
        status: "error",
        message: "Could not reach backend. Check API_URL and network.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 502 }
    );
  }

  const resBody = await res.text();
  try {
    const json = JSON.parse(resBody);
    console.log(`[proxy] ${method} /${pathSegment}${payloadStr} → ${res.status}`);
    return NextResponse.json(json, { status: res.status });
  } catch {
    console.log(`[proxy] ${method} /${pathSegment}${payloadStr} → ${res.status}`);
    return new NextResponse(resBody, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "text/plain" },
    });
  }
}
