// lib/admin/services/account.service.ts
// The signed-in admin's own account (Settings > Profile & Security).
//
//   POST /api/admin/account/change-password/request-code → requestPasswordChangeCode()
//   POST /api/admin/account/change-password/confirm      → confirmPasswordChange()
//
// Same two-step emailed-code flow as the commuter profile; the client, its
// typed errors and the payload contract are shared
// (lib/shared/services/password-change.service.ts).

import { createPasswordChangeClient } from '@/lib/shared/services/password-change.service';
import { api } from '@/lib/api/client';

export { PasswordChangeError } from '@/lib/shared/services/password-change.service';
export type { PasswordChangeCodeRequested } from '@/lib/shared/services/password-change.service';

const adminPasswordChange = createPasswordChangeClient({
  requestCode: '/api/admin/account/change-password/request-code',
  confirm: '/api/admin/account/change-password/confirm',
});

/** Phase 1: verify current/new password, email a 6-digit code to the admin. */
export const requestPasswordChangeCode = adminPasswordChange.requestCode;

/** Phase 2: verify the emailed code, then rotate the password. */
export const confirmPasswordChange = adminPasswordChange.confirm;

export async function uploadProfilePhoto(file: File): Promise<string> {
  const form = new FormData();
  form.set('photo', file);
  const response = await api.postForm<{ data: { profile_picture_url: string } }>('/api/admin/account/profile/photo', form);
  if (!response.data?.profile_picture_url) throw new Error('The server did not confirm the uploaded picture. Please retry.');
  return response.data.profile_picture_url;
}
