<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
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

        // Existing production installations already have one active route but
        // no version records. Promote the verified legacy path once so the
        // first deployment remains visually unchanged. All runtime edits after
        // this point are stored in route_versions and published by an admin.
        $primaryRoute = DB::table('routes')
            ->where('status', 'ACTIVE')
            ->orderBy('created_at')
            ->first();

        $bootstrapGeometry = config('chatco_route.bootstrap_geometry', []);
        if ($primaryRoute && count($bootstrapGeometry) >= 2) {
            $now = now();
            DB::table('route_versions')->insert([
                'id' => (string) Str::uuid(),
                'route_id' => $primaryRoute->id,
                'version' => 1,
                'status' => 'PUBLISHED',
                'geometry' => json_encode($bootstrapGeometry, JSON_THROW_ON_ERROR),
                'waypoints' => json_encode($bootstrapGeometry, JSON_THROW_ON_ERROR),
                'notes' => 'Initial verified route imported during dynamic-route migration.',
                'effective_from' => $now,
                'effective_until' => null,
                'published_at' => $now,
                'created_by' => null,
                'published_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('route_versions');
    }
};
