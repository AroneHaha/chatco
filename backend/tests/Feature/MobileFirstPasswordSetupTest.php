<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MobileFirstPasswordSetupTest extends TestCase
{
    use RefreshDatabase;

    private function flaggedToken(): array
    {
        $user = User::create(['email' => 'setup@chatco.test', 'password' => Hash::make('Temporary123!'), 'role' => UserRole::COMMUTER]);
        $user->must_change_password = true;
        $user->save();

        return [$user, $user->createToken('mobile')->plainTextToken];
    }

    public function test_flagged_mobile_can_restore_minimal_session_but_not_operate(): void
    {
        [$user, $token] = $this->flaggedToken();
        $this->withToken($token)->getJson('/api/v1/mobile/auth/session')
            ->assertOk()->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.must_change_password', true)
            ->assertJsonMissingPath('data.token')->assertJsonMissingPath('data.profile');
        $this->withToken($token)->getJson('/api/v1/mobile/commuter/profile')
            ->assertForbidden()->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
        $this->withToken($token)->getJson('/api/v1/mobile/user')->assertForbidden();
    }

    public function test_mobile_setup_validates_and_then_revokes_every_token(): void
    {
        [$user, $token] = $this->flaggedToken();
        $user->createToken('other-device');
        $this->withToken($token)->postJson('/api/v1/mobile/auth/set-new-password', ['password' => 'weak', 'password_confirmation' => 'weak'])->assertUnprocessable();
        $this->assertTrue($user->fresh()->must_change_password);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/set-new-password', ['password' => 'NewPassword123!', 'password_confirmation' => 'NewPassword123!'])->assertOk();
        $this->assertFalse($user->fresh()->must_change_password);
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/mobile/auth/session')->assertUnauthorized();
    }

    public function test_flagged_mobile_can_logout_without_activation(): void
    {
        [$user, $token] = $this->flaggedToken();
        $this->withToken($token)->postJson('/api/v1/mobile/auth/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
        $this->assertTrue($user->fresh()->must_change_password);
    }

    public function test_session_requires_authentication(): void
    {
        $this->getJson('/api/v1/mobile/auth/session')->assertUnauthorized();
        $this->postJson('/api/v1/mobile/auth/set-new-password')->assertUnauthorized();
    }
}
