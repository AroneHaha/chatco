import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('chatco_session')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
  }

  const form = await request.formData();
  const body = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') body.set(key, value);
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/broadcasting/auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'Broadcast authentication is unavailable.' }, { status: 502 });
  }
}
