<?php

namespace Database\Seeders;

use App\Models\Remittance;
use App\Models\ShiftLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * RemittanceSeeder — one remittance per ENDED shift.
 *
 * Totals are computed the SAME way the app does at end-of-day
 * (ShiftService::endShift): summed straight from the shift's PAID
 * transactions, so the seeded Remittance rows reconcile exactly with the
 * fares in the Receipts / detail views.
 *
 *   cash_total       = Σ PAID CASH  final_amount
 *   gcash_total      = Σ PAID GCASH final_amount
 *   total_passengers = count of PAID transactions
 *   total_collected  = cash + gcash
 *
 * A couple of shifts are given a deliberate cash shortage (remitted < cash)
 * so the SHORTAGE status/badge path is populated too.
 *
 * ACTIVE shifts are intentionally skipped — they show up as "Pending" in the
 * tracker (computed live) and only become a Remittance row at end-of-day.
 *
 * Depends on: shift logs + transactions existing.
 * Run alone with:  php artisan db:seed --class=RemittanceSeeder
 */
class RemittanceSeeder extends Seeder
{
    public function run(): void
    {
        $endedShifts = ShiftLog::where('status', 'ENDED')->orderBy('time_in')->get();

        if ($endedShifts->isEmpty()) {
            $this->command?->warn('RemittanceSeeder skipped — no ended shifts found.');
            return;
        }

        $created = 0;

        foreach ($endedShifts as $i => $shift) {
            $cashTotal = (float) DB::table('transactions')
                ->where('shift_id', $shift->shift_id)
                ->where('payment_method', 'CASH')
                ->where('status', 'PAID')
                ->sum('final_amount');

            $gcashTotal = (float) DB::table('transactions')
                ->where('shift_id', $shift->shift_id)
                ->where('payment_method', 'GCASH')
                ->where('status', 'PAID')
                ->sum('final_amount');

            $totalPassengers = (int) DB::table('transactions')
                ->where('shift_id', $shift->shift_id)
                ->where('status', 'PAID')
                ->count();

            $totalCollected = $cashTotal + $gcashTotal;

            // Give every 4th shift a small shortage so the SHORTAGE path shows.
            $hasShortage = $cashTotal > 0 && $i % 4 === 3;
            $remittedAmount = $hasShortage
                ? round($totalCollected - min($cashTotal, 20), 2)
                : $totalCollected;
            $shortage = max(0, round($totalCollected - $remittedAmount, 2));

            Remittance::create([
                'shift_id'          => $shift->shift_id,
                'conductor_id'      => $shift->conductor_id,
                'driver_id'         => $shift->driver_id,
                'vehicle_id'        => $shift->vehicle_id,
                'date'              => $shift->time_in->toDateString(),
                'conductor_name'    => $shift->conductor_name,
                'driver_name'       => $shift->driver_name,
                'unit_number'       => $shift->unit_number,
                'total_passengers'  => $totalPassengers,
                'time_in'           => $shift->time_in,
                'time_out'          => $shift->time_out,
                'total_collected'   => $totalCollected,
                'remitted_amount'   => $remittedAmount,
                'shortage'          => $shortage,
                'cash_total'        => $cashTotal,
                'gcash_total'       => $gcashTotal,
                'remittance_status' => $shortage > 0 ? 'SHORTAGE' : 'COMPLETE',
            ]);

            $created++;
        }

        $this->command?->info("Seeded {$created} remittances (from ended shifts).");
    }
}
