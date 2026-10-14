import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

export async function POST(request: NextRequest) {
  const result = await proxyToLaravel(request, '/commuter/discount-applications/cancel', { method: 'POST', body: await request.json() });
  const response = result.ok ? jsonData(result.data)
    : jsonValidationError(result.message ?? 'Unable to cancel the application.', result.errors, result.status);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
