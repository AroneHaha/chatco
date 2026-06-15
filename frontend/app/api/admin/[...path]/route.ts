// app/api/admin/[...path]/route.ts
//
// BFF catch-all proxy for all admin API calls.
// Reads the Sanctum token from the httpOnly `chatco_session` cookie,
// forwards the request to the Laravel backend, and returns the response.
//
// Usage from client: fetch('/api/admin/dashboard') → proxies to Laravel GET /api/admin/dashboard
//
// NOTE: The login endpoint (/api/auth/login) does NOT go through this proxy.
// It is handled separately by the auth-context.tsx or a dedicated auth BFF route.

import { NextRequest, NextResponse } from 'next/server';

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000';

async function proxyRequest(req: NextRequest, method: string) {
  try {
    // Read Sanctum token from httpOnly cookie
    const token = req.cookies.get('chatco_session')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthenticated' },
        { status: 401 }
      );
    }

    // Build the Laravel URL from the catch-all path segments
    const pathSegments = req.nextUrl.pathname
      .replace('/api/admin/', '');
    const laravelUrl = `${LARAVEL_API_URL}/api/admin/${pathSegments}`;

    // Forward query params
    const queryString = req.nextUrl.search || '';

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Forward body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await req.json();
        fetchOptions.body = JSON.stringify(body);
      } catch {
        // No body or invalid JSON — that's fine
      }
    }

    const response = await fetch(`${laravelUrl}${queryString}`, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[BFF Admin Proxy Error]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, 'GET');
}

export async function POST(req: NextRequest) {
  return proxyRequest(req, 'POST');
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req, 'PUT');
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req, 'PATCH');
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, 'DELETE');
}