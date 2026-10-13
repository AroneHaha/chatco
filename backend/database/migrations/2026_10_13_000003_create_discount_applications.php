<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->timestamp('student_discount_expires_at')->nullable();
            $table->timestamp('renewal_reminder_snoozed_until')->nullable();
            $table->unsignedSmallInteger('renewal_reminder_dismissed_cycle')->nullable();
            $table->index(['commuter_type', 'student_discount_expires_at'], 'student_renewal_due');
        });
        DB::table('commuter_profiles')->where('commuter_type', 'STUDENT')->update([
            'student_discount_expires_at' => config('registration.student_renewal_first_year', 2027).'-10-01 00:00:00',
        ]);
        Schema::create('discount_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commuter_id')->constrained('commuter_profiles')->cascadeOnDelete();
            $table->string('request_type', 20)->default('RENEWAL');
            $table->unsignedSmallInteger('cycle_year');
            $table->unsignedInteger('revision')->default(1);
            $table->string('status', 30)->default('PENDING');
            $table->string('document_path', 500);
            $table->string('document_mime', 100);
            $table->json('submission_history')->nullable();
            $table->string('school_name', 150);
            $table->string('education_level', 20);
            $table->unsignedTinyInteger('grade_level')->nullable();
            $table->string('school_year', 20);
            $table->string('enrollment_term', 50)->nullable();
            $table->timestamp('submitted_at');
            $table->timestamp('first_submitted_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 500)->nullable();
            $table->timestamp('correction_due_at')->nullable();
            $table->timestamps();
            $table->unique(['commuter_id', 'cycle_year']);
            $table->index(['status', 'submitted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_applications');
        Schema::table('commuter_profiles', function (Blueprint $table) {
            $table->dropIndex('student_renewal_due');
            $table->dropColumn(['student_discount_expires_at', 'renewal_reminder_snoozed_until', 'renewal_reminder_dismissed_cycle']);
        });
    }
};
