<?php

namespace App\Console\Commands;

use App\Enums\ShiftStatus;
use App\Models\ShiftLog;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\ShiftCloseoutService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResetDailyVehicleAssignments extends Command
{
    protected $signature = 'vehicles:reset-daily-assignments';

    protected $description = 'Safely close previous-day shifts and clear only previous-day fleet assignments';

    public function __construct(private ShiftCloseoutService $closeoutService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dayStart = now('Asia/Manila')->startOfDay();
        $closed = 0;
        $failed = 0;
        $cleared = 0;

        ShiftLog::query()
            ->where('status', ShiftStatus::ACTIVE->value)
            ->where('time_in', '<', $dayStart)
            ->orderBy('shift_id')
            ->chunkById(100, function ($shifts) use (&$closed, &$failed): void {
                foreach ($shifts as $shift) {
                    try {
                        $result = $this->closeoutService->close(
                            $shift->shift_id,
                            null,
                            ShiftCloseoutService::REASON_MIDNIGHT,
                        );
                        if ($result->status === ShiftStatus::ENDED) {
                            $closed++;
                        }
                    } catch (\Throwable $error) {
                        $failed++;
                        Log::error('Midnight shift closeout failed', [
                            'shift_id' => $shift->shift_id,
                            'exception' => $error::class,
                            'message' => $error->getMessage(),
                        ]);
                    }
                }
            }, 'shift_id', 'shift_id');

        Vehicle::query()
            ->whereNull('active_shift_id')
            ->where(function ($query) use ($dayStart): void {
                $query->whereNull('assignment_date')
                    ->orWhere('assignment_date', '<', $dayStart->toDateString());
            })
            ->orderBy('id')
            ->chunkById(100, function ($vehicles) use (&$cleared): void {
                foreach ($vehicles as $candidate) {
                    DB::transaction(function () use ($candidate, &$cleared): void {
                        $vehicle = Vehicle::query()->whereKey($candidate->id)->lockForUpdate()->first();
                        if (! $vehicle || $vehicle->active_shift_id !== null) {
                            return;
                        }

                        $today = now('Asia/Manila')->toDateString();
                        if ($vehicle->assignment_date?->toDateString() === $today) {
                            return;
                        }

                        $vehicle->update([
                            'driver_id' => null,
                            'conductor_id' => null,
                            'assignment_date' => null,
                            'assignment_approved_at' => null,
                        ]);
                        VehicleLocation::query()->where('vehicle_id', $vehicle->id)->delete();
                        $cleared++;
                    }, 3);
                }
            });

        $this->info("Midnight reset summary: closed={$closed}, cleared={$cleared}, failed={$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
