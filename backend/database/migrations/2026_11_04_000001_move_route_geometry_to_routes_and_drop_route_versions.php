<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Routes keep one live road line and no history: editing a route saves it
 * straight onto the routes row. The line that is live right now (the latest
 * effective published version) is copied onto routes.geometry, then the
 * route_versions table (drafts, version history, temporary detours) is
 * dropped. A detour that is live when this runs becomes the route's line.
 *
 * waypoints becomes text: the editor stores up to 100 [lat, lng] control
 * points, which does not fit the original string(2000).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Capture the live line before changing the parent table. SQLite may
        // rebuild routes for change(), cascading away its version rows.
        $liveLines = [];
        $now = now();
        foreach (Schema::hasTable('route_versions') ? DB::table('routes')->pluck('id') : [] as $routeId) {
            $live = DB::table('route_versions')
                ->where('route_id', $routeId)
                ->where('status', 'PUBLISHED')
                ->whereNotNull('geometry')
                ->where(fn ($query) => $query->whereNull('effective_from')->orWhere('effective_from', '<=', $now))
                ->where(fn ($query) => $query->whereNull('effective_until')->orWhere('effective_until', '>', $now))
                ->orderByDesc('published_at')
                ->orderByDesc('version')
                ->first(['geometry', 'waypoints']);

            if ($live) {
                $liveLines[$routeId] = array_filter([
                    'geometry' => $live->geometry,
                    'waypoints' => $live->waypoints,
                ], fn ($value) => $value !== null);
            }
        }

        Schema::table('routes', function (Blueprint $table) {
            $table->json('geometry')->nullable()->after('waypoints');
            $table->text('waypoints')->nullable()->change();
        });
        foreach ($liveLines as $routeId => $line) {
            DB::table('routes')->where('id', $routeId)->update($line);
        }
        Schema::dropIfExists('route_versions');
    }

    public function down(): void
    {
        Schema::create('route_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('route_id')->constrained('routes')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('status', 20)->default('DRAFT');
            $table->json('geometry')->nullable();
            $table->json('waypoints')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('effective_from')->nullable();
            $table->timestamp('effective_until')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['route_id', 'version']);
            $table->index(['route_id', 'status', 'effective_from', 'effective_until'], 'route_versions_active_lookup');
        });

        // Restore each saved line as a single published version 1.
        $now = now();
        foreach (DB::table('routes')->whereNotNull('geometry')->get(['id', 'geometry', 'waypoints']) as $route) {
            DB::table('route_versions')->insert([
                'id' => (string) Str::uuid(),
                'route_id' => $route->id,
                'version' => 1,
                'status' => 'PUBLISHED',
                'geometry' => $route->geometry,
                'waypoints' => $route->waypoints,
                'effective_from' => $now,
                'published_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // waypoints stays text: shrinking it back could truncate saved points.
        Schema::table('routes', function (Blueprint $table) {
            $table->dropColumn('geometry');
        });
    }
};
