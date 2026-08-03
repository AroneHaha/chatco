<?php

namespace App\Services;

use App\Models\Route;
use App\Models\RouteVersion;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class RouteGeometryService
{
    public function activeVersion(Route $route, ?CarbonInterface $at = null): ?RouteVersion
    {
        $at ??= now();

        return $route->versions()
            ->where('status', RouteVersion::STATUS_PUBLISHED)
            ->whereNotNull('geometry')
            ->where(function ($query) use ($at) {
                $query->whereNull('effective_from')
                    ->orWhere('effective_from', '<=', $at);
            })
            ->where(function ($query) use ($at) {
                $query->whereNull('effective_until')
                    ->orWhere('effective_until', '>', $at);
            })
            ->orderByDesc('published_at')
            ->orderByDesc('version')
            ->first();
    }

    public function latestDraft(Route $route): ?RouteVersion
    {
        return $route->versions()
            ->where('status', RouteVersion::STATUS_DRAFT)
            ->orderByDesc('version')
            ->first();
    }

    public function saveDraft(
        Route $route,
        array $geometry,
        array $waypoints,
        ?string $notes,
        ?string $userId
    ): RouteVersion {
        return DB::transaction(function () use ($route, $geometry, $waypoints, $notes, $userId) {
            Route::query()->whereKey($route->id)->lockForUpdate()->firstOrFail();
            $draft = $this->latestDraft($route);

            if (! $draft) {
                $draft = $route->versions()->create([
                    'version' => $this->nextVersionNumber($route),
                    'status' => RouteVersion::STATUS_DRAFT,
                    'created_by' => $userId,
                ]);
            }

            $draft->update([
                'geometry' => array_values($geometry),
                'waypoints' => array_values($waypoints),
                'notes' => $notes,
                'created_by' => $draft->created_by ?: $userId,
            ]);

            return $draft->fresh();
        });
    }

    public function publishDraft(
        Route $route,
        CarbonInterface $effectiveFrom,
        ?CarbonInterface $effectiveUntil,
        ?string $notes,
        ?string $userId
    ): RouteVersion {
        return DB::transaction(function () use ($route, $effectiveFrom, $effectiveUntil, $notes, $userId) {
            Route::query()->whereKey($route->id)->lockForUpdate()->firstOrFail();
            $draft = $this->latestDraft($route);

            if (! $draft || count($draft->geometry ?? []) < 2) {
                abort(422, 'Save a valid route draft before publishing.');
            }

            $draft->update([
                'status' => RouteVersion::STATUS_PUBLISHED,
                'notes' => $notes ?? $draft->notes,
                'effective_from' => $effectiveFrom,
                'effective_until' => $effectiveUntil,
                'published_at' => now(),
                'published_by' => $userId,
            ]);

            $route->update(['status' => 'ACTIVE']);

            return $draft->fresh();
        });
    }

    /**
     * Fare-point coordinate/order changes become an unpublished draft. The
     * active route remains untouched until an admin reviews the map geometry
     * and publishes it. Geometry is intentionally cleared to prevent a stale
     * road line from being published with new stops accidentally.
     */
    public function syncDraftWaypointsFromFarePoints(Route $route, ?string $userId = null): ?RouteVersion
    {
        $waypoints = $route->farePoints()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderBy('point_number')
            ->get(['latitude', 'longitude'])
            ->map(fn ($point) => [(float) $point->latitude, (float) $point->longitude])
            ->values()
            ->all();

        return DB::transaction(function () use ($route, $waypoints, $userId) {
            Route::query()->whereKey($route->id)->lockForUpdate()->firstOrFail();
            $draft = $this->latestDraft($route);

            if (! $draft) {
                $draft = $route->versions()->create([
                    'version' => $this->nextVersionNumber($route),
                    'status' => RouteVersion::STATUS_DRAFT,
                    'created_by' => $userId,
                ]);
            }

            $draft->update([
                'waypoints' => $waypoints,
                'geometry' => null,
                'notes' => 'Fare Point coordinates changed. Generate and review the route before publishing.',
                'created_by' => $draft->created_by ?: $userId,
            ]);

            return $draft->fresh();
        });
    }

    public function routePayload(Route $route, ?RouteVersion $version = null): array
    {
        $version ??= $this->activeVersion($route);
        $coordinates = array_values($version?->geometry ?? []);

        return [
            'id' => $route->id,
            'name' => $route->name,
            'status' => $route->status,
            'coordinates' => $coordinates,
            'bounds' => $this->bounds($coordinates),
            'version' => $version ? $this->versionPayload($version) : null,
        ];
    }

    public function versionPayload(?RouteVersion $version): ?array
    {
        if (! $version) {
            return null;
        }

        return [
            'id' => $version->id,
            'number' => $version->version,
            'status' => $version->status,
            'geometry' => array_values($version->geometry ?? []),
            'waypoints' => array_values($version->waypoints ?? []),
            'notes' => $version->notes,
            'effective_from' => $version->effective_from?->toIso8601String(),
            'effective_until' => $version->effective_until?->toIso8601String(),
            'published_at' => $version->published_at?->toIso8601String(),
            'is_temporary' => $version->effective_until !== null,
        ];
    }

    public function bounds(array $coordinates): ?array
    {
        if (count($coordinates) < 2) {
            return null;
        }

        $latitudes = array_column($coordinates, 0);
        $longitudes = array_column($coordinates, 1);

        return [
            'south' => min($latitudes),
            'west' => min($longitudes),
            'north' => max($latitudes),
            'east' => max($longitudes),
        ];
    }

    private function nextVersionNumber(Route $route): int
    {
        return ((int) $route->versions()->max('version')) + 1;
    }
}
