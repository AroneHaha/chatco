<?php

namespace App\Services;

use App\Enums\PassengerType;
use App\Models\FarePoint;
use App\Models\Setting;

class FareCalculationService
{
    public function calculate(string $pickupId, string $dropoffId, array $passengers, ?string $routeId = null): array
    {
        $pickup = $this->resolvePoint($pickupId, null, $routeId, 'Pickup');
        $dropoff = $this->resolvePoint($dropoffId, null, $routeId, 'Drop-off');

        return $this->calculateWithPoints($pickup, $dropoff, $passengers);
    }

    /**
     * Calculate a fare from an API request without trusting client monetary
     * fields. IDs are preferred; canonical names/sub-stops remain a backwards-
     * compatible fallback for already queued offline transactions.
     */
    public function calculateFromRequest(array $data, array $passengers, ?string $routeId = null): array
    {
        $pickup = $this->resolvePoint(
            $data['pickup_stop_id'] ?? null,
            $data['pickup_name'] ?? null,
            $routeId,
            'Pickup',
        );
        $dropoff = $this->resolvePoint(
            $data['dropoff_stop_id'] ?? null,
            $data['dropoff_name'] ?? null,
            $routeId,
            'Drop-off',
        );

        $fare = $this->calculateWithPoints($pickup, $dropoff, $passengers);
        $fare['pickup_name'] = $this->canonicalDisplayName($pickup, $data['pickup_name'] ?? null, 'Pickup');
        $fare['dropoff_name'] = $this->canonicalDisplayName($dropoff, $data['dropoff_name'] ?? null, 'Drop-off');

        return $fare;
    }

    private function calculateWithPoints(FarePoint $pickup, FarePoint $dropoff, array $passengers): array
    {

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

    private function resolvePoint(?string $id, ?string $name, ?string $routeId, string $label): FarePoint
    {
        if ($id !== null && trim($id) !== '') {
            $point = FarePoint::find($id);
            if (! $point) {
                abort(422, "{$label} point was not found.");
            }

            if ($routeId !== null && $point->route_id !== $routeId) {
                abort(422, "{$label} point does not belong to the active route.");
            }

            // When the client supplies a sub-stop label alongside the stable
            // point ID, validate that the label is actually owned by the point.
            $this->canonicalDisplayName($point, $name, $label);

            return $point;
        }

        $needle = $this->normalizeName($name);
        if ($needle === '') {
            abort(422, "{$label} point is required.");
        }

        $matches = FarePoint::query()
            ->when($routeId !== null, fn ($query) => $query->where('route_id', $routeId))
            ->get()
            ->filter(fn (FarePoint $point): bool => collect($this->allowedNames($point))
                ->contains(fn (string $candidate): bool => $this->normalizeName($candidate) === $needle))
            ->values();

        if ($matches->isEmpty()) {
            abort(422, "{$label} point was not found in the active fare matrix.");
        }

        if ($matches->count() > 1) {
            abort(422, "{$label} point is ambiguous. Refresh the fare matrix and try again.");
        }

        return $matches->first();
    }

    private function canonicalDisplayName(FarePoint $point, ?string $requested, string $label): string
    {
        $needle = $this->normalizeName($requested);
        if ($needle === '') {
            return $point->name;
        }

        foreach ($this->allowedNames($point) as $candidate) {
            if ($this->normalizeName($candidate) === $needle) {
                return $candidate;
            }
        }

        abort(422, "{$label} sub-area does not belong to the selected point.");
    }

    private function allowedNames(FarePoint $point): array
    {
        $children = collect([
            ...($point->sub_stops ?? []),
            ...($point->landmarks ?? []),
        ])->filter(fn ($value): bool => is_string($value) && trim($value) !== '')
            ->map(fn (string $value): string => trim($value))
            ->unique(fn (string $value): string => $this->normalizeName($value))
            ->values();

        return collect([$point->name])
            ->merge($children)
            ->merge($children->map(fn (string $child): string => "{$point->name} · {$child}"))
            ->filter(fn ($value): bool => is_string($value) && trim($value) !== '')
            ->values()
            ->all();
    }

    private function normalizeName(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
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
