<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Remittance>
 *
 * Per Sprint 2 Handoff Brief:
 *   "RemittanceFactory — must populate shift_id, total_collected,
 *    remitted_amount, shortage"
 *
 * The remittances table gained shift_id, total_collected, remitted_amount,
 * shortage, and remittance_status columns in the Sprint 2 migration
 * 2026_06_16_000005_add_shift_fields_to_remittances_table. The factory
 * populates all of them so tests can create remittances without hitting
 * NOT NULL constraint violations.
 */
class RemittanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $totalCollected = fake()->randomFloat(2, 1000, 10000);
        $remittedAmount = $totalCollected; // complete by default — no shortage
        $shortage = max(0, $totalCollected - $remittedAmount);

        return [
            'shift_id' => null,
            'conductor_id' => null,
            'driver_id' => null,
            'vehicle_id' => null,
            'total_collected' => $totalCollected,
            'remitted_amount' => $remittedAmount,
            'shortage' => $shortage,
            'remittance_status' => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
        ];
    }
}
