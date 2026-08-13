<?php

namespace App\Console\Commands;

use App\Enums\ShiftStatus;
use App\Models\Setting;
use App\Models\ShiftLog;
use App\Services\ShiftCloseoutService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoEndStaleShifts extends Command
{
    protected $signature = 'shifts:auto-end-stale';

    protected $description = 'End active shifts that exceed the configured maximum duration';

    public function __construct(private ShiftCloseoutService $closeoutService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $maxHours = (int) (Setting::query()->where('key', 'max_shift_hours')->value('value') ?? 12);
        if ($maxHours < 1 || $maxHours > 48) {
            $this->error("Invalid max_shift_hours value: {$maxHours}. Expected 1-48.");

            return self::FAILURE;
        }

        $cutoff = now()->subHours($maxHours);
        $ended = 0;
        $failed = 0;

        ShiftLog::query()
            ->where('status', ShiftStatus::ACTIVE->value)
            ->where('time_in', '<=', $cutoff)
            ->orderBy('shift_id')
            ->chunkById(100, function ($shifts) use (&$ended, &$failed): void {
                foreach ($shifts as $shift) {
                    try {
                        $result = $this->closeoutService->close(
                            $shift->shift_id,
                            null,
                            ShiftCloseoutService::REASON_STALE,
                        );
                        if ($result->status === ShiftStatus::ENDED) {
                            $ended++;
                        }
                    } catch (\Throwable $error) {
                        $failed++;
                        Log::error('Stale shift closeout failed', [
                            'shift_id' => $shift->shift_id,
                            'exception' => $error::class,
                            'message' => $error->getMessage(),
                        ]);
                    }
                }
            }, 'shift_id', 'shift_id');

        $this->info("Stale shift closeout summary: ended={$ended}, failed={$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
