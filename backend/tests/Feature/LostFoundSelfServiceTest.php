<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\LostItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Lost & Found commuter self-service — DB-backed claim state.
 *
 *   GET    /api/v1/commuter/claims              — the commuter's own claims
 *   DELETE /api/v1/lost-found/claims/{claimId}  — withdraw own PENDING claim
 *
 * These endpoints let the commuter UI persist claim state (badges, the
 * "My Claims" tab, the 3-pending cap, cancel) in the DB instead of React
 * state. Verifies:
 *   - my-claims returns only the auth commuter's claims, item eager-loaded
 *   - cancel deletes the PENDING claim and reverts the item to AVAILABLE
 *     when it was the last pending claim
 *   - item stays CLAIMED when another commuter's pending claim remains
 *   - cannot cancel another commuter's claim (404)
 *   - cannot cancel an APPROVED claim (422)
 *   - role enforcement: admin cannot cancel; unauthenticated → 401
 */
class LostFoundSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $commuter;
    private User $otherCommuter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->commuter = User::factory()->commuter()->create();
        $this->otherCommuter = User::factory()->commuter()->create();
    }

    private function createItem(string $name = 'Blue Backpack'): LostItem
    {
        return LostItem::create([
            'item_name'        => $name,
            'description'      => 'Test item',
            'category'         => 'BAG',
            'reported_by_id'   => $this->admin->id,
            'reported_by_role' => 'ADMIN',
            'reporter_name'    => 'Admin',
            'status'           => 'AVAILABLE',
        ]);
    }

    private function claimAs(User $commuter, LostItem $item): Claim
    {
        Sanctum::actingAs($commuter);
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", [
            'proof' => 'It has my initials on the strap.',
        ]);
        $response->assertStatus(201);
        return Claim::findOrFail($response->json('data.id'));
    }

    // ── GET /commuter/claims ────────────────────────────────────

    public function test_commuter_sees_only_their_own_claims_with_item(): void
    {
        $itemA = $this->createItem('Item A');
        $itemB = $this->createItem('Item B');
        $mine = $this->claimAs($this->commuter, $itemA);
        $this->claimAs($this->otherCommuter, $itemB);

        Sanctum::actingAs($this->commuter);
        $response = $this->getJson('/api/v1/commuter/claims');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id)
            ->assertJsonPath('data.0.status', 'PENDING')
            ->assertJsonPath('data.0.item.id', $itemA->id)
            ->assertJsonPath('data.0.item.item_name', 'Item A');
    }

    public function test_my_claims_requires_commuter_role(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/commuter/claims')->assertStatus(403);
    }

    // ── DELETE /lost-found/claims/{claimId} ─────────────────────

    public function test_commuter_can_cancel_pending_claim_and_item_reverts(): void
    {
        $item = $this->createItem();
        $claim = $this->claimAs($this->commuter, $item);
        $this->assertEquals('CLAIMED', $item->fresh()->status);

        Sanctum::actingAs($this->commuter);
        $response = $this->deleteJson("/api/v1/lost-found/claims/{$claim->id}");

        $response->assertStatus(200)->assertJsonPath('success', true);
        $this->assertDatabaseMissing('claims', ['id' => $claim->id]);
        // Last pending claim gone → item claimable again.
        $this->assertEquals('AVAILABLE', $item->fresh()->status);
    }

    public function test_item_stays_claimed_when_other_pending_claims_remain(): void
    {
        $item = $this->createItem();
        $mine = $this->claimAs($this->commuter, $item);
        $this->claimAs($this->otherCommuter, $item);

        Sanctum::actingAs($this->commuter);
        $this->deleteJson("/api/v1/lost-found/claims/{$mine->id}")->assertStatus(200);

        $this->assertEquals('CLAIMED', $item->fresh()->status);
    }

    public function test_cannot_cancel_another_commuters_claim(): void
    {
        $item = $this->createItem();
        $theirs = $this->claimAs($this->otherCommuter, $item);

        Sanctum::actingAs($this->commuter);
        $this->deleteJson("/api/v1/lost-found/claims/{$theirs->id}")->assertStatus(404);

        $this->assertDatabaseHas('claims', ['id' => $theirs->id]);
    }

    public function test_cannot_cancel_approved_claim(): void
    {
        $item = $this->createItem();
        $claim = $this->claimAs($this->commuter, $item);

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve")
            ->assertStatus(200);

        Sanctum::actingAs($this->commuter);
        $this->deleteJson("/api/v1/lost-found/claims/{$claim->id}")->assertStatus(422);

        $this->assertDatabaseHas('claims', ['id' => $claim->id, 'status' => 'APPROVED']);
    }

    public function test_admin_cannot_cancel_claims(): void
    {
        $item = $this->createItem();
        $claim = $this->claimAs($this->commuter, $item);

        Sanctum::actingAs($this->admin);
        $this->deleteJson("/api/v1/lost-found/claims/{$claim->id}")->assertStatus(403);
    }

    public function test_unauthenticated_cannot_cancel(): void
    {
        $item = $this->createItem();
        $claim = $this->claimAs($this->commuter, $item);

        // Fresh app instance so the Sanctum user from claimAs isn't cached.
        $this->refreshApplication();

        $this->deleteJson("/api/v1/lost-found/claims/{$claim->id}")->assertStatus(401);
    }
}
