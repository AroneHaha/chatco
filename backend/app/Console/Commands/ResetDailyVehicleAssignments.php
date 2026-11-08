<?php

namespace App\Console\Commands;

use App\Services\DailyAssignmentResetService;
use Illuminate\Console\Command;

class ResetDailyVehicleAssignments extends Command
{
    protected $signature = 'vehicles:reset-daily-assignments';

    protected $description = 'Safely close previous-day shifts and clear only previous-day fleet assignments';

    public function __construct(private DailyAssignmentResetService $resetService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $result = $this->resetService->reset();

        $this->info("Midnight reset summary: closed={$result['closed']}, cleared={$result['cleared']}, failed={$result['failed']}.");

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
