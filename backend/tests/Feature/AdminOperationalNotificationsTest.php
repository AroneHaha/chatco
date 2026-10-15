<?php

namespace Tests\Feature;

use App\Events\AdminNotificationsUpdated;
use App\Models\Announcement;
use App\Models\DiscountApplication;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\AnnouncementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AdminOperationalNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_actual_vehicle_status_changes_notify_admins_only_and_do_not_duplicate_on_save(): void
    {
        $admin = User::factory()->admin()->create();
        $otherAdmin = User::factory()->admin()->create();
        User::factory()->commuter()->create();
        $vehicle = Vehicle::factory()->create(['status' => 'ACTIVE']);
        Event::fake([AdminNotificationsUpdated::class]);

        foreach (['MAINTENANCE', 'INACTIVE', 'ACTIVE'] as $status) {
            $this->actingAs($admin)->putJson("/api/v1/admin/vehicles/{$vehicle->id}", ['status' => $status])->assertOk();
            $this->putJson("/api/v1/admin/vehicles/{$vehicle->id}", ['status' => $status])->assertOk();
        }
        $this->putJson("/api/v1/admin/vehicles/{$vehicle->id}", ['vehicle_type' => 'Van'])->assertOk();
        $notices = Announcement::where('type', 'VEHICLE_STATUS_CHANGED')->get();
        $this->assertCount(6, $notices);
        $this->assertEqualsCanonicalizing([$admin->id, $otherAdmin->id], $notices->pluck('user_id')->unique()->all());
        $this->assertSame([$vehicle->id], $notices->pluck('reference_id')->unique()->values()->all());
        $this->assertTrue($notices->contains(fn ($notice) => str_contains($notice->message, 'from Operating to Under Maintenance')));
        Event::assertDispatchedTimes(AdminNotificationsUpdated::class, 3);
    }

    private function application(array $overrides = []): DiscountApplication
    {
        $commuter = User::factory()->commuter()->create();
        return DiscountApplication::create($overrides + [
            'commuter_id' => $commuter->id, 'request_type' => 'APPLICATION', 'requested_type' => 'PWD',
            'status' => 'PENDING', 'submitted_at' => now()->subDay(), 'first_submitted_at' => now()->subDays(2),
        ]);
    }

    public function test_reminders_only_cover_overdue_pending_applications_and_are_once_per_submission(): void
    {
        $this->freezeTime();
        $admin = User::factory()->admin()->create();
        $overdue = $this->application();
        $recent = $this->application(['submitted_at' => now()->subHours(23)]);
        foreach (['NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as $status) {
            $this->application(['status' => $status]);
        }
        $this->application(['request_type' => 'RENEWAL']);
        $deleted = $this->application();
        $deleted->commuter->delete();

        $this->artisan('discount-applications:send-reminders')->assertSuccessful();
        $notice = Announcement::where('type', 'DISCOUNT_APPLICATION_WAITING')->sole();
        $this->assertSame($overdue->id, $notice->reference_id);
        $this->assertSame($admin->id, $notice->user_id);
        $notice->update(['status' => 'ARCHIVED']);
        $notice->delete();
        $recent->update(['status' => 'APPROVED']);
        $this->travel(2)->days();
        $this->artisan('discount-applications:send-reminders')->assertSuccessful();
        $this->assertSame(1, Announcement::withTrashed()->where('type', 'DISCOUNT_APPLICATION_WAITING')->count());

        // A corrected submission starts a fresh 24-hour review window.
        $overdue->update(['submitted_at' => now(), 'revision' => 2]);
        $this->artisan('discount-applications:send-reminders')->assertSuccessful();
        $this->assertSame(1, Announcement::withTrashed()->where('type', 'DISCOUNT_APPLICATION_WAITING')->count());
        $this->travel(24)->hours();
        $this->artisan('discount-applications:send-reminders')->assertSuccessful();
        $this->artisan('discount-applications:send-reminders')->assertSuccessful();
        $this->assertSame(2, Announcement::withTrashed()->where('type', 'DISCOUNT_APPLICATION_WAITING')->count());
    }

    public function test_live_signal_waits_for_commit_and_is_not_sent_for_rollback(): void
    {
        User::factory()->admin()->create();
        Event::fake([AdminNotificationsUpdated::class]);
        DB::beginTransaction();
        app(AnnouncementService::class)->notifyAdmins('TEST', 'Rollback', 'Message');
        Event::assertNotDispatched(AdminNotificationsUpdated::class);
        DB::rollBack();
        Event::assertNotDispatched(AdminNotificationsUpdated::class);
        $this->assertDatabaseMissing('announcements', ['title' => 'Rollback']);

        DB::beginTransaction();
        app(AnnouncementService::class)->notifyAdmins('TEST', 'Committed', 'Message');
        Event::assertNotDispatched(AdminNotificationsUpdated::class);
        DB::commit();
        Event::assertDispatchedTimes(AdminNotificationsUpdated::class, 1);
        $event = new AdminNotificationsUpdated();
        $this->assertSame('private-admin.notifications', $event->broadcastOn()->name);
        $this->assertSame([], $event->broadcastWith());
    }

    public function test_broadcast_failure_preserves_the_notification_for_polling(): void
    {
        User::factory()->admin()->create();
        Event::listen(AdminNotificationsUpdated::class, function () { throw new \RuntimeException('Broadcast unavailable'); });
        app(AnnouncementService::class)->notifyAdmins('TEST', 'Still available', 'Message');
        $this->assertDatabaseHas('announcements', ['title' => 'Still available']);
    }
}
