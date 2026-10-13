import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

export async function POST(request: NextRequest) {
  const result = await proxyToLaravel(request, '/commuter/student-renewal/regular', { method: 'POST', body: await request.json() });
  return result.ok ? jsonData(result.data) : jsonValidationError(result.message ?? 'Unable to change commuter type.', result.errors, result.status);
}
