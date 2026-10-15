<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The original renewal migration may already have run before general
        // discount applications were introduced. Upgrade it without replacing rows.
        if (! Schema::hasColumn('discount_applications', 'requested_type')) {
            Schema::table('discount_applications', function (Blueprint $table) {
                $table->string('requested_type', 20)->default('STUDENT');
            });
        }

        $columns = collect(Schema::getColumns('discount_applications'))->keyBy('name');
        Schema::table('discount_applications', function (Blueprint $table) use ($columns) {
            if (! $columns['cycle_year']['nullable']) {
                $table->unsignedSmallInteger('cycle_year')->nullable()->change();
            }
            foreach (['document_path' => 500, 'document_mime' => 100, 'school_name' => 150,
                'education_level' => 20, 'school_year' => 20] as $name => $length) {
                if (! $columns[$name]['nullable']) {
                    $table->string($name, $length)->nullable()->change();
                }
            }
        });

        $hasEquivalentIndex = collect(Schema::getIndexes('discount_applications'))
            ->contains(fn (array $index) => $index['columns'] === ['commuter_id', 'request_type', 'submitted_at']);
        if (! $hasEquivalentIndex) {
            Schema::table('discount_applications', function (Blueprint $table) {
                $table->index(['commuter_id', 'request_type', 'submitted_at'], 'discount_owner_requests');
            });
        }
    }

    public function down(): void
    {
        // Intentionally retain additive compatibility: restoring NOT NULL or
        // deleting requested_type would invalidate or destroy newer applications.
        // The original create migration still owns full table removal on rollback.
    }
};
