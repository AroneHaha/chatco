<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Sprint 6 (S6-T12 follow-up) — terminated_personnel table.
     *
     * When an admin removes a driver or conductor via the Fleet Management
     * "Remove Personnel" flow, the modal captures a reason + termination
     * type (Terminated vs Resigned). We persist that metadata here BEFORE
     * soft-deleting the underlying driver/user row, so the Records & History
     * tab can list separated personnel with their termination context.
     *
     * The personnel_id column points at the ORIGINAL driver.id or user.id
     * (conductor_profile.id is the shared PK with users.id). We denormalize
     * name/role/contact/last_vehicle at termination time so the history
     * record is immutable — even if the soft-deleted row is later purged,
     * the terminated_personnel record still tells the full story.
     */
    public function up(): void
    {
        Schema::create('terminated_personnel', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('personnel_id')->index();
            $table->string('personnel_type', 20)->comment('DRIVER or CONDUCTOR');
            $table->string('name');
            $table->string('role', 20)->comment('Driver or Conductor');
            $table->string('contact')->nullable();
            $table->text('reason');
            $table->string('termination_type', 20)->comment('TERMINATED or RESIGNED');
            $table->date('terminated_date');
            $table->string('last_vehicle')->nullable()->comment('Unit number / plate of last assigned vehicle');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terminated_personnel');
    }
};
