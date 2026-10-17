<?php

namespace Tests\Feature;

use App\Enums\ActivityLogCategory;
use App\Models\ActivityLog;
use App\Models\Route;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The audit trail: who did what (actor role), what changed (before/after),
 * and that saves which change nothing don't add noise.
 */
class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private function log(): ActivityLogService
    {
        return app(ActivityLogService::class);
    }

    // ── Recording ──────────────────────────────────────────────────────

    public function test_entries_snapshot_the_actor_role_and_system_events_have_none(): void
    {
        $admin = User::factory()->admin()->create();
        $commuter = User::factory()->commuter()->create();

        $this->log()->record(ActivityLogCategory::VEHICLE, 'Admin action', $admin);
        $this->log()->record(ActivityLogCategory::MEMBER, 'Commuter action', $commuter);
        $this->log()->record(ActivityLogCategory::SHIFT, 'Automatic action');

        $this->assertSame('ADMIN', ActivityLog::where('description', 'Admin action')->value('actor_role'));
        $this->assertSame('COMMUTER', ActivityLog::where('description', 'Commuter action')->value('actor_role'));
        $system = ActivityLog::where('description', 'Automatic action')->sole();
        $this->assertSame('SYSTEM', $system->actor_role);
        $this->assertNull($system->actor_name);
        $this->assertNull($system->changes);
    }

    public function test_diff_returns_only_real_changes_with_readable_values(): void
    {
        $changes = ActivityLogService::diff(
            ['fare' => '17.00', 'name' => 'Old', 'active' => true, 'note' => '', 'date' => now()->startOfDay()],
            ['fare' => 17, 'name' => 'New', 'active' => false, 'note' => null, 'date' => now()->startOfDay()],
            ['fare' => 'Fare', 'name' => 'Name', 'active' => 'Active', 'note' => 'Note', 'date' => 'Date'],
        );

        $this->assertSame([
            ['field' => 'Name', 'from' => 'Old', 'to' => 'New'],
            ['field' => 'Active', 'from' => 'Yes', 'to' => 'No'],
        ], $changes);
    }

    // ── Settings ───────────────────────────────────────────────────────

    public function test_saving_an_unchanged_setting_writes_no_entry(): void
    {
        $admin = User::factory()->admin()->create();
        Setting::create(['key' => 'speed_limit_kmh', 'value' => '60', 'category' => 'operations']);

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/settings/speed_limit_kmh', ['value' => 60, 'category' => 'operations'])
            ->assertOk();

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_a_changed_setting_is_logged_with_a_readable_label_and_its_old_value(): void
    {
        $admin = User::factory()->admin()->create();
        Setting::create(['key' => 'speed_limit_kmh', 'value' => '60', 'category' => 'operations']);
        Setting::create(['key' => 'receipt_show_qr_code', 'value' => 'true', 'category' => 'receipt']);

        $this->actingAs($admin)->putJson('/api/v1/admin/settings/speed_limit_kmh', ['value' => 80, 'category' => 'operations'])->assertOk();
        $this->actingAs($admin)->putJson('/api/v1/admin/settings/receipt_show_qr_code', ['value' => 'false', 'category' => 'receipt'])->assertOk();

        $speed = ActivityLog::where('description', 'like', '%Overspeeding%')->sole();
        $this->assertSame('Changed Overspeeding limit (km/h) from 60 to 80', $speed->description);
        $this->assertSame([['field' => 'Overspeeding limit (km/h)', 'from' => '60', 'to' => '80']], $speed->changes);

        $qr = ActivityLog::where('description', 'like', '%reward QR%')->sole();
        $this->assertSame([['field' => 'Receipt shows reward QR', 'from' => 'On', 'to' => 'Off']], $qr->changes);
    }

    // ── Admin edits ────────────────────────────────────────────────────

    public function test_member_edit_records_before_and_after_and_a_no_op_edit_records_nothing(): void
    {
        $admin = User::factory()->admin()->create();
        $commuter = User::factory()->commuter()->create();
        $commuter->commuterProfile->update(['contact_number' => '09171234567']);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/users/{$commuter->id}", ['contact_number' => '09181234567'])
            ->assertOk();

        $entry = ActivityLog::where('category', 'MEMBER')->sole();
        $this->assertStringEndsWith(': Contact number', $entry->description);
        $this->assertSame([[
            'field' => 'Contact number',
            'from' => '09171234567',
            'to' => $commuter->commuterProfile->fresh()->contact_number,
        ]], $entry->changes);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/users/{$commuter->id}", ['contact_number' => $commuter->commuterProfile->fresh()->contact_number])
            ->assertOk();
        $this->assertSame(1, ActivityLog::where('category', 'MEMBER')->count());
    }

    public function test_vehicle_edit_names_the_route_instead_of_its_id(): void
    {
        $admin = User::factory()->admin()->create();
        $from = Route::factory()->create(['name' => 'Calumpit – Malolos']);
        $to = Route::factory()->create(['name' => 'Malolos – Meycauayan']);
        $vehicle = Vehicle::factory()->create(['route_id' => $from->id]);

        $this->actingAs($admin)
            ->putJson("/api/v1/admin/vehicles/{$vehicle->id}", ['route_id' => $to->id])
            ->assertOk();

        $this->assertSame(
            [['field' => 'Route', 'from' => 'Calumpit – Malolos', 'to' => 'Malolos – Meycauayan']],
            ActivityLog::where('category', 'VEHICLE')->sole()->changes,
        );
    }

    // ── Commuter's own account ─────────────────────────────────────────

    public function test_commuter_profile_edit_is_logged_with_the_commuter_as_actor(): void
    {
        $commuter = User::factory()->commuter()->create();
        $commuter->commuterProfile->update(['contact_number' => '09171234567']);

        $this->actingAs($commuter)
            ->putJson('/api/v1/commuter/profile', ['contact_number' => '09181234567'])
            ->assertOk();

        $entry = ActivityLog::sole();
        $this->assertSame('MEMBER', $entry->category);
        $this->assertSame($commuter->id, $entry->actor_id);
        $this->assertSame('COMMUTER', $entry->actor_role);
        $this->assertSame('Updated their profile: Contact number', $entry->description);

        // Saving the same number again is not a change.
        $this->actingAs($commuter)
            ->putJson('/api/v1/commuter/profile', ['contact_number' => $commuter->commuterProfile->fresh()->contact_number])
            ->assertOk();
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_account_changes_are_filed_under_the_persons_own_category(): void
    {
        $this->assertSame(ActivityLogCategory::ACCOUNT, ActivityLogService::accountCategory(User::factory()->admin()->create()));
        $this->assertSame(ActivityLogCategory::MEMBER, ActivityLogService::accountCategory(User::factory()->commuter()->create()));
        $this->assertSame(ActivityLogCategory::PERSONNEL, ActivityLogService::accountCategory(User::factory()->conductor()->create()));
    }

    // ── Admin sign-in ──────────────────────────────────────────────────

    public function test_admin_sign_in_failed_sign_in_and_sign_out_are_logged(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/v1/auth/login', ['login' => $admin->email, 'password' => 'wrong-password'])->assertStatus(401);
        $this->postJson('/api/v1/auth/login', ['login' => $admin->email, 'password' => 'password'])->assertOk();
        // Single session: signing in again ends the first one.
        $token = $this->postJson('/api/v1/auth/login', ['login' => $admin->email, 'password' => 'password'])
            ->assertOk()->json('data.token');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

        $descriptions = ActivityLog::where('category', 'ACCOUNT')->pluck('description')->all();
        $this->assertEqualsCanonicalizing([
            'Failed sign-in attempt (wrong password)',
            'Signed in',
            'Signed in and ended the session on another device',
            'Signed out',
        ], $descriptions);
        $this->assertSame(4, ActivityLog::where('category', 'ACCOUNT')->where('actor_id', $admin->id)->count());
    }

    public function test_commuter_and_unknown_sign_ins_are_not_logged(): void
    {
        $commuter = User::factory()->commuter()->create();

        $this->postJson('/api/v1/auth/login', ['login' => $commuter->email, 'password' => 'password'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['login' => $commuter->email, 'password' => 'wrong-password'])->assertStatus(401);
        $this->postJson('/api/v1/auth/login', ['login' => 'nobody@example.com', 'password' => 'wrong-password'])->assertStatus(401);

        $this->assertSame(0, ActivityLog::count());
    }

    // ── Reading ────────────────────────────────────────────────────────

    public function test_list_filters_by_actor_role_and_caps_page_size(): void
    {
        $admin = User::factory()->admin()->create();
        $this->log()->record(ActivityLogCategory::VEHICLE, 'By admin', $admin);
        $this->log()->record(ActivityLogCategory::SHIFT, 'By system');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/activity-logs?actor_role=SYSTEM&date_range=all')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.description', 'By system')
            ->assertJsonPath('data.data.0.actor_role', 'SYSTEM');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/activity-logs?per_page=100000')
            ->assertOk()
            ->assertJsonPath('data.per_page', 100);
    }

    public function test_export_returns_matching_rows_and_the_full_count(): void
    {
        $admin = User::factory()->admin()->create();
        $this->log()->record(ActivityLogCategory::VEHICLE, 'Vehicle entry', $admin, [['field' => 'Status', 'from' => 'Operating', 'to' => 'Under Maintenance']]);
        $this->log()->record(ActivityLogCategory::FAQ, 'FAQ entry', $admin);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/activity-logs/export?category=VEHICLE')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.changes.0.to', 'Under Maintenance');
    }

    public function test_export_requires_the_admin_role(): void
    {
        $this->actingAs(User::factory()->commuter()->create())
            ->getJson('/api/v1/admin/activity-logs/export')
            ->assertForbidden();
    }

    // ── Migration ──────────────────────────────────────────────────────

    public function test_upgrade_migration_backfills_roles_and_can_run_again(): void
    {
        $admin = User::factory()->admin()->create();
        DB::table('activity_logs')->insert([
            ['id' => 'a0000000-0000-0000-0000-000000000001', 'category' => 'VEHICLE', 'description' => 'Old admin row', 'actor_id' => $admin->id, 'actor_name' => 'Admin', 'actor_role' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 'a0000000-0000-0000-0000-000000000002', 'category' => 'MEMBER', 'description' => 'Old system row', 'actor_id' => null, 'actor_name' => null, 'actor_role' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 'a0000000-0000-0000-0000-000000000003', 'category' => 'MEMBER', 'description' => 'Deleted actor row', 'actor_id' => null, 'actor_name' => 'Gone Admin', 'actor_role' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $migration = require database_path('migrations/2026_10_17_000001_add_actor_role_and_changes_to_activity_logs_table.php');
        $migration->up();
        $migration->up();

        $this->assertSame('ADMIN', ActivityLog::where('description', 'Old admin row')->value('actor_role'));
        $this->assertSame('SYSTEM', ActivityLog::where('description', 'Old system row')->value('actor_role'));
        $this->assertNull(ActivityLog::where('description', 'Deleted actor row')->value('actor_role'));
    }
}
