<?php

namespace App\Services;

use App\Enums\ShiftStatus;
use App\Models\ShiftLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class ShiftDeviceService
{
    public function assertCanOperate(
        ShiftLog $shift,
        ?string $deviceId,
        ?string $deviceType = null,
    ): void {
        if ($shift->operating_device_id === null) {
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
            abort(409, 'This shift is active on another device. Finish syncing and release that device before recording fares or remitting here.');
        }
    }

    public function claim(User $conductor, string $shiftId, string $deviceId, string $deviceType): ShiftLog
    {
        return DB::transaction(function () use ($conductor, $shiftId, $deviceId, $deviceType) {
            $shift = $this->ownedLockedShift($conductor, $shiftId);

            if ($shift->status !== ShiftStatus::ACTIVE || ! $shift->is_active) {
                abort(409, 'Only an active shift can claim an operating device.');
            }

            if ($shift->operating_device_id !== null
                && ! hash_equals($shift->operating_device_id, $deviceId)) {
                abort(409, 'Another device still owns this shift. Release it there before claiming this device.');
            }

            $shift->update([
                'operating_device_id' => $deviceId,
                'operating_device_type' => $deviceType,
                'operating_device_claimed_at' => $shift->operating_device_claimed_at ?? now(),
            ]);

            return $shift->fresh(['vehicle', 'driver', 'route']);
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

            return $shift->fresh(['vehicle', 'driver', 'route']);
        }, 3);
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
}
