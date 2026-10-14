import { NextRequest } from 'next/server';
import { proxyToLaravel, proxyGet } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

export function GET(request: NextRequest) {
  return proxyGet(request, '/commuter/student-renewal');
}

export async function POST(request: NextRequest) {
  const result = await proxyToLaravel(request, '/commuter/student-renewal', { method: 'POST', body: await request.formData() });
  return result.ok ? jsonData(result.data, 201) : jsonValidationError(result.message ?? 'Unable to submit renewal.', result.errors, result.status);
}
