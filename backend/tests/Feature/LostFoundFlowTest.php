<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\LostItem;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Sprint 6 (T3) — Lost & Found workflow (revised scope).
 *
 * Covers the revised S6 scope: admin adds items + uploads images, commuters
 * browse + claim with proof + watchlist, admin approves/rejects claims,
 * approved → released (2-stage: approve then release, with post-approval
 * reject option), admin closes, audit trail via reviewed_by/reviewed_at/
 * rejection_reason on claims.
 *
 * Two-stage approve workflow:
 *   PENDING → (approve) → APPROVED [item → APPROVED] → (release) → item RELEASED
 *   PENDING → (reject)  → REJECTED [item reverts to AVAILABLE if no pending claims]
 *   APPROVED → (reject) → REJECTED [post-approval reversal; item reverts]
 *
 * Endpoints:
 *   GET    /api/v1/lost-found                          (any auth)
 *   GET    /api/v1/lost-found/{itemId}                 (any auth)
 *   POST   /api/v1/lost-found/{itemId}/claim           (COMMUTER)
 *   POST   /api/v1/lost-found/{itemId}/watchlist       (COMMUTER)
 *   DELETE /api/v1/lost-found/{itemId}/watchlist       (COMMUTER)
 *   GET    /api/v1/commuter/watchlist                  (COMMUTER)
 *   GET    /api/v1/admin/lost-items                    (ADMIN)
 *   POST   /api/v1/admin/lost-items                    (ADMIN)
 *   GET    /api/v1/admin/lost-items/{itemId}           (ADMIN)
 *   POST   /api/v1/admin/lost-items/{itemId}/image     (ADMIN)
 *   GET    /api/v1/admin/lost-items/{itemId}/claims    (ADMIN)
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/approve  (ADMIN)
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/release  (ADMIN)
 *   PATCH  /api/v1/admin/lost-items/{itemId}/claims/{claimId}/reject   (ADMIN)
 *   PATCH  /api/v1/admin/lost-items/{itemId}/close     (ADMIN)
 */
class LostFoundFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $commuter;

    private User $otherCommuter;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->admin = User::factory()->admin()->create();
        $this->commuter = User::factory()->commuter()->create();
        $this->otherCommuter = User::factory()->commuter()->create();
        $this->vehicle = Vehicle::factory()->create();
    }

    private function admin(): void
    {
        Sanctum::actingAs($this->admin);
    }

    private function commuter(): void
    {
        Sanctum::actingAs($this->commuter);
    }

    private function otherCommuter(): void
    {
        Sanctum::actingAs($this->otherCommuter);
    }

    private function createItem(): LostItem
    {
        $this->admin();
        $response = $this->postJson('/api/v1/admin/lost-items', [
            'item_name' => 'Blue Backpack',
            'description' => 'Navy blue Jansport backpack left near back row',
            'category' => 'BAG',
            'vehicle_id' => $this->vehicle->id,
        ]);
        $response->assertStatus(201);

        return LostItem::where('item_name', 'Blue Backpack')->first();
    }

    // ── Admin: create + list ────────────────────────────────────

    public function test_admin_can_create_lost_item(): void
    {
        $this->admin();
        $response = $this->postJson('/api/v1/admin/lost-items', [
            'item_name' => 'Phone',
            'description' => 'Black Samsung phone',
            'category' => 'ELECTRONICS',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'AVAILABLE')
            ->assertJsonPath('data.item_name', 'Phone');

        $this->assertDatabaseHas('lost_items', [
            'item_name' => 'Phone',
            'status' => 'AVAILABLE',
        ]);
    }

    public function test_commuter_cannot_create_lost_item(): void
    {
        $this->commuter();
        $response = $this->postJson('/api/v1/admin/lost-items', [
            'item_name' => 'Phone',
            'description' => 'Black Samsung phone',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_list_includes_claims(): void
    {
        $item = $this->createItem();
        // Submit a claim as commuter
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", [
            'proof' => 'Has my ID inside',
        ]);

        $this->admin();
        $response = $this->getJson('/api/v1/admin/lost-items');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        // The items collection should include our item with claims loaded
        $items = $response->json('data.data');
        $this->assertNotEmpty($items);
    }

    // ── Browse (any auth role) ───────────────────────────────────

    public function test_any_auth_role_can_browse_lost_found(): void
    {
        $this->createItem();

        $this->commuter();
        $response = $this->getJson('/api/v1/lost-found');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $items = $response->json('data.data');
        $this->assertNotEmpty($items);
    }

    public function test_unauthenticated_cannot_browse(): void
    {
        $response = $this->getJson('/api/v1/lost-found');
        $response->assertStatus(401);
    }

    public function test_browse_filters_by_status(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->getJson('/api/v1/lost-found?status=AVAILABLE');
        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('data.data'));

        $response = $this->getJson('/api/v1/lost-found?status=CLOSED');
        $response->assertStatus(200);
        $this->assertEmpty($response->json('data.data'));
    }

    public function test_show_returns_item_detail(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->getJson("/api/v1/lost-found/{$item->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $item->id)
            ->assertJsonPath('data.item_name', 'Blue Backpack');
    }

    public function test_show_returns_404_for_missing_item(): void
    {
        $this->commuter();
        $response = $this->getJson('/api/v1/lost-found/nonexistent-id');
        $response->assertStatus(404);
    }

    // ── Claim (COMMUTER) ────────────────────────────────────────

    public function test_commuter_can_claim_available_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", [
            'proof' => 'Has my student ID in the front pocket',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PENDING');

        $this->assertDatabaseHas('claims', [
            'item_id' => $item->id,
            'status' => 'PENDING',
            'proof' => 'Has my student ID in the front pocket',
        ]);

        // Item status flips to CLAIMED
        $this->assertDatabaseHas('lost_items', [
            'id' => $item->id,
            'status' => 'CLAIMED',
        ]);
    }

    public function test_claim_requires_proof(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", []);

        $response->assertStatus(422);
    }

    public function test_admin_cannot_claim_item(): void
    {
        $item = $this->createItem();

        $this->admin();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", [
            'proof' => 'test',
        ]);

        $response->assertStatus(403);
    }

    public function test_cannot_claim_approved_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve")
            ->assertStatus(200);

        // Second commuter tries to claim the now-APPROVED item
        $this->otherCommuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $response->assertStatus(422);
    }

    public function test_cannot_claim_released_item(): void
    {
        $item = $this->createItem();

        // Approve + release → item becomes RELEASED
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve")
            ->assertStatus(200);
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release")
            ->assertStatus(200);

        // Second commuter tries to claim the now-RELEASED item
        $this->otherCommuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $response->assertStatus(422);
    }

    public function test_cannot_claim_closed_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/close");

        $this->otherCommuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $response->assertStatus(422);
    }

    public function test_multiple_commuters_can_claim_same_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'commuter 1 proof'])
            ->assertStatus(201);

        $this->otherCommuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'commuter 2 proof'])
            ->assertStatus(201);

        $this->assertEquals(2, Claim::where('item_id', $item->id)->count());
    }

    public function test_admin_can_record_a_walk_in_claimant_without_an_account(): void
    {
        $item = $this->createItem();
        $this->admin();

        $this->postJson("/api/v1/admin/lost-items/{$item->id}/claims/manual", [
            'claimant_name' => 'Walk In Claimant',
            'claimant_contact' => '+639171234567',
            'claimant_email' => 'walkin@example.com',
            'proof' => 'Presented a matching bag keychain and a government ID.',
        ])->assertStatus(201)
            ->assertJsonPath('data.claimant_name', 'Walk In Claimant')
            ->assertJsonPath('data.claimant_id', null);

        $this->assertDatabaseHas('claims', [
            'item_id' => $item->id,
            'claimant_id' => null,
            'claimant_name' => 'Walk In Claimant',
            'claimant_contact' => '+639171234567',
            'claimant_email' => 'walkin@example.com',
            'status' => 'PENDING',
        ]);
    }

    // ── Admin: approve / release / reject / close ──────────────

    public function test_admin_can_approve_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'APPROVED');

        // Stage 1: approve → item APPROVED (not RELEASED yet)
        $this->assertDatabaseHas('lost_items', [
            'id' => $item->id,
            'status' => 'APPROVED',
        ]);
        // released_to/released_at NOT set until release
        $this->assertNull(LostItem::find($item->id)->released_to);
        $this->assertNull(LostItem::find($item->id)->released_at);
    }

    public function test_admin_can_release_approved_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");

        // Stage 2: release → item RELEASED, released_to set
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");
        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertDatabaseHas('lost_items', [
            'id' => $item->id,
            'status' => 'RELEASED',
            'released_to' => $this->commuter->commuterProfile->id,
        ]);
        $this->assertNotNull(LostItem::find($item->id)->released_at);
    }

    public function test_cannot_release_pending_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        // Try to release without approving first
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");
        $response->assertStatus(422);
    }

    public function test_cannot_release_already_released(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");
        $response->assertStatus(422);
    }

    public function test_approve_auto_rejects_other_pending_claims(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'commuter 1']);

        $this->otherCommuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'commuter 2']);

        $this->admin();
        // Approve the first commuter's claim (deterministic by claimant_id)
        $firstClaim = Claim::where('item_id', $item->id)
            ->where('claimant_id', $this->commuter->commuterProfile->id)
            ->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$firstClaim->id}/approve");

        // The other commuter's claim should be auto-rejected
        $otherClaim = Claim::where('item_id', $item->id)
            ->where('claimant_id', $this->otherCommuter->commuterProfile->id)
            ->first();
        $this->assertEquals('REJECTED', $otherClaim->fresh()->status);
        $this->assertEquals('Another claim was approved', $otherClaim->fresh()->rejection_reason);
    }

    public function test_admin_can_reject_pending_claim_with_reason(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/reject", [
            'rejection_reason' => 'Proof does not match item description',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.rejection_reason', 'Proof does not match item description');

        // Item reverts to AVAILABLE (no pending claims remain)
        $this->assertDatabaseHas('lost_items', [
            'id' => $item->id,
            'status' => 'AVAILABLE',
        ]);
    }

    public function test_admin_can_reject_approved_claim_post_approval(): void
    {
        // Post-approval reversal: approve then reject (something invalidates the approval)
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");

        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/reject", [
            'rejection_reason' => 'Claimant could not provide ID at handover',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'REJECTED');

        // Item reverts to AVAILABLE (no pending claims remain)
        $this->assertDatabaseHas('lost_items', [
            'id' => $item->id,
            'status' => 'AVAILABLE',
        ]);
    }

    public function test_cannot_approve_already_approved_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");

        $response->assertStatus(422);
    }

    public function test_cannot_reject_already_rejected_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/reject", ['rejection_reason' => 'no']);
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/reject", ['rejection_reason' => 'no']);

        $response->assertStatus(422);
    }

    public function test_admin_can_close_released_item(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/release");

        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/close");
        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'CLOSED');

        $this->assertNotNull(LostItem::find($item->id)->closed_at);
    }

    public function test_cannot_close_available_item(): void
    {
        $item = $this->createItem();

        $this->admin();
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/close");
        $response->assertStatus(422);
    }

    public function test_cannot_close_approved_item(): void
    {
        // APPROVED but not RELEASED → cannot close
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $claim = Claim::where('item_id', $item->id)->first();
        $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");

        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/close");
        $response->assertStatus(422);
    }

    public function test_commuter_cannot_approve_claim(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $claim = Claim::where('item_id', $item->id)->first();
        // Still acting as commuter
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/{$claim->id}/approve");
        $response->assertStatus(403);
    }

    public function test_admin_claims_list_for_item(): void
    {
        $item = $this->createItem();
        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/claim", ['proof' => 'mine']);

        $this->admin();
        $response = $this->getJson("/api/v1/admin/lost-items/{$item->id}/claims");
        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_approve_nonexistent_claim_returns_404(): void
    {
        $item = $this->createItem();
        $this->admin();
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/nonexistent-claim/approve");
        $response->assertStatus(404);
    }

    public function test_release_nonexistent_claim_returns_404(): void
    {
        $item = $this->createItem();
        $this->admin();
        $response = $this->patchJson("/api/v1/admin/lost-items/{$item->id}/claims/nonexistent-claim/release");
        $response->assertStatus(404);
    }

    // ── Watchlist (COMMUTER) ───────────────────────────────────

    public function test_commuter_can_watchlist_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('lost_item_watchlists', [
            'item_id' => $item->id,
            'commuter_id' => $this->commuter->commuterProfile->id,
        ]);
    }

    public function test_watchlist_is_idempotent(): void
    {
        $item = $this->createItem();

        $this->commuter();
        // First add → 201
        $this->postJson("/api/v1/lost-found/{$item->id}/watchlist")
            ->assertStatus(201);

        // Second add → 200 (already watching)
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");
        $response->assertStatus(200);

        // Still only one row
        $this->assertDatabaseCount('lost_item_watchlists', 1);
    }

    public function test_commuter_can_unwatchlist_item(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");
        $response = $this->deleteJson("/api/v1/lost-found/{$item->id}/watchlist");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('lost_item_watchlists', [
            'item_id' => $item->id,
        ]);
    }

    public function test_unwatchlist_is_idempotent(): void
    {
        $item = $this->createItem();

        $this->commuter();
        // Delete without adding first → still 200
        $response = $this->deleteJson("/api/v1/lost-found/{$item->id}/watchlist");
        $response->assertStatus(200);
    }

    public function test_commuter_can_list_watchlist(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");

        $response = $this->getJson('/api/v1/commuter/watchlist');
        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $entries = $response->json('data.data');
        $this->assertNotEmpty($entries);
        $this->assertEquals($item->id, $entries[0]['item_id']);
    }

    public function test_admin_cannot_watchlist_item(): void
    {
        $item = $this->createItem();

        $this->admin();
        $response = $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");
        $response->assertStatus(403);
    }

    public function test_watchlist_deleted_when_item_deleted(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $this->postJson("/api/v1/lost-found/{$item->id}/watchlist");
        $this->assertDatabaseCount('lost_item_watchlists', 1);

        // Delete the item (cascade should remove watchlist entries)
        $item->delete();
        $this->assertDatabaseCount('lost_item_watchlists', 0);
    }

    // ── Image upload (ADMIN) ───────────────────────────────────

    public function test_admin_can_upload_lost_item_image(): void
    {
        $item = $this->createItem();

        $this->admin();
        $response = $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->image('backpack.jpg', 800, 600),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // image_url is set and file exists on disk
        $item->refresh();
        $this->assertNotNull($item->image_url);
        Storage::disk('public')->assertExists(
            $this->extractPathFromUrl($item->image_url)
        );
    }

    public function test_image_upload_validates_file_type(): void
    {
        $item = $this->createItem();

        $this->admin();
        $response = $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]);

        $response->assertStatus(422);
    }

    public function test_image_upload_validates_file_size(): void
    {
        $item = $this->createItem();

        $this->admin();
        // 6MB file → exceeds 5MB limit
        $response = $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->image('huge.jpg')->size(6144),
        ]);

        $response->assertStatus(422);
    }

    public function test_commuter_cannot_upload_image(): void
    {
        $item = $this->createItem();

        $this->commuter();
        $response = $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->image('backpack.jpg', 100, 100),
        ]);

        $response->assertStatus(403);
    }

    public function test_image_upload_replaces_previous_image(): void
    {
        $item = $this->createItem();

        $this->admin();
        // First upload
        $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->image('first.jpg', 800, 600),
        ]);
        $item->refresh();
        $firstUrl = $item->image_url;
        $firstPath = $this->extractPathFromUrl($firstUrl);
        Storage::disk('public')->assertExists($firstPath);

        // Second upload — should replace the first
        $this->postJson("/api/v1/admin/lost-items/{$item->id}/image", [
            'image' => UploadedFile::fake()->image('second.jpg', 800, 600),
        ]);
        $item->refresh();
        $secondUrl = $item->image_url;

        $this->assertNotEquals($firstUrl, $secondUrl);
        // Old file should be deleted
        Storage::disk('public')->assertMissing($firstPath);
    }

    public function test_image_upload_returns_404_for_missing_item(): void
    {
        $this->admin();
        $response = $this->postJson('/api/v1/admin/lost-items/nonexistent-id/image', [
            'image' => UploadedFile::fake()->image('test.jpg', 100, 100),
        ]);

        $response->assertStatus(404);
    }

    /**
     * Extract the storage-relative path from a public-disk URL so we can
     * use Storage::assertExists/assetMissing in tests.
     */
    private function extractPathFromUrl(string $url): string
    {
        $parts = parse_url($url);
        $path = $parts['path'] ?? '';
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        }

        return $path;
    }
}
