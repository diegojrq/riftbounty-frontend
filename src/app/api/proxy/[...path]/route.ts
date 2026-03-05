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

async function proxy(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  const pathSegment = params.path?.join("/") ?? "";
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

  const res = await fetch(backendUrl, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

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
