<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->date('assignment_date')->nullable()->after('active_shift_id')->index();
            $table->timestamp('assignment_approved_at')->nullable()->after('assignment_date');
        });

        // Treat every complete assignment already visible in Admin Fleet as
        // approved for the deployment day. This avoids forcing idle crews to
        // be reassigned immediately after the additive migration.
        DB::table('vehicles')
            ->whereNotNull('driver_id')
            ->whereNotNull('conductor_id')
            ->update([
                'assignment_date' => now()->toDateString(),
                'assignment_approved_at' => now(),
            ]);

        Schema::table('remittances', function (Blueprint $table) {
            $table->decimal('overage', 10, 2)->default(0)->after('shortage');
            $table->timestamp('remittance_due_at')->nullable()->after('remittance_status');
            $table->timestamp('last_reminder_at')->nullable()->after('remittance_due_at');
            $table->unsignedInteger('reminder_count')->default(0)->after('last_reminder_at');
            $table->timestamp('remitted_at')->nullable()->after('reminder_count');
            $table->index(
                ['remittance_status', 'remittance_due_at', 'last_reminder_at'],
                'remittances_reminder_due_index'
            );
        });

        // Existing rows represented completed historical submissions. They
        // must never begin generating reminders after deployment.
        DB::table('remittances')
            ->whereNull('remitted_at')
            ->whereIn('remittance_status', ['COMPLETE', 'SHORTAGE', 'OVERAGE', 'Remitted'])
            ->update(['remitted_at' => DB::raw('COALESCE(time_out, updated_at, created_at)')]);
    }

    public function down(): void
    {
        Schema::table('remittances', function (Blueprint $table) {
            $table->dropIndex('remittances_reminder_due_index');
            $table->dropColumn([
                'overage',
                'remittance_due_at',
                'last_reminder_at',
                'reminder_count',
                'remitted_at',
            ]);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropIndex(['assignment_date']);
            $table->dropColumn(['assignment_date', 'assignment_approved_at']);
        });
    }
};
