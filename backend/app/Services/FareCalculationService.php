<?php

namespace App\Services;

use App\Enums\PassengerType;
use App\Models\FarePoint;
use App\Models\Setting;

class FareCalculationService
{
    public function calculate(string $pickupId, string $dropoffId, array $passengers): array
    {
        $pickup = FarePoint::findOrFail($pickupId);
        $dropoff = FarePoint::findOrFail($dropoffId);

        if ($pickup->route_id !== $dropoff->route_id) {
            abort(422, 'Pickup and drop-off must belong to the same route.');
        }

        $regularFare = $this->fareBetween($pickup, $dropoff, false);
        $discountedFare = $this->fareBetween($pickup, $dropoff, true);
        $lines = [];
        $totalPassengers = 0;
        $grossAmount = 0.0;
        $discountAmount = 0.0;

        foreach ($this->normalizePassengers($passengers) as $typeValue => $quantity) {
            $type = PassengerType::from($typeValue);
            $unitDiscount = $type->isDiscounted() ? round($regularFare - $discountedFare, 2) : 0.0;
            $unitPayable = round($regularFare - $unitDiscount, 2);
            $subtotal = round($unitPayable * $quantity, 2);

            $lines[] = [
                'passenger_type' => $type->value,
                'quantity' => $quantity,
                'unit_fare' => $regularFare,
                'unit_discount_amount' => $unitDiscount,
                'subtotal' => $subtotal,
            ];
            $totalPassengers += $quantity;
            $grossAmount += $regularFare * $quantity;
            $discountAmount += $unitDiscount * $quantity;
        }

        if ($totalPassengers < 1 || $totalPassengers > 50) {
            abort(422, 'Total passengers must be between 1 and 50.');
        }

        return [
            'pickup' => $pickup,
            'dropoff' => $dropoff,
            'lines' => $lines,
            'total_passengers' => $totalPassengers,
            'gross_amount' => round($grossAmount, 2),
            'discount_amount' => round($discountAmount, 2),
            'final_amount' => round($grossAmount - $discountAmount, 2),
        ];
    }

    public function fareBetween(FarePoint $pickup, FarePoint $dropoff, bool $discounted): float
    {
        $column = $discounted ? 'discounted_fare' : 'regular_fare';
        $setting = $discounted ? 'base_fare_discounted' : 'base_fare_regular';
        $default = $discounted ? 12.0 : 15.0;
        $minimum = (float) (Setting::where('key', $setting)->value('value') ?? $default);

        return round(max(abs((float) $pickup->{$column} - (float) $dropoff->{$column}), $minimum), 2);
    }

    private function normalizePassengers(array $passengers): array
    {
        $normalized = [];
        foreach ($passengers as $row) {
            $type = PassengerType::normalize((string) ($row['passenger_type'] ?? $row['type'] ?? ''));
            $quantity = (int) ($row['quantity'] ?? 0);
            if ($quantity < 1 || $quantity > 50) {
                abort(422, 'Each passenger quantity must be between 1 and 50.');
            }
            $normalized[$type->value] = ($normalized[$type->value] ?? 0) + $quantity;
        }

        return $normalized;
    }
}
