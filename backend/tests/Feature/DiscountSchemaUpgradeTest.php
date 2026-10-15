<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class DiscountSchemaUpgradeTest extends TestCase
{
    use RefreshDatabase;

    private function upgrade(): object
    {
        return require database_path('migrations/2026_10_15_000003_upgrade_discount_applications_schema.php');
    }

    public function test_current_schema_can_be_upgraded_repeatedly_without_duplicate_indexes(): void
    {
        $this->upgrade()->up();
        $this->upgrade()->up();
        $indexes = collect(Schema::getIndexes('discount_applications'))
            ->filter(fn ($index) => $index['columns'] === ['commuter_id', 'request_type', 'submitted_at']);
        $this->assertCount(1, $indexes);
        $this->assertTrue(Schema::hasIndex('discount_applications', ['commuter_id', 'cycle_year'], 'unique'));
    }

    public function test_legacy_renewals_are_preserved_and_general_applications_are_supported(): void
    {
        // Reproduce the already-deployed pre-application table in isolated SQLite.
        Schema::table('discount_applications', function (Blueprint $table) {
            $table->dropIndex('discount_owner_requests');
            $table->dropColumn('requested_type');
            $table->unsignedSmallInteger('cycle_year')->nullable(false)->change();
            foreach (['document_path' => 500, 'document_mime' => 100, 'school_name' => 150,
                'education_level' => 20, 'school_year' => 20] as $name => $length) {
                $table->string($name, $length)->nullable(false)->change();
            }
        });
        $user = \App\Models\User::factory()->create();
        DB::table('commuter_profiles')->insert([
            'id' => $user->id, 'first_name' => 'Test', 'surname' => 'Student',
            'birthdate' => '2004-01-01', 'gender' => 'Female', 'email' => $user->email,
            'contact_number' => '09171234567', 'username' => (string) Str::uuid(),
            'commuter_type' => 'STUDENT', 'applied_type' => 'STUDENT',
            'language_preference' => 'English', 'account_status' => 'APPROVED',
        ]);
        $id = (string) Str::uuid();
        $row = [
            'id' => $id, 'commuter_id' => $user->id, 'cycle_year' => 2027,
            'document_path' => 'renewals/original.jpg', 'document_mime' => 'image/jpeg',
            'school_name' => 'University', 'education_level' => 'COLLEGE', 'school_year' => '2027-2028',
            'status' => 'APPROVED', 'submitted_at' => now(), 'first_submitted_at' => now(),
        ];
        DB::table('discount_applications')->insert($row);
        $this->upgrade()->up();
        $this->assertDatabaseHas('discount_applications', $row + ['requested_type' => 'STUDENT']);
        $application = array_replace($row, [
            'id' => (string) Str::uuid(), 'request_type' => 'APPLICATION', 'requested_type' => 'PWD',
            'cycle_year' => null, 'document_path' => null, 'document_mime' => null,
            'school_name' => null, 'education_level' => null, 'school_year' => null,
        ]);
        DB::table('discount_applications')->insert($application);
        $this->upgrade()->down();
        $this->upgrade()->up();
        $this->assertDatabaseHas('discount_applications', $application);
        $this->assertDatabaseCount('discount_applications', 2);
        $this->assertTrue(Schema::hasIndex('discount_applications', ['commuter_id', 'cycle_year'], 'unique'));
    }
}
