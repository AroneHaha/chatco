<?php

namespace App\Http\Controllers\Commuter;

use App\Http\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;

class VehicleDetailsController extends Controller
{
    use ApiResponse;

    public function __invoke(Vehicle $vehicle): JsonResponse
    {
        $vehicle->load(['activeShift.driver', 'activeShift.conductor.conductorProfile', 'activeShift.route', 'currentLocation']);
        $shift = $vehicle->activeShift;

        if (! $shift || ! $shift->isActive() || $shift->is_on_break) {
            return $this->errorResponse('This unit is no longer available on the commuter map.', 404);
        }

        // Ratings belong to each crew member across their shifts. Older feedback
        // without a conductor rating must not be counted as a conductor review.
        $driverRatings = Feedback::where('driver_id', $shift->driver_id)
            ->selectRaw('AVG(rating) as average_rating, COUNT(rating) as rating_count')->first();
        $conductorRatings = Feedback::where('conductor_id', $shift->conductor_id)
            ->selectRaw('AVG(conductor_rating) as average_rating, COUNT(conductor_rating) as rating_count')->first();

        return $this->successResponse([
            'vehicle_id' => $vehicle->id,
            'shift_id' => $shift->shift_id,
            'unit_number' => $vehicle->unit_number,
            'plate_number' => $vehicle->plate_number,
            'vehicle_type' => $vehicle->vehicle_type,
            'route_name' => $shift->route?->name,
            'location_updated_at' => $vehicle->currentLocation?->shift_id === $shift->shift_id
                ? $vehicle->currentLocation->updated_at?->toIso8601String() : null,
            'driver' => $this->crewDetails($shift->driver, $driverRatings),
            'conductor' => $this->crewDetails($shift->conductor?->conductorProfile, $conductorRatings),
        ], 'Unit details retrieved');
    }

    private function crewDetails(?Model $profile, Model $ratings): ?array
    {
        if (! $profile) {
            return null;
        }

        // Deliberately expose only public identity and aggregate ratings.
        return [
            'name' => collect([$profile->first_name, $profile->middle_name, $profile->last_name])
                ->filter(fn ($part) => filled($part))->implode(' '),
            'photo_url' => $profile->profile_picture_url,
            'average_rating' => $ratings->average_rating === null ? null : round((float) $ratings->average_rating, 2),
            'rating_count' => (int) $ratings->rating_count,
        ];
    }
}
