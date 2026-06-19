import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export interface ProxyResult {
  ok: boolean;
  status: number;
  data: unknown;
  message: string | null;
}

export async function proxyToLaravel(
  request: NextRequest,
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  } = {}
): Promise<ProxyResult> {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return { ok: false, status: 401, data: null, message: "Unauthorized. Conductor session required." };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${API_V1}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        message: body?.message ?? "Request failed.",
      };
    }

    return { ok: true, status: res.status, data: body?.data ?? null, message: body?.message ?? null };
  } catch {
    return {
      ok: false,
      status: 502,
      data: null,
      message: "Unable to reach the backend service. Please try again.",
    };
  }
}

export async function proxyGet(request: NextRequest, path: string) {
  const result = await proxyToLaravel(request, path, { method: "GET" });
  if (!result.ok) {
    return jsonError(result.message ?? "Request failed.", result.status);
  }
  return jsonData(result.data);
}
