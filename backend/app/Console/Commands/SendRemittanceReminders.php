<?php

namespace App\Console\Commands;

use App\Models\Remittance;
use App\Models\Setting;
use App\Services\AnnouncementService;
use App\Support\MessageTemplates;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendRemittanceReminders extends Command
{
    protected $signature = 'remittances:send-reminders';

    protected $description = 'Send due in-app reminders for unresolved remittance obligations';

    public function __construct(private AnnouncementService $announcements)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $interval = (int) (Setting::query()
            ->where('key', 'remittance_reminder_interval_minutes')
            ->value('value') ?? 60);

        if ($interval < 5 || $interval > 10080) {
            $this->error("Invalid remittance_reminder_interval_minutes: {$interval}. Expected 5-10080.");

            return self::FAILURE;
        }

        $sent = 0;
        $failed = 0;
        $reminderCutoff = now()->subMinutes($interval);
        // Admin-editable wording (Settings > Notifications), read once per run.
        $template = MessageTemplates::get('remittance_reminder_template');

        Remittance::query()
            ->where('remittance_status', Remittance::STATUS_PENDING)
            ->whereNotNull('remittance_due_at')
            ->where('remittance_due_at', '<=', now())
            ->where(function ($query) use ($reminderCutoff): void {
                $query->whereNull('last_reminder_at')
                    ->orWhere('last_reminder_at', '<=', $reminderCutoff);
            })
            ->orderBy('shift_id')
            ->chunkById(100, function ($candidates) use ($interval, $template, &$sent, &$failed): void {
                foreach ($candidates as $candidate) {
                    try {
                        $created = DB::transaction(function () use ($candidate, $interval, $template): bool {
                            $remittance = Remittance::query()
                                ->where('shift_id', $candidate->shift_id)
                                ->lockForUpdate()
                                ->first();

                            if (! $remittance
                                || $remittance->remittance_status !== Remittance::STATUS_PENDING
                                || ! $remittance->remittance_due_at?->isPast()) {
                                return false;
                            }

                            if ($remittance->last_reminder_at
                                && $remittance->last_reminder_at->gt(now()->subMinutes($interval))) {
                                return false;
                            }

                            $this->announcements->notifyUser(
                                $remittance->conductor_id,
                                'REMITTANCE_REMINDER',
                                sprintf('Remittance pending: PHP %.2f', (float) $remittance->cash_total),
                                MessageTemplates::render($template, [
                                    'conductor_name' => $remittance->conductor_name,
                                    'shift_id' => $remittance->shift_id,
                                    'unit_number' => $remittance->unit_number,
                                    'amount' => sprintf('%.2f', (float) $remittance->cash_total),
                                ]),
                                $remittance->shift_id,
                            );

                            $overdueMinutes = max(1, (int) $remittance->remittance_due_at->diffInMinutes(now()));
                            $this->announcements->notifyAdmins(
                                'REMITTANCE_OVERDUE',
                                "Overdue remittance: unit {$remittance->unit_number}",
                                sprintf(
                                    '%s on unit %s has PHP %.2f awaiting remittance (%d minutes overdue).',
                                    $remittance->conductor_name,
                                    $remittance->unit_number,
                                    max(0, (float) $remittance->cash_total - (float) $remittance->remitted_amount),
                                    $overdueMinutes,
                                ),
                                $remittance->shift_id,
                            );

                            $remittance->update([
                                'last_reminder_at' => now(),
                                'reminder_count' => $remittance->reminder_count + 1,
                            ]);

                            return true;
                        }, 3);

                        if ($created) {
                            $sent++;
                        }
                    } catch (\Throwable $error) {
                        $failed++;
                        Log::error('Remittance reminder failed', [
                            'shift_id' => $candidate->shift_id,
                            'exception' => $error::class,
                            'message' => $error->getMessage(),
                        ]);
                    }
                }
            }, 'shift_id', 'shift_id');

        $this->info("Remittance reminder summary: sent={$sent}, failed={$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
