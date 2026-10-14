import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/conductor/server/proxy';

export async function GET(request: NextRequest) {
  const response = await proxyGet(request, `/admin/discount-applications${request.nextUrl.search}`);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
