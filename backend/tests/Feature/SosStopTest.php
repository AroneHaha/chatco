<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\SosAlert;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SosStopTest extends TestCase
{
    use RefreshDatabase;

    public static function senderRoles(): array
    {
        return [['commuter'], ['conductor']];
    }

    private function alert(User $sender, string $status = 'ACTIVE'): SosAlert
    {
        $isConductor = $sender->isConductor();
        return SosAlert::create([
            'sender_role' => $isConductor ? 'CONDUCTOR' : 'COMMUTER',
            // The SQLite schema retains the original NOT NULL commuter_id.
            'commuter_id' => $isConductor ? User::factory()->commuter()->create()->commuterProfile->id : $sender->commuterProfile->id,
            'conductor_id' => $isConductor ? $sender->conductorProfile->id : null,
            'lat' => 14.84,
            'lng' => 120.87,
            'note' => 'Original alert note',
            'status' => $status,
        ]);
    }

    #[DataProvider('senderRoles')]
    public function test_sender_can_stop_active_alert_and_notify_dispatch(string $role): void
    {
        $admin = User::factory()->admin()->create();
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender);
        Sanctum::actingAs($sender);

        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")
            ->assertOk()->assertJsonPath('data.status', 'RESOLVED');
        $this->assertDatabaseHas('sos_alerts', [
            'id' => $alert->id,
            'status' => 'RESOLVED',
            'resolved_by' => $sender->id,
            'note' => 'Original alert note',
        ]);
        $this->assertNotNull($alert->fresh()->resolved_at);
        $this->assertDatabaseHas('announcements', [
            'user_id' => $admin->id,
            'type' => 'SOS_RESOLVED',
            'reference_id' => $alert->id,
        ]);
        $this->getJson("/api/v1/{$role}/sos/{$alert->id}")->assertOk()->assertJsonPath('data.status', 'RESOLVED');
        Sanctum::actingAs($admin);
        $this->assertEmpty($this->getJson('/api/v1/admin/sos')->assertOk()->json('data.data'));
        $this->getJson('/api/v1/admin/sos?status=RESOLVED')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $alert->id)
            ->assertJsonPath('data.data.0.resolved_by', $sender->id);
        $this->patchJson("/api/v1/admin/sos/{$alert->id}/acknowledge")->assertUnprocessable();
        $this->patchJson("/api/v1/admin/sos/{$alert->id}/resolve")->assertUnprocessable();
        $this->assertSame($sender->id, $alert->fresh()->resolved_by);
    }

    #[DataProvider('senderRoles')]
    public function test_sender_can_stop_acknowledged_alert(string $role): void
    {
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender, 'ACKNOWLEDGED');
        Sanctum::actingAs($sender);
        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")->assertOk()->assertJsonPath('data.status', 'RESOLVED');
    }

    #[DataProvider('senderRoles')]
    public function test_sender_cannot_stop_another_senders_alert(string $role): void
    {
        $owner = User::factory()->{$role}()->create();
        $other = User::factory()->{$role}()->create();
        $alert = $this->alert($owner);
        Sanctum::actingAs($other);
        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")->assertNotFound();
        $this->assertSame('ACTIVE', $alert->fresh()->status);
    }

    #[DataProvider('senderRoles')]
    public function test_sender_cannot_stop_alert_from_other_role(string $role): void
    {
        $otherRole = $role === 'commuter' ? 'conductor' : 'commuter';
        $sender = User::factory()->{$role}()->create();
        $owner = User::factory()->{$otherRole}()->create();
        $alert = $this->alert($owner);
        Sanctum::actingAs($sender);
        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")->assertNotFound();
        $this->assertSame('ACTIVE', $alert->fresh()->status);
        $this->patchJson("/api/v1/{$otherRole}/sos/{$alert->id}/stop")->assertForbidden();
    }

    #[DataProvider('senderRoles')]
    public function test_stopping_twice_is_idempotent(string $role): void
    {
        User::factory()->admin()->create();
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender);
        Sanctum::actingAs($sender);
        $url = "/api/v1/{$role}/sos/{$alert->id}/stop";
        $this->patchJson($url)->assertOk();
        $resolvedAt = $alert->fresh()->resolved_at->toISOString();
        $this->travel(1)->minutes();
        $this->patchJson($url)->assertOk();
        $this->assertSame($resolvedAt, $alert->fresh()->resolved_at->toISOString());
        $this->assertSame(1, Announcement::where('type', 'SOS_RESOLVED')->where('reference_id', $alert->id)->count());
    }

    #[DataProvider('senderRoles')]
    public function test_stop_preserves_existing_admin_resolution(string $role): void
    {
        $admin = User::factory()->admin()->create();
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender, 'RESOLVED');
        $alert->update(['resolved_by' => $admin->id, 'resolved_at' => now()]);
        Sanctum::actingAs($sender);
        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")->assertOk();
        $this->assertSame($admin->id, $alert->fresh()->resolved_by);
    }

    #[DataProvider('senderRoles')]
    public function test_mobile_sender_can_stop_alert(string $role): void
    {
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender);
        Sanctum::actingAs($sender);
        $this->patchJson("/api/v1/mobile/{$role}/sos/{$alert->id}/stop")->assertOk()->assertJsonPath('data.status', 'RESOLVED');
    }

    #[DataProvider('senderRoles')]
    public function test_stopping_requires_authentication(string $role): void
    {
        $sender = User::factory()->{$role}()->create();
        $alert = $this->alert($sender);
        $this->patchJson("/api/v1/{$role}/sos/{$alert->id}/stop")->assertUnauthorized();
        $this->assertSame('ACTIVE', $alert->fresh()->status);
    }
}
