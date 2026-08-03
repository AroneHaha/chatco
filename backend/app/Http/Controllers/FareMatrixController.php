<?php

namespace App\Http\Controllers;

use App\Models\FarePoint;
use App\Models\Route;
use App\Models\Setting;
use App\Services\RouteGeometryService;
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
 * The admin's /settings/fare-matrix page edits the fare_points table;
 * changes are immediately visible to all consumers on their next fetch.
 *
 * The config constants (base_barangay_count, base_fare_regular, etc.) are
 * read from the settings table if present, otherwise hardcoded defaults
 * are used. The admin's /settings/financial-rules page can override them.
 */
class FareMatrixController extends Controller
{
    use ApiResponse;

    public function __construct(private RouteGeometryService $routeGeometryService) {}

    /** Default fare config — used when the settings table has no override. */
    private const DEFAULT_CONFIG = [
        'base_barangay_count' => 4,
        'base_fare_regular' => 15.0,
        'base_fare_discounted' => 12.0,
        'succeeding_fare_regular' => 2.25,
        'succeeding_fare_discounted' => 1.75,
    ];

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
                ->first(fn (Route $candidate) => $this->routeGeometryService->activeVersion($candidate) !== null)
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

        // Read config overrides from the settings table (if the admin has
        // set them via /settings/financial-rules). Falls back to defaults.
        $config = [
            'baseBarangayCount' => (int) $this->getSetting('base_barangay_count', self::DEFAULT_CONFIG['base_barangay_count']),
            'baseFareRegular' => (float) $this->getSetting('base_fare_regular', self::DEFAULT_CONFIG['base_fare_regular']),
            'baseFareDiscounted' => (float) $this->getSetting('base_fare_discounted', self::DEFAULT_CONFIG['base_fare_discounted']),
            'succeedingFareRegular' => (float) $this->getSetting('succeeding_fare_regular', self::DEFAULT_CONFIG['succeeding_fare_regular']),
            'succeedingFareDiscounted' => (float) $this->getSetting('succeeding_fare_discounted', self::DEFAULT_CONFIG['succeeding_fare_discounted']),
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
     * Read a setting value from the settings table, with a fallback default.
     */
    private function getSetting(string $key, $default)
    {
        $setting = Setting::where('key', $key)->value('value');

        return $setting !== null ? $setting : $default;
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
