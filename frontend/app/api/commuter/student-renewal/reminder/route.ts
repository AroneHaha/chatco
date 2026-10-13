import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

export async function POST(request: NextRequest) {
  const result = await proxyToLaravel(request, '/commuter/student-renewal/reminder', { method: 'POST', body: await request.json() });
  return result.ok ? jsonData(result.data) : jsonValidationError(result.message ?? 'Unable to save your reminder choice.', result.errors, result.status);
}
