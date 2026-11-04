<?php

namespace App\Services;

use App\Models\Route;

/**
 * Shapes a route's live road line for the maps. A route has exactly one line
 * (routes.geometry), replaced in place when an admin saves the route editor;
 * there are no drafts, versions or temporary detours.
 */
class RouteGeometryService
{
    public function routePayload(Route $route): array
    {
        $coordinates = array_values($route->geometry ?? []);

        return [
            'id' => $route->id,
            'name' => $route->name,
            'status' => $route->status,
            'coordinates' => $coordinates,
            'bounds' => $this->bounds($coordinates),
            'updated_at' => $route->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Editor control points as [lat, lng] pairs. Older seeded rows stored
     * {lat, lng, name} objects in waypoints; those are skipped so the editor
     * falls back to the road line instead of breaking.
     */
    public function controlPoints(Route $route): array
    {
        return array_values(array_filter(
            $route->waypoints ?? [],
            fn ($point) => is_array($point) && array_is_list($point) && count($point) === 2,
        ));
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
}
