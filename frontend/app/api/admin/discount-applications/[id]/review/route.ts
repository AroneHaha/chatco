import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonValidationError } from '@/lib/conductor/server/response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await proxyToLaravel(request, `/admin/discount-applications/${encodeURIComponent(id)}/review`, { method: 'POST', body: await request.json() });
  return result.ok ? jsonData(result.data) : jsonValidationError(result.message ?? 'Unable to review application.', result.errors, result.status);
}
