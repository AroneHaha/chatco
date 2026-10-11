<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConductorReceiptSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_conductor_can_read_only_whitelisted_receipt_settings(): void
    {
        $conductor = User::factory()->create(['role' => UserRole::CONDUCTOR]);

        Setting::create(['key' => 'receipt_business_name', 'value' => 'CHATCO EXPRESS', 'category' => 'receipt']);
        Setting::create(['key' => 'private_admin_setting', 'value' => 'must-not-leak', 'category' => 'receipt']);

        $response = $this->actingAs($conductor)
            ->getJson('/api/v1/conductor/receipt-settings')
            ->assertOk()
            ->assertJsonPath('data.receipt_business_name', 'CHATCO EXPRESS')
            ->assertJsonPath('data.receipt_paper_width', '58')
            ->assertJsonPath('data.receipt_show_qr_code', 'true')
            ->assertJsonPath('data.receipt_show_manual_code', 'true');

        $this->assertArrayNotHasKey('private_admin_setting', $response->json('data'));
    }

    public function test_receipt_settings_endpoint_rejects_other_roles_and_guests(): void
    {
        $this->getJson('/api/v1/conductor/receipt-settings')->assertUnauthorized();

        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->actingAs($admin)->getJson('/api/v1/conductor/receipt-settings')->assertForbidden();
    }

    public function test_admin_can_save_qr_and_manual_code_visibility_independently(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $conductor = User::factory()->create(['role' => UserRole::CONDUCTOR]);

        foreach ([['true', 'true'], ['true', 'false'], ['false', 'true'], ['false', 'false']] as [$showQr, $showCode]) {
            $this->actingAs($admin)
                ->putJson('/api/v1/admin/settings/receipt_show_qr_code', ['value' => $showQr, 'category' => 'receipt'])
                ->assertOk();
            $this->actingAs($admin)
                ->putJson('/api/v1/admin/settings/receipt_show_manual_code', ['value' => $showCode, 'category' => 'receipt'])
                ->assertOk();

            $this->actingAs($conductor)
                ->getJson('/api/v1/conductor/receipt-settings')
                ->assertOk()
                ->assertJsonPath('data.receipt_show_qr_code', $showQr)
                ->assertJsonPath('data.receipt_show_manual_code', $showCode);
        }
    }
}
