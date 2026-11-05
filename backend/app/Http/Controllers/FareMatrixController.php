<?php

namespace App\Http\Controllers;

use App\Models\FarePoint;
use App\Models\Route;
use App\Support\FareRules;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public Fare Matrix Controller.
 *
 *   GET /api/v1/fare-matrix
 *
 * Returns the complete fare matrix (all fare points ordered by point_number)
 * plus the fare configuration constants (base zone size, base fares, succeeding
 * increments). This is the SINGLE SOURCE OF TRUTH for fare calculation —
 * the conductor's FareCalcModal and the commuter's fare-calculator both
 * consume this endpoint.
 *
 * No auth required — fare information is public (like a bus schedule).
 * The admin's /settings/fare-matrix page edits the stops; the fares come
 * from /settings/financial-rules. Each point's regularFare/discountedFare is
 * its fare from stop 1, kept in sync with those rules (FareRules).
 */
class FareMatrixController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        if ($request->filled('route_id')) {
            $route = Route::find($request->string('route_id')->toString());
        } else {
            $activeRoutes = Route::query()
                ->where('status', 'ACTIVE')
                ->orderBy('created_at')
                ->get();
            $route = $activeRoutes
                ->first(fn (Route $candidate) => $candidate->hasGeometry())
                ?? $activeRoutes->first();
        }

        if (! $route) {
            return $this->errorResponse('No active route is available.', 404);
        }

        $farePoints = FarePoint::where('route_id', $route->id)
            ->orderBy('point_number', 'asc')
            ->get();

        // Map to the frontend's expected shape (camelCase + landmarks as array).
        $points = $farePoints->map(function (FarePoint $fp) {
            return [
                'id' => $fp->id,
                'pointNumber' => $fp->point_number,
                'code' => $fp->code,
                'name' => $fp->name,
                'landmarks' => $this->parseStringList($fp->landmarks),
                'subStops' => $this->parseStringList($fp->sub_stops),
                'regularFare' => (float) $fp->regular_fare,
                'discountedFare' => (float) $fp->discounted_fare,
                'latitude' => $fp->latitude !== null ? (float) $fp->latitude : null,
                'longitude' => $fp->longitude !== null ? (float) $fp->longitude : null,
                'route' => $fp->route?->name,
            ];
        });

        // The Financial Rules every trip is priced with (App\Support\FareRules).
        // Clients compute: minimum + max(0, |stop gap| - baseBarangayCount) ×
        // succeeding, less discountRate for discounted fares, each rounded to
        // the nearest ₱0.25 (see FareRules::fare).
        $rules = FareRules::current();
        $config = [
            'baseBarangayCount' => $rules->baseBarangayCount,
            'baseFareRegular' => $rules->minimumFare,
            'baseFareDiscounted' => $rules->fare(0, true),
            'succeedingFareRegular' => $rules->succeedingFare,
            'succeedingFareDiscounted' => $rules->discounted($rules->succeedingFare),
            'discountRate' => $rules->discountRate,
            'totalPoints' => $farePoints->count(),
        ];

        return $this->successResponse([
            'route' => [
                'id' => $route->id,
                'name' => $route->name,
            ],
            'points' => $points,
            'config' => $config,
        ], 'Fare matrix retrieved');
    }

    /**
     * Parse a comma-separated string into an array (for landmarks/sub_stops).
     * The DB stores them as a plain string; the frontend expects an array.
     */
    private function parseStringList($value): array
    {
        if (! $value) {
            return [];
        }
        // Handle JSON-encoded arrays (if stored as JSON by the admin CRUD).
        if (is_array($value)) {
            return $value;
        }
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        // Fall back to comma-separated parsing.
        return array_map('trim', array_filter(explode(',', $value)));
    }
}
