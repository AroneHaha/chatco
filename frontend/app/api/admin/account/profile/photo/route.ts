import { NextRequest } from 'next/server';
import { proxyToLaravel } from '@/lib/conductor/server/proxy';
import { jsonData, jsonError, jsonValidationError } from '@/lib/conductor/server/response';

export async function POST(request: NextRequest) {
  if (!request.cookies.get('chatco_session')?.value) return jsonError('Unauthenticated.', 401);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return jsonError('Choose an image to upload.', 400);
  try {
    const result = await proxyToLaravel(request, '/admin/account/profile/photo', { method: 'POST', body: await request.formData() });
    if (!result.ok) {
      if (result.status === 422 && result.errors) return jsonValidationError(result.message ?? 'Invalid photo.', result.errors, 422);
      return jsonError(result.message ?? 'Unable to upload profile picture.', result.status);
    }
    return jsonData(result.data);
  } catch { return jsonError('Unable to upload the picture. Please try again.', 502); }
}
