<?php

namespace App\Services;

use App\Enums\HailStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ShiftStatus;
use App\Events\HailStatusChanged;
use App\Models\Driver;
use App\Models\Hail;
use App\Models\Remittance;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Models\Transaction;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The single financial and operational closeout path for manual, stale, and
 * midnight shift endings. Writers of shift transactions must lock the same
 * shift row before making a fare payable; this makes the totals below final.
 */
final class ShiftCloseoutService
{
    public const REASON_MANUAL = 'MANUAL';

    public const REASON_STALE = 'STALE';

    public const REASON_MIDNIGHT = 'MIDNIGHT';

    /**
     * End a shift and create its one authoritative remittance snapshot.
     *
     * A null remitted amount means nobody physically handed over cash. Such a
     * closeout creates a PENDING obligation when cash is owed. A numeric amount
     * represents an actual conductor remittance and produces a terminal result.
     */
    public function close(
        string $shiftId,
        ?float $remittedAmount,
        string $reason,
        ?string $expectedConductorId = null,
    ): ShiftLog {
        return DB::transaction(function () use ($shiftId, $remittedAmount, $reason, $expectedConductorId) {
            $shift = ShiftLog::query()
                ->where('shift_id', $shiftId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($expectedConductorId !== null && $shift->conductor_id !== $expectedConductorId) {
                abort(403, 'Forbidden');
            }

            $remittance = Remittance::query()
                ->where('shift_id', $shiftId)
                ->lockForUpdate()
                ->first();

            if ($shift->status !== ShiftStatus::ACTIVE) {
                if ($reason === self::REASON_MANUAL
                    && $remittance
                    && $remittance->remittance_status === Remittance::STATUS_PENDING) {
                    $this->completePendingRemittance($remittance, (float) $remittedAmount);

                    return $shift->fresh(['remittance']);
                }

                // Automatic closeout commands are deliberately idempotent.
                if ($reason !== self::REASON_MANUAL && $remittance) {
                    return $shift->fresh(['remittance']);
                }

                throw new HttpException(409, 'Shift has already ended.');
            }

            $vehicle = $shift->vehicle_id
                ? Vehicle::query()->whereKey($shift->vehicle_id)->lockForUpdate()->first()
                : null;
            $driver = $shift->driver_id
                ? Driver::query()->whereKey($shift->driver_id)->lockForUpdate()->first()
                : null;

            $totals = $this->totalsForLockedShift($shiftId);
            $timeOut = now();

            if (! $remittance) {
                $remittance = new Remittance(['shift_id' => $shiftId]);
            }

            $actual = round(max(0, (float) ($remittedAmount ?? 0)), 2);
            $expected = $totals['cash_total'];
            $shortage = round(max(0, $expected - $actual), 2);
            $overage = round(max(0, $actual - $expected), 2);
            $wasPhysicallySubmitted = $remittedAmount !== null;
            $status = $wasPhysicallySubmitted
                ? ($shortage > 0 ? Remittance::STATUS_SHORTAGE
                    : ($overage > 0 ? Remittance::STATUS_OVERAGE : Remittance::STATUS_COMPLETE))
                : ($expected > 0 ? Remittance::STATUS_PENDING : Remittance::STATUS_COMPLETE);

            $remittance->fill([
                'conductor_id' => $shift->conductor_id,
                'driver_id' => $shift->driver_id,
                'vehicle_id' => $shift->vehicle_id,
                'date' => $shift->time_in->toDateString(),
                'conductor_name' => $shift->conductor_name,
                'driver_name' => $shift->driver_name,
                'unit_number' => $shift->unit_number,
                'total_passengers' => $totals['total_passengers'],
                'time_in' => $shift->time_in,
                'time_out' => $timeOut,
                // Expected system cash and actual physically submitted cash.
                'total_collected' => $expected,
                'remitted_amount' => $actual,
                'shortage' => $shortage,
                'overage' => $overage,
                'cash_total' => $expected,
                'gcash_total' => $totals['gcash_total'],
                'remittance_status' => $status,
                'remittance_due_at' => $status === Remittance::STATUS_PENDING
                    ? $timeOut->copy()->addMinutes($this->remittanceGraceMinutes())
                    : null,
                'remitted_at' => $status === Remittance::STATUS_PENDING ? null : $timeOut,
            ]);
            $remittance->save();

            $shift->update([
                'status' => ShiftStatus::ENDED->value,
                'is_active' => false,
                'time_out' => $timeOut,
            ]);

            if ($vehicle && $vehicle->active_shift_id === $shiftId) {
                $vehicle->update([
                    'active_shift_id' => null,
                    'driver_id' => null,
                    'conductor_id' => null,
                    'assignment_date' => null,
                    'assignment_approved_at' => null,
                ]);

                // vehicle_locations contains the live snapshot, not history.
                VehicleLocation::query()->where('vehicle_id', $vehicle->id)->delete();
            }

            if ($driver && $driver->active_shift_id === $shiftId) {
                $driver->update(['active_shift_id' => null]);
            }

            $this->cancelOpenHailsAfterCommit($shift);

            return $shift->fresh(['vehicle', 'driver', 'route', 'remittance']);
        }, 3);
    }

    /** Lock and recheck a shift before a transaction writer inserts a fare. */
    public function lockActiveShift(string $shiftId): ShiftLog
    {
        $shift = ShiftLog::query()
            ->where('shift_id', $shiftId)
            ->lockForUpdate()
            ->first();

        if (! $shift || $shift->status !== ShiftStatus::ACTIVE || ! $shift->is_active) {
            abort(409, 'The shift has already ended; no new transaction can be recorded.');
        }

        return $shift;
    }

    /** Refresh record-only GCash totals after a legitimate late settlement. */
    public function refreshEndedShiftRemittance(string $shiftId): void
    {
        $shift = ShiftLog::query()->where('shift_id', $shiftId)->first();
        if (! $shift || $shift->status === ShiftStatus::ACTIVE) {
            return;
        }

        $remittance = Remittance::query()->where('shift_id', $shiftId)->lockForUpdate()->first();
        if (! $remittance) {
            return;
        }

        $totals = $this->totalsForLockedShift($shiftId);
        $remittance->update([
            'gcash_total' => $totals['gcash_total'],
            'total_passengers' => $totals['total_passengers'],
        ]);
    }

    /** @return array{cash_total: float, gcash_total: float, total_passengers: int} */
    private function totalsForLockedShift(string $shiftId): array
    {
        $paid = Transaction::query()
            ->where('shift_id', $shiftId)
            ->where('status', PaymentStatus::PAID->value);

        $cashTotal = (float) (clone $paid)
            ->where('payment_method', PaymentMethod::CASH->value)
            ->sum('final_amount');
        $gcashTotal = (float) (clone $paid)
            ->where('payment_method', PaymentMethod::GCASH->value)
            ->sum('final_amount');

        // Normalized groups have one transaction row per passenger, even
        // though each legacy total_passengers field repeats the group size.
        // Legacy non-group rows retain their explicit passenger total.
        $passengerExpression = <<<'SQL'
COALESCE(SUM(CASE
    WHEN group_id IS NOT NULL THEN 1
    WHEN total_passengers IS NULL OR total_passengers < 1 THEN 1
    ELSE total_passengers
END), 0)
SQL;

        $totalPassengers = (int) (clone $paid)->selectRaw("{$passengerExpression} AS aggregate")->value('aggregate');

        return [
            'cash_total' => round($cashTotal, 2),
            'gcash_total' => round($gcashTotal, 2),
            'total_passengers' => $totalPassengers,
        ];
    }

    private function completePendingRemittance(Remittance $remittance, float $remittedAmount): void
    {
        $expected = (float) $remittance->cash_total;
        $actual = round(max(0, $remittedAmount), 2);
        $shortage = round(max(0, $expected - $actual), 2);
        $overage = round(max(0, $actual - $expected), 2);

        $remittance->update([
            'total_collected' => $expected,
            'remitted_amount' => $actual,
            'shortage' => $shortage,
            'overage' => $overage,
            'remittance_status' => $shortage > 0
                ? Remittance::STATUS_SHORTAGE
                : ($overage > 0 ? Remittance::STATUS_OVERAGE : Remittance::STATUS_COMPLETE),
            'remitted_at' => now(),
        ]);
    }

    private function remittanceGraceMinutes(): int
    {
        $value = (int) (Setting::query()->where('key', 'remittance_grace_minutes')->value('value') ?? 30);

        return max(1, min($value, 1440));
    }

    private function cancelOpenHailsAfterCommit(ShiftLog $shift): void
    {
        $hails = Hail::query()
            ->where('vehicle_id', $shift->vehicle_id)
            ->whereIn('status', [HailStatus::PENDING->value, HailStatus::ACCEPTED->value])
            ->lockForUpdate()
            ->get();

        if ($hails->isEmpty()) {
            return;
        }

        Hail::query()
            ->whereIn('id', $hails->pluck('id'))
            ->whereIn('status', [HailStatus::PENDING->value, HailStatus::ACCEPTED->value])
            ->update(['status' => HailStatus::CANCELLED->value]);

        $hailIds = $hails->pluck('id')->all();
        DB::afterCommit(function () use ($hailIds): void {
            Hail::query()->whereIn('id', $hailIds)->get()->each(
                fn (Hail $hail) => broadcast(new HailStatusChanged($hail))
            );
        });
    }
}
