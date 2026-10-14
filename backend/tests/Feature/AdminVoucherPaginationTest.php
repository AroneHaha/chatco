<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminVoucherPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_voucher_results_are_paginated(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        for ($index = 0; $index < 25; $index++) {
            Voucher::forceCreate([
                'code' => 'ADMIN-'.str_pad((string) $index, 8, '0', STR_PAD_LEFT),
                'type' => 'FREE_RIDE',
                'status' => 'Active',
                'amount' => null,
                'ride_origin' => 'Any',
            ]);
        }

        $this->getJson('/api/v1/admin/vouchers?per_page=20&page=1')
            ->assertOk()
            ->assertJsonCount(20, 'data.data')
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonPath('data.total', 25)
            ->assertJsonPath('data.data.0.generated_by_id', null);

        $this->getJson('/api/v1/admin/vouchers?per_page=20&page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data.data')
            ->assertJsonPath('data.current_page', 2);
    }

    public function test_history_shows_the_correct_recipient_admin_and_time_without_per_voucher_queries(): void
    {
        $admin = User::factory()->admin()->create();
        $admin->adminProfile->update(['first_name' => 'Lina', 'last_name' => 'Reyes']);
        User::factory()->count(25)->commuter()->create();
        Sanctum::actingAs($admin);
        $first = $this->postJson('/api/v1/admin/vouchers', ['type' => 'FREE_RIDE', 'quantity' => 25])->assertCreated();
        $historicalVoucher = Voucher::findOrFail($first->json('data.0.id'));
        $recipient = $historicalVoucher->commuter;
        $admin->adminProfile->delete();
        $recipient->delete();

        $otherAdmin = User::factory()->admin()->create();
        $otherAdmin->adminProfile->update(['first_name' => 'Marco', 'last_name' => 'Santos']);
        Sanctum::actingAs($otherAdmin);
        $this->postJson('/api/v1/admin/vouchers', ['type' => 'DISCOUNT', 'quantity' => 1, 'amount' => 7])->assertCreated();

        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $response = $this->getJson('/api/v1/admin/vouchers?per_page=100')->assertOk()
            ->assertJsonCount(26, 'data.data')->assertJsonPath('data.total', 26);
        foreach ($response->json('data.data') as $row) {
            $this->assertNotNull($row['commuter']['first_name']);
            $this->assertArrayNotHasKey('request_hash', $row);
            $this->assertArrayNotHasKey('idempotency_key', $row);
            if ($row['id'] === $historicalVoucher->id) {
                $this->assertSame($recipient->first_name, $row['commuter']['first_name']);
                $this->assertSame($historicalVoucher->created_at->toJSON(), $row['created_at']);
            }
            if ($row['generated_by_id'] === $admin->id) {
                $this->assertSame('Lina', $row['generated_by_first_name']);
                $this->assertSame('Reyes', $row['generated_by_last_name']);
            } else {
                $this->assertSame($otherAdmin->id, $row['generated_by_id']);
                $this->assertSame('Marco', $row['generated_by_first_name']);
                $this->assertSame('Santos', $row['generated_by_last_name']);
            }
        }
        $this->assertCount(1, array_filter($queries, fn ($sql) => preg_match('/from ["`]commuter_profiles["`]/i', $sql)));
        $this->assertCount(2, array_filter($queries, fn ($sql) => preg_match('/from ["`]vouchers["`]/i', $sql)));
        $this->assertCount(0, array_filter($queries, fn ($sql) => preg_match('/from ["`]admin_profiles["`]/i', $sql)));
    }

    public function test_history_defaults_to_the_last_seven_calendar_days_newest_first(): void
    {
        $this->travelTo(Carbon::parse('2026-10-13 12:00:00', config('app.timezone')));
        Sanctum::actingAs(User::factory()->admin()->create());
        $recent = $this->historyVoucher('DISCOUNT', '2026-10-13 11:00:00');
        $firstDay = $this->historyVoucher('FREE_RIDE', '2026-10-07 00:00:00');
        $this->historyVoucher('FREE_RIDE', '2026-10-06 23:59:59');
        $this->historyVoucher('FREE_RIDE', '2026-10-14 00:00:00');

        $response = $this->getJson('/api/v1/admin/vouchers?pagination=cursor')->assertOk()
            ->assertJsonCount(2, 'data.data')->assertJsonPath('data.per_page', 10)
            ->assertJsonPath('data.next_cursor', null);
        $this->assertSame([$recent->id, $firstDay->id], array_column($response->json('data.data'), 'id'));
    }

    public function test_month_and_voucher_type_filters_apply_together_on_the_server(): void
    {
        $this->travelTo(Carbon::parse('2026-10-13 12:00:00', config('app.timezone')));
        Sanctum::actingAs(User::factory()->admin()->create());
        $discount = $this->historyVoucher('DISCOUNT', '2026-10-13 11:00:00');
        $oldDiscount = $this->historyVoucher('DISCOUNT', '2026-10-01 00:00:00');
        $freeRide = $this->historyVoucher('FREE_RIDE', '2026-10-07 00:00:00');
        $previousMonth = $this->historyVoucher('DISCOUNT', '2026-09-30 23:59:59');
        $this->historyVoucher('FREE_RIDE', '2026-11-01 00:00:00');

        $monthly = $this->getJson('/api/v1/admin/vouchers?pagination=cursor&date_range=this_month&type=DISCOUNT')
            ->assertOk()->assertJsonCount(2, 'data.data');
        $this->assertSame([$discount->id, $oldDiscount->id], array_column($monthly->json('data.data'), 'id'));
        $this->getJson('/api/v1/admin/vouchers?pagination=cursor&type=DISCOUNT')
            ->assertOk()->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.id', $discount->id);
        $this->getJson('/api/v1/admin/vouchers?pagination=cursor&type=FREE_RIDE')
            ->assertOk()->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.id', $freeRide->id);
        $all = $this->getJson('/api/v1/admin/vouchers?pagination=cursor&date_range=all&type=DISCOUNT')
            ->assertOk()->assertJsonCount(3, 'data.data');
        $this->assertSame([$discount->id, $oldDiscount->id, $previousMonth->id], array_column($all->json('data.data'), 'id'));
    }

    public function test_cursor_batches_load_ten_at_a_time_without_duplicates_offsets_or_count_queries(): void
    {
        $this->travelTo(Carbon::parse('2026-10-13 12:00:00', config('app.timezone')));
        Sanctum::actingAs(User::factory()->admin()->create());
        for ($index = 0; $index < 25; $index++) {
            $this->historyVoucher('FREE_RIDE', '2026-10-13 11:00:00');
        }
        $expected = Voucher::orderByDesc('created_at')->orderByDesc('id')->pluck('id')->all();
        $first = $this->getJson('/api/v1/admin/vouchers?pagination=cursor')->assertOk()->assertJsonCount(10, 'data.data');
        $ids = array_column($first->json('data.data'), 'id');
        $this->assertSame(array_slice($expected, 0, 10), $ids);
        $cursor = $first->json('data.next_cursor');
        $this->assertNotNull($cursor);

        // Changing earlier rows must not shift the next batch's position.
        Voucher::findOrFail($ids[0])->delete();
        $newest = $this->historyVoucher('FREE_RIDE', '2026-10-13 11:30:00');
        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        foreach ([10, 5] as $size) {
            $batch = $this->getJson('/api/v1/admin/vouchers?pagination=cursor&cursor='.urlencode($cursor))
                ->assertOk()->assertJsonCount($size, 'data.data');
            $ids = array_merge($ids, array_column($batch->json('data.data'), 'id'));
            $cursor = $batch->json('data.next_cursor');
        }
        $this->assertNull($cursor);
        $this->assertSame($expected, $ids);
        $this->assertCount(25, array_unique($ids));
        $selects = array_filter($queries, fn ($sql) => preg_match('/from ["`]vouchers["`]/i', $sql));
        $this->assertCount(2, $selects);
        foreach ($selects as $sql) {
            $this->assertStringNotContainsString('count(', strtolower($sql));
            $this->assertStringNotContainsString('offset ', strtolower($sql));
            $this->assertStringContainsString('limit 11', strtolower($sql));
        }
        $this->getJson('/api/v1/admin/vouchers?pagination=cursor')->assertOk()->assertJsonPath('data.data.0.id', $newest->id);
    }

    public function test_history_rejects_invalid_filters_cursors_and_unauthorized_requests(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        foreach (['type=REWARD', 'date_range=invalid', 'pagination=invalid'] as $filter) {
            $this->getJson('/api/v1/admin/vouchers?'.$filter)->assertUnprocessable();
        }
        foreach (['invalid', base64_encode('null'), base64_encode('[]'), (new Cursor(['vouchers.id' => 'invalid', 'vouchers.created_at' => 'invalid']))->encode()] as $cursor) {
            $this->getJson('/api/v1/admin/vouchers?pagination=cursor&cursor='.urlencode($cursor))
                ->assertUnprocessable()->assertJsonValidationErrors('cursor');
        }
        Sanctum::actingAs(User::factory()->commuter()->create());
        $this->getJson('/api/v1/admin/vouchers?pagination=cursor')->assertForbidden();
    }

    private function historyVoucher(string $type, string $createdAt): Voucher
    {
        return Voucher::forceCreate([
            'code' => 'HISTORY-'.Str::upper(Str::random(10)), 'type' => $type,
            'status' => Voucher::STATUS_AVAILABLE, 'amount' => $type === 'DISCOUNT' ? 5 : null,
            'ride_origin' => 'Any', 'created_at' => Carbon::parse($createdAt, config('app.timezone')),
        ]);
    }
}
