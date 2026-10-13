import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/conductor/server/proxy';

export function GET(request: NextRequest) {
  return proxyGet(request, `/admin/discount-applications${request.nextUrl.search}`);
}
