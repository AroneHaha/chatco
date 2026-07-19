<?php

namespace Database\Seeders;

use App\Models\CommuterProfile;
use App\Models\FarePoint;
use App\Models\ShiftLog;
use App\Models\Transaction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * TransactionSeeder — individual fares (the rows behind Receipts, and the
 * numbers Remittance totals are computed from).
 *
 * For every shift it generates a handful of fares with a realistic mix:
 *   - CASH   → always PAID (cash is recorded immediately), no passenger bound.
 *   - GCASH  → a spread of PAID / PENDING / EXPIRED / FAILED so the Receipts
 *              status column shows every badge; bound to a commuter.
 *   - VOUCHER→ free reward ride, ₱0.00, PAID, bound to a commuter.
 *
 * Only PAID fares count toward earnings/remittance — the non-PAID ones exist
 * on purpose so the UI is tested against attempts that never collected money.
 *
 * Depends on: shift logs, fare points, and commuters existing.
 * Run alone with:  php artisan db:seed --class=TransactionSeeder
 */
class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        $shifts     = ShiftLog::orderBy('time_in')->get();
        $farePoints = FarePoint::orderBy('point_number')->get();
        $commuters  = CommuterProfile::all();

        if ($shifts->isEmpty() || $farePoints->count() < 2) {
            $this->command?->warn('TransactionSeeder skipped — shift logs and fare points must be seeded first.');
            return;
        }

        // GCash outcome distribution (weighted toward success).
        $gcashOutcomes = ['PAID', 'PAID', 'PAID', 'PAID', 'PENDING', 'EXPIRED', 'FAILED'];
        $total = 0;

        foreach ($shifts as $shift) {
            $isActive = $shift->status?->value === 'ACTIVE' || $shift->is_active;
            $count = $isActive ? random_int(2, 5) : random_int(5, 12);

            $start = $shift->time_in->copy();
            $end   = $shift->time_out ? $shift->time_out->copy() : now();
            $span  = max(1, $start->diffInMinutes($end));

            for ($n = 0; $n < $count; $n++) {
                // Pick a pickup + a later dropoff.
                $pickIdx = random_int(0, $farePoints->count() - 2);
                $dropIdx = random_int($pickIdx + 1, $farePoints->count() - 1);
                $pickup  = $farePoints[$pickIdx];
                $dropoff = $farePoints[$dropIdx];

                // Decide the payment method: ~60% cash, ~30% gcash, ~10% voucher.
                $roll = random_int(1, 100);
                $method = $roll <= 60 ? 'CASH' : ($roll <= 90 ? 'GCASH' : 'VOUCHER');

                // Bind a commuter for cashless fares; cash is anonymous.
                $commuter = $method === 'CASH' ? null : $commuters->random();
                $tier = $commuter?->commuter_type ?? 'REGULAR';
                $discounted = in_array($tier, ['STUDENT', 'SENIOR', 'PWD'], true);

                if ($method === 'VOUCHER') {
                    $fare = 0.00;
                    $status = 'PAID';
                } else {
                    $fare = (float) ($discounted ? $dropoff->discounted_fare : $dropoff->regular_fare);
                    $status = $method === 'CASH' ? 'PAID' : $gcashOutcomes[array_rand($gcashOutcomes)];
                }

                $createdAt = $start->copy()->addMinutes((int) round($span * ($n + 1) / ($count + 1)));
                $paidAt = $status === 'PAID' ? $createdAt : null;

                $txn = new Transaction();
                $txn->fill([
                    'transaction_id'  => 'TXN-' . strtoupper(Str::random(15)),
                    'shift_id'        => $shift->shift_id,
                    'payment_method'  => $method,
                    'final_amount'    => $fare,
                    'passenger_id'    => $commuter?->id,
                    'passenger_name'  => $commuter
                        ? trim("{$commuter->first_name} {$commuter->surname}")
                        : 'Cash Passenger',
                    'passenger_role'  => $commuter ? $tier : null,
                    'pickup_stop_id'  => $pickup->id,
                    'dropoff_stop_id' => $dropoff->id,
                    'pickup_name'     => $pickup->name,
                    'dropoff_name'    => $dropoff->name,
                    'conductor_name'  => $shift->conductor_name,
                    'unit_number'     => $shift->unit_number,
                    'driver_name'     => $shift->driver_name,
                    'status'          => $status,
                    'paid_at'         => $paidAt,
                ]);
                // created_at/updated_at are guarded — set them directly so the
                // fare lands inside its shift window (drives date filters/charts).
                $txn->created_at = $createdAt;
                $txn->updated_at = $createdAt;
                $txn->save();

                $total++;
            }
        }

        $this->command?->info("Seeded {$total} transactions across {$shifts->count()} shifts.");
    }
}
