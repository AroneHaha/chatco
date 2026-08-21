<?php

namespace App\Services;

use App\Enums\ShiftStatus;
use App\Models\ShiftDeviceRecovery;
use App\Models\ShiftLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class ShiftDeviceService
{
    public function assertCanOperate(
        ShiftLog $shift,
        ?string $deviceId,
        ?string $deviceType = null,
    ): void {
        if ($shift->operating_device_id === null) {
            $this->assertDeviceWasNotRecovered($shift, $deviceId);

            // Compatibility for shifts that were already active when the
            // additive migration was deployed. A current client claims it on
            // its first write; legacy clients remain usable until upgraded.
            if ($deviceId !== null) {
                $shift->update([
                    'operating_device_id' => $deviceId,
                    'operating_device_type' => $deviceType,
                    'operating_device_claimed_at' => now(),
                ]);
            }

            return;
        }

        if ($deviceId === null || ! hash_equals($shift->operating_device_id, $deviceId)) {
            abort(409, 'This shift is active on another device. Finish syncing and release that device before performing shift actions here.');
        }
    }

    public function claim(User $conductor, string $shiftId, string $deviceId, string $deviceType): ShiftLog
    {
        return DB::transaction(function () use ($conductor, $shiftId, $deviceId, $deviceType) {
            $shift = $this->ownedLockedShift($conductor, $shiftId);

            if ($shift->status !== ShiftStatus::ACTIVE || ! $shift->is_active) {
                abort(409, 'Only an active shift can claim an operating device.');
            }

            $this->assertDeviceWasNotRecovered($shift, $deviceId);

            if ($shift->operating_device_id !== null
                && ! hash_equals($shift->operating_device_id, $deviceId)) {
                abort(409, 'Another device still owns this shift. Release it there before claiming this device.');
            }

            $shift->update([
                'operating_device_id' => $deviceId,
                'operating_device_type' => $deviceType,
                'operating_device_claimed_at' => $shift->operating_device_claimed_at ?? now(),
            ]);

            return $shift->fresh(['vehicle', 'driver', 'route', 'latestDeviceRecovery']);
        }, 3);
    }

    public function release(User $conductor, string $shiftId, string $deviceId): ShiftLog
    {
        return DB::transaction(function () use ($conductor, $shiftId, $deviceId) {
            $shift = $this->ownedLockedShift($conductor, $shiftId);

            if ($shift->status !== ShiftStatus::ACTIVE || ! $shift->is_active) {
                abort(409, 'Only an active shift can release its operating device.');
            }

            if ($shift->operating_device_id === null
                || ! hash_equals($shift->operating_device_id, $deviceId)) {
                abort(409, 'Only the current operating device can release this shift.');
            }

            $shift->update([
                'operating_device_id' => null,
                'operating_device_type' => null,
                'operating_device_claimed_at' => null,
            ]);

            return $shift->fresh(['vehicle', 'driver', 'route', 'latestDeviceRecovery']);
        }, 3);
    }

    /**
     * Emergency recovery for a genuinely lost/unavailable operating device.
     * This deliberately clears device ownership only. It never changes shift,
     * transaction, or remittance state because the missing device may still
     * contain cash transactions that have not reached the server.
     *
     * @return array{shift: ShiftLog, recovery: ShiftDeviceRecovery}
     */
    public function recover(User $admin, string $shiftId, string $reason): array
    {
        if (! $admin->isAdmin()) {
            abort(403, 'Forbidden');
        }

        $result = DB::transaction(function () use ($admin, $shiftId, $reason): array {
            $shift = ShiftLog::query()->whereKey($shiftId)->lockForUpdate()->firstOrFail();

            if ($shift->status !== ShiftStatus::ACTIVE || ! $shift->is_active) {
                abort(409, 'Only an active shift can recover an operating device.');
            }

            if ($shift->operating_device_id === null) {
                abort(409, 'This shift no longer has an operating device to recover.');
            }

            $recovery = ShiftDeviceRecovery::create([
                'shift_id' => $shift->shift_id,
                'recovered_by' => $admin->id,
                'previous_device_id' => $shift->operating_device_id,
                'previous_device_type' => $shift->operating_device_type,
                'previous_device_claimed_at' => $shift->operating_device_claimed_at,
                'reason' => trim($reason),
            ]);

            $shift->update([
                'operating_device_id' => null,
                'operating_device_type' => null,
                'operating_device_claimed_at' => null,
            ]);

            return [
                'shift' => $shift->fresh(['vehicle', 'driver', 'route', 'latestDeviceRecovery']),
                'recovery' => $recovery,
            ];
        }, 3);

        Log::warning('Admin recovered a shift from an unavailable operating device.', [
            'shift_id' => $shiftId,
            'admin_id' => $admin->id,
            'recovery_id' => $result['recovery']->id,
        ]);

        return $result;
    }

    private function ownedLockedShift(User $conductor, string $shiftId): ShiftLog
    {
        $shift = ShiftLog::query()->whereKey($shiftId)->lockForUpdate()->firstOrFail();
        if (! $conductor->conductorProfile
            || $shift->conductor_id !== $conductor->conductorProfile->id) {
            abort(403, 'Forbidden');
        }

        return $shift;
    }

    private function assertDeviceWasNotRecovered(ShiftLog $shift, ?string $deviceId): void
    {
        if ($deviceId === null) {
            return;
        }

        $wasAdministrativelyReleased = ShiftDeviceRecovery::query()
            ->where('shift_id', $shift->shift_id)
            ->where('previous_device_id', $deviceId)
            ->exists();

        if ($wasAdministrativelyReleased) {
            abort(409, 'An administrator released this device from the shift. Use a different device or ask the administrator to review the recovery.');
        }
    }
}
