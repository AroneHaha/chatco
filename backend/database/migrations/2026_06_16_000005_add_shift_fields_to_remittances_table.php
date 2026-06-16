<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The remittances table was created in Sprint 1 with transaction_id
     * and conductor_profile_id. Sprint 2 shifts change the remittance model:
     * - A remittance is now tied to a shift (not just a single transaction)
     * - It tracks total_collected vs remitted_amount vs shortage
     */
    public function up(): void
    {
        Schema::table('remittances', function (Blueprint $table) {
            if (! Schema::hasColumn('remittances', 'shift_id')) {
                $table->string('shift_id', 20)->nullable()->after('id');
            }

            if (! Schema::hasColumn('remittances', 'conductor_id')) {
                $table->uuid('conductor_id')->nullable()->after('shift_id');
            }

            if (! Schema::hasColumn('remittances', 'driver_id')) {
                $table->uuid('driver_id')->nullable()->after('conductor_id');
            }

            if (! Schema::hasColumn('remittances', 'vehicle_id')) {
                $table->uuid('vehicle_id')->nullable()->after('driver_id');
            }

            if (! Schema::hasColumn('remittances', 'total_collected')) {
                $table->decimal('total_collected', 10, 2)->default(0)->after('vehicle_id');
            }

            if (! Schema::hasColumn('remittances', 'remitted_amount')) {
                $table->decimal('remitted_amount', 10, 2)->default(0)->after('total_collected');
            }

            if (! Schema::hasColumn('remittances', 'shortage')) {
                $table->decimal('shortage', 10, 2)->default(0)->after('remitted_amount');
            }

            if (! Schema::hasColumn('remittances', 'remittance_status')) {
                $table->string('remittance_status', 20)->default('PENDING')->after('shortage');
            }
        });

        // Add FK for shift_id if not exists
        $fkExists = collect(DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'remittances'
              AND CONSTRAINT_NAME = 'remittances_shift_id_foreign'
        "))->isNotEmpty();

        if (! $fkExists && Schema::hasColumn('remittances', 'shift_id')) {
            Schema::table('remittances', function (Blueprint $table) {
                $table->foreign('shift_id')
                    ->references('shift_id')
                    ->on('shift_logs')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $fkExists = collect(DB::select("
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'remittances'
              AND CONSTRAINT_NAME = 'remittances_shift_id_foreign'
        "))->isNotEmpty();

        if ($fkExists) {
            Schema::table('remittances', function (Blueprint $table) {
                $table->dropForeign('remittances_shift_id_foreign');
            });
        }

        Schema::table('remittances', function (Blueprint $table) {
            $columns = ['shift_id', 'conductor_id', 'driver_id', 'vehicle_id', 'total_collected', 'remitted_amount', 'shortage', 'remittance_status'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('remittances', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};