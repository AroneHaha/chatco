import { NextRequest, NextResponse } from 'next/server';
import { jsonError, jsonValidationError } from '@/lib/conductor/server/response';

/**
 * POST /api/admin/admins
 * Forwards the authenticated admin registration form as multipart data so
 * Laravel can validate and store its optional profile picture.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('chatco_session')?.value;
  if (!token) return jsonError('Unauthorized. Admin session required.', 401);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return jsonError('Submit the registration form as multipart data.', 400);
  }

  const apiUrl = process.env.API_URL || 'http://localhost:8000';
  try {
    const response = await fetch(`${apiUrl}/api/v1/admin/admins`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': contentType,
      },
      body: await request.arrayBuffer(),
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 422 && body?.errors) {
        return jsonValidationError(body.message ?? 'Validation failed.', body.errors, 422);
      }
      return jsonError(body?.message ?? `Failed to create admin account (HTTP ${response.status}).`, response.status);
    }

    return NextResponse.json(
      { data: body?.data ?? null, message: body?.message ?? 'Admin account created.' },
      { status: 201 },
    );
  } catch {
    return jsonError('Unable to reach the backend service. Please try again.', 502);
  }
}
