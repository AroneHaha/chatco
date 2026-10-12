<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const BACKUP_KEY = 'fare_adjustment_2026_10_13_backup';

    private const FARE_SETTINGS = [
        'base_fare_regular' => '17.00',
        'base_fare_discounted' => '13.60',
        'succeeding_fare_discounted' => '1.80',
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $points = DB::table('fare_points')->get(['id', 'regular_fare', 'discounted_fare']);
            $settings = DB::table('settings')->whereIn('key', array_keys(self::FARE_SETTINGS))->get();

            // Retain the exact previous amounts so rollback also restores rounded discounts.
            DB::table('settings')->insert([
                'id' => (string) Str::uuid(),
                'key' => self::BACKUP_KEY,
                'value' => json_encode(['points' => $points, 'settings' => $settings], JSON_THROW_ON_ERROR),
                'category' => 'general',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($points as $point) {
                $regularFare = round((float) $point->regular_fare + 2.00, 2);
                DB::table('fare_points')->where('id', $point->id)->update([
                    'regular_fare' => $regularFare,
                    'discounted_fare' => round($regularFare * 0.80, 2),
                ]);
            }

            foreach (self::FARE_SETTINGS as $key => $value) {
                DB::table('settings')->upsert([[
                    'id' => (string) Str::uuid(),
                    'key' => $key,
                    'value' => $value,
                    'category' => 'financial',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]], ['key'], ['value', 'updated_at']);
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            $backup = DB::table('settings')->where('key', self::BACKUP_KEY)->value('value');
            if ($backup === null) {
                return;
            }

            $previous = json_decode($backup, true, 512, JSON_THROW_ON_ERROR);
            foreach ($previous['points'] as $point) {
                DB::table('fare_points')->where('id', $point['id'])->update([
                    'regular_fare' => $point['regular_fare'],
                    'discounted_fare' => $point['discounted_fare'],
                ]);
            }

            DB::table('settings')->whereIn('key', array_keys(self::FARE_SETTINGS))->delete();
            if ($previous['settings'] !== []) {
                DB::table('settings')->insert($previous['settings']);
            }
            DB::table('settings')->where('key', self::BACKUP_KEY)->delete();
        });
    }
};
