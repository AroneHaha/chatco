<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminVoucherDistributionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_ten_free_ride_vouchers_are_assigned_to_ten_distinct_eligible_commuters(): void
    {
        User::factory()->count(20)->commuter()->create();
        $expiry = now()->addDays(5)->toIso8601String();
        $response = $this->postJson('/api/v1/admin/vouchers', [
            'type' => 'FREE_RIDE', 'quantity' => 10, 'amount' => 999,
            'expires_at' => $expiry, 'ride_origin' => 'Promo',
        ])->assertCreated()->assertJsonCount(10, 'data');

        $vouchers = Voucher::all();
        $this->assertCount(10, $vouchers);
        $this->assertCount(10, $vouchers->pluck('commuter_id')->unique());
        $this->assertCount(10, $vouchers->pluck('code')->unique());
        $this->assertCount(1, $vouchers->pluck('generation_batch_id')->unique());
        foreach ($vouchers as $voucher) {
            $this->assertSame('FREE_RIDE', $voucher->type);
            $this->assertSame(Voucher::STATUS_AVAILABLE, $voucher->status);
            $this->assertNull($voucher->amount);
            $this->assertSame('Promo', $voucher->ride_origin);
            $this->assertTrue($voucher->expires_at->equalTo($expiry));
        }
        $this->assertNotNull($response->json('data.0.commuter.first_name'));
        $notices = Announcement::where('type', 'voucher_received')->get();
        $this->assertCount(10, $notices);
        $this->assertEqualsCanonicalizing($vouchers->pluck('commuter_id')->all(), $notices->pluck('user_id')->all());
        $this->assertSame($vouchers->first()->generation_batch_id, $notices->first()->reference_id);
        $this->assertStringContainsString('free-ride voucher', $notices->first()->message);
        $this->assertStringContainsString('Valid until', $notices->first()->message);
    }

    public function test_discount_voucher_values_and_categories_are_visible_to_their_recipients(): void
    {
        User::factory()->count(3)->commuter()->create();
        $response = $this->postJson('/api/v1/admin/vouchers', [
            'type' => 'DISCOUNT', 'quantity' => 3, 'amount' => 5.25,
        ])->assertCreated()->assertJsonCount(3, 'data');
        $voucher = Voucher::findOrFail($response->json('data.0.id'));
        $this->assertSame('5.25', $voucher->amount);
        Sanctum::actingAs(User::findOrFail($voucher->commuter_id));
        $this->getJson('/api/v1/commuter/rewards')->assertOk()
            ->assertJsonPath('data.availableVoucherCount', 1)
            ->assertJsonPath('data.vouchers.0.type', 'DISCOUNT')
            ->assertJsonPath('data.vouchers.0.amount', 5.25);
    }

    public function test_time_limit_starts_at_generation_and_retries_keep_the_original_expiry(): void
    {
        $this->freezeTime();
        $commuter = User::factory()->commuter()->create();
        $data = ['type' => 'DISCOUNT', 'quantity' => 1, 'amount' => 5, 'validity_hours' => 24, 'idempotency_key' => (string) Str::uuid()];
        $first = $this->postJson('/api/v1/admin/vouchers', $data)->assertCreated();
        $voucher = Voucher::findOrFail($first->json('data.0.id'));
        $this->assertTrue($voucher->expires_at->equalTo($voucher->created_at->copy()->addHours(24)));

        $this->travel(1)->hours();
        $repeat = $this->postJson('/api/v1/admin/vouchers', $data)->assertOk();
        $this->assertSame($first->json('data'), $repeat->json('data'));
        $this->postJson('/api/v1/admin/vouchers', array_replace($data, ['validity_hours' => 48]))->assertConflict();
        $this->assertDatabaseCount('vouchers', 1);
        $this->assertDatabaseCount('voucher_generation_batches', 1);

        $this->travel(23)->hours();
        Sanctum::actingAs($commuter);
        $this->getJson('/api/v1/commuter/rewards')->assertOk()->assertJsonPath('data.availableVoucherCount', 0);
        $this->assertSame(Voucher::STATUS_EXPIRED, $voucher->fresh()->status);
    }

    public function test_no_time_limit_remains_redeemable_after_time_passes(): void
    {
        $commuter = User::factory()->commuter()->create();
        foreach (['FREE_RIDE', 'DISCOUNT'] as $type) {
            $this->postJson('/api/v1/admin/vouchers', [
                'type' => $type, 'quantity' => 1, 'amount' => 5, 'validity_hours' => null,
            ])->assertCreated()->assertJsonPath('data.0.expires_at', null);
        }
        $this->travel(90)->days();
        Sanctum::actingAs($commuter);
        $this->getJson('/api/v1/commuter/rewards')->assertOk()->assertJsonPath('data.availableVoucherCount', 2);
        $this->assertSame(2, Voucher::redeemable()->count());
    }

    public function test_time_limits_shorter_than_24_hours_or_conflicting_expiry_inputs_are_rejected(): void
    {
        $this->freezeTime();
        User::factory()->commuter()->create();
        foreach ([0, 23, 24.5, 87601] as $hours) {
            $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'validity_hours' => $hours])
                ->assertUnprocessable()->assertJsonValidationErrors('validity_hours');
        }
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'expires_at' => now()->addHours(23)->toIso8601String()])
            ->assertUnprocessable()->assertJsonValidationErrors('expires_at');
        $this->postJson('/api/v1/admin/vouchers', [
            'type' => 'FREE_RIDE', 'validity_hours' => 24, 'expires_at' => now()->addDays(2)->toIso8601String(),
        ])->assertUnprocessable()->assertJsonValidationErrors('expires_at');
        $this->assertDatabaseCount('vouchers', 0);
        $this->assertDatabaseCount('voucher_generation_batches', 0);
        $this->assertDatabaseCount('announcements', 0);

        $expiry = now()->addHours(24)->toIso8601String();
        $response = $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'expires_at' => $expiry])->assertCreated();
        $this->assertTrue(Voucher::findOrFail($response->json('data.0.id'))->expires_at->equalTo($expiry));
    }

    public function test_ineligible_profiles_users_and_active_suspensions_are_excluded(): void
    {
        $eligible = User::factory()->commuter()->create();
        $pending = User::factory()->commuter()->create();
        $pending->commuterProfile->update(['account_status' => 'PENDING']);
        $unverified = User::factory()->commuter()->create();
        $unverified->commuterProfile->update(['verified_at' => null]);
        $deletedProfile = User::factory()->commuter()->create();
        $deletedProfile->commuterProfile->delete();
        $deletedUser = User::factory()->commuter()->create();
        $deletedUser->delete();
        $wrongRole = User::factory()->commuter()->create();
        $wrongRole->update(['role' => 'ADMIN']);
        $suspended = User::factory()->commuter()->create();
        DB::table('user_suspensions')->insert([
            'id' => (string) Str::uuid(), 'user_id' => $suspended->id,
            'reason_code' => 'TEST', 'reason' => 'Suspended', 'starts_at' => now(),
            'ends_at' => now()->addDay(), 'is_permanent' => false,
        ]);

        $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'quantity' => 1])
            ->assertCreated()->assertJsonPath('data.0.commuter_id', $eligible->id);
    }

    public function test_insufficient_recipients_and_empty_population_leave_no_partial_batch(): void
    {
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'quantity' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');
        User::factory()->count(2)->commuter()->create();
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'quantity' => 3])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->assertDatabaseCount('vouchers', 0);
        $this->assertDatabaseCount('voucher_generation_batches', 0);
    }

    public function test_repeat_recipients_require_explicit_opt_in(): void
    {
        $commuter = User::factory()->commuter()->create();
        $this->postJson('/api/v1/admin/vouchers', [
            'type' => 'DISCOUNT', 'quantity' => 10, 'amount' => 5, 'allow_duplicates' => true,
        ])->assertCreated()->assertJsonCount(10, 'data');
        $this->assertSame(10, Voucher::where('commuter_id', $commuter->id)->count());
        $this->assertCount(10, Voucher::pluck('recipient_slot')->unique());
        $this->assertDatabaseCount('announcements', 1);
        $this->assertDatabaseHas('announcements', ['user_id' => $commuter->id, 'type' => 'voucher_received']);
    }

    public function test_request_replays_return_the_original_batch_and_reject_changed_details(): void
    {
        User::factory()->count(4)->commuter()->create();
        $data = ['type' => 'DISCOUNT', 'quantity' => 2, 'amount' => 5, 'idempotency_key' => (string) Str::uuid()];
        $first = $this->postJson('/api/v1/admin/vouchers', $data)->assertCreated();
        $repeat = $this->postJson('/api/v1/admin/vouchers', $data)->assertOk();
        $this->assertSame($first->json('data'), $repeat->json('data'));
        $this->postJson('/api/v1/admin/vouchers', array_replace($data, ['quantity' => 3]))->assertConflict();
        $this->assertDatabaseCount('vouchers', 2);
        $this->assertDatabaseCount('voucher_generation_batches', 1);
        $this->assertDatabaseCount('activity_logs', 1);
        $this->assertDatabaseCount('announcements', 2);
    }

    public function test_failed_bulk_insert_rolls_back_and_the_same_request_can_be_retried(): void
    {
        User::factory()->count(3)->commuter()->create();
        $fail = true;
        DB::listen(function (QueryExecuted $query) use (&$fail): void {
            if ($fail && preg_match('/^insert into ["`]vouchers["`]/i', $query->sql)) {
                $fail = false;
                throw new \RuntimeException('Simulated distribution failure');
            }
        });
        $data = ['type' => 'FREE_RIDE', 'quantity' => 3, 'idempotency_key' => (string) Str::uuid()];
        $this->withoutExceptionHandling();
        try {
            $this->postJson('/api/v1/admin/vouchers', $data);
            $this->fail('Distribution should have failed.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated distribution failure', $exception->getMessage());
        }
        $this->assertDatabaseCount('vouchers', 0);
        $this->assertDatabaseCount('voucher_generation_batches', 0);
        $this->postJson('/api/v1/admin/vouchers', $data)->assertCreated()->assertJsonCount(3, 'data');
    }

    public function test_selection_queries_are_bounded_and_vouchers_use_one_bulk_insert(): void
    {
        User::factory()->count(150)->commuter()->create();
        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'DISCOUNT', 'quantity' => 100, 'amount' => 3])
            ->assertCreated()->assertJsonCount(100, 'data');
        $inserts = array_filter($queries, fn ($sql) => preg_match('/^insert into ["`]vouchers["`]/i', $sql));
        $selection = array_filter($queries, fn ($sql) => preg_match('/from ["`]commuter_profiles["`] inner join ["`]users["`]/i', $sql));
        $this->assertCount(1, $inserts);
        $this->assertCount(1, array_filter($queries, fn ($sql) => preg_match('/^insert into ["`]announcements["`]/i', $sql)));
        $this->assertLessThanOrEqual(2, count($selection));
        $this->assertNotEmpty($selection);
        foreach ($selection as $sql) {
            $this->assertStringContainsString('limit ', strtolower($sql));
            $this->assertStringNotContainsString('random(', strtolower($sql));
            $this->assertStringNotContainsString('rand(', strtolower($sql));
            $this->assertStringNotContainsString('offset ', strtolower($sql));
        }
    }

    public function test_authorization_and_discount_quantity_expiry_and_manipulation_validation(): void
    {
        foreach ([
            ['type' => 'DISCOUNT'], ['type' => 'DISCOUNT', 'amount' => 0],
            ['type' => 'DISCOUNT', 'amount' => -1], ['type' => 'DISCOUNT', 'amount' => 1.234],
            ['type' => 'REWARD'], ['type' => 'FREE_RIDE', 'quantity' => 0],
            ['type' => 'FREE_RIDE', 'quantity' => 101], ['type' => 'FREE_RIDE', 'expires_at' => now()->subDay()->toIso8601String()],
            ['type' => 'FREE_RIDE', 'status' => 'USED'], ['type' => 'FREE_RIDE', 'commuter_id' => (string) Str::uuid()],
        ] as $data) {
            $this->postJson('/api/v1/admin/vouchers', $data)->assertUnprocessable();
        }
        Sanctum::actingAs(User::factory()->commuter()->create());
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE'])->assertForbidden();
        $this->assertDatabaseCount('vouchers', 0);
    }

    public function test_voucher_notice_is_private_unread_and_can_be_marked_read(): void
    {
        $commuters = User::factory()->count(3)->commuter()->create();
        $response = $this->postJson('/api/v1/admin/vouchers', ['type' => 'DISCOUNT', 'quantity' => 1, 'amount' => 5.25])
            ->assertCreated();
        $recipientId = $response->json('data.0.commuter_id');
        $notice = Announcement::where('type', 'voucher_received')->firstOrFail();
        $this->assertSame($recipientId, $notice->user_id);
        $this->assertStringContainsString('₱5.25 discount voucher', $notice->message);
        $this->assertStringContainsString('No time limit.', $notice->message);
        $this->assertStringContainsString('Each voucher can be used once.', $notice->message);

        Sanctum::actingAs($commuters->firstWhere('id', $recipientId));
        $this->getJson('/api/v1/announcements')->assertOk()->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.type', 'voucher_received')->assertJsonPath('data.data.0.is_read', false);
        $this->getJson('/api/v1/announcements/unread-count')->assertOk()->assertJsonPath('data.count', 1);
        $this->postJson('/api/v1/announcements/'.$notice->id.'/read')->assertOk();
        $this->postJson('/api/v1/announcements/'.$notice->id.'/read')->assertOk();
        $this->getJson('/api/v1/announcements/unread-count')->assertOk()->assertJsonPath('data.count', 0);

        Sanctum::actingAs($commuters->first(fn ($user) => $user->id !== $recipientId));
        $this->getJson('/api/v1/announcements')->assertOk()->assertJsonCount(0, 'data.data');
        $this->getJson('/api/v1/announcements/unread-count')->assertOk()->assertJsonPath('data.count', 0);
        $this->postJson('/api/v1/announcements/'.$notice->id.'/read')->assertNotFound();
        $this->assertDatabaseCount('announcement_reads', 1);
    }

    public function test_notification_failure_rolls_back_the_entire_distribution_and_allows_retry(): void
    {
        User::factory()->count(3)->commuter()->create();
        $fail = true;
        DB::listen(function (QueryExecuted $query) use (&$fail): void {
            if ($fail && preg_match('/^insert into ["`]announcements["`]/i', $query->sql)) {
                $fail = false;
                throw new \RuntimeException('Simulated notification failure');
            }
        });
        $data = ['type' => 'FREE_RIDE', 'quantity' => 3, 'idempotency_key' => (string) Str::uuid()];
        $this->withoutExceptionHandling();
        try {
            $this->postJson('/api/v1/admin/vouchers', $data);
            $this->fail('Distribution should have failed.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated notification failure', $exception->getMessage());
        }
        $this->assertDatabaseCount('vouchers', 0);
        $this->assertDatabaseCount('voucher_generation_batches', 0);
        $this->assertDatabaseCount('announcements', 0);
        $this->postJson('/api/v1/admin/vouchers', $data)->assertCreated()->assertJsonCount(3, 'data');
        $this->assertDatabaseCount('announcements', 3);
    }
}
