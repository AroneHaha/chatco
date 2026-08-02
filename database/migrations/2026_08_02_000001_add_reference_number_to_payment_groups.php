<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_groups', function (Blueprint $table) {
            $table->string('reference_number', 32)->nullable()->unique()->after('id');
        });

        DB::table('payment_groups')->orderBy('created_at')->each(function ($group): void {
            DB::table('payment_groups')->where('id', $group->id)->update([
                'reference_number' => 'MP-'.strtoupper(substr(str_replace('-', '', $group->id), 0, 12)),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('payment_groups', function (Blueprint $table) {
            $table->dropUnique(['reference_number']);
            $table->dropColumn('reference_number');
        });
    }
};
