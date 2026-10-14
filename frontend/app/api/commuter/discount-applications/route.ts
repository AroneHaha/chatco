import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

async function handle(request: NextRequest, submit: boolean) {
  const result = await proxyToLaravel(request, '/commuter/discount-applications', submit
    ? { method: 'POST', body: await request.formData() } : {});
  const response = result.ok ? jsonData(result.data, submit ? 201 : 200)
    : jsonValidationError(result.message ?? 'Unable to load discount application.', result.errors, result.status);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export function GET(request: NextRequest) { return handle(request, false); }
export function POST(request: NextRequest) { return handle(request, true); }
