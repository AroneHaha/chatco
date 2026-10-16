<?php

namespace Tests\Feature;

use App\Http\Middleware\BlockDuringMaintenance;
use App\Models\Setting;
use App\Models\User;
use App\Services\MaintenanceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MaintenanceAccessTest extends TestCase
{
    use RefreshDatabase;

    private function configure(string $key, string $value): void
    {
        Setting::updateOrCreate(['key' => $key], ['value' => $value, 'category' => 'app']);
    }

    public static function loginCases(): array
    {
        $cases = [];
        foreach (['/api/v1/auth/login', '/api/v1/mobile/auth/login'] as $endpoint) {
            foreach ([['COMMUTER'], ['CONDUCTOR'], ['COMMUTER', 'CONDUCTOR']] as $roles) {
                foreach (['commuter', 'conductor', 'admin'] as $role) {
                    $cases[] = [$endpoint, $roles, $role];
                }
            }
        }
        return $cases;
    }

    #[DataProvider('loginCases')]
    public function test_only_selected_roles_are_blocked_after_valid_credentials(string $endpoint, array $roles, string $role): void
    {
        $this->configure('maintenance_mode', 'true');
        $this->configure('maintenance_roles', json_encode($roles));
        $this->configure('maintenance_message', 'Service update. Please return shortly.');
        $user = User::factory()->{$role}()->create();
        $existingToken = $user->createToken('auth-token')->accessToken;

        $response = $this->postJson($endpoint, ['login' => $user->email, 'password' => 'password']);
        if (in_array(strtoupper($role), $roles, true)) {
            $response->assertStatus(503)
                ->assertJsonPath('code', 'MAINTENANCE')
                ->assertJsonPath('message', 'Service update. Please return shortly.')
                ->assertJsonPath('data', null);
            $this->assertSame([$existingToken->id], $user->tokens()->pluck('id')->all());
        } else {
            $response->assertOk()->assertJsonPath('data.role', strtoupper($role))->assertJsonStructure(['data' => ['token']]);
        }
    }

    public function test_wrong_password_keeps_normal_error_and_disabled_maintenance_allows_login(): void
    {
        $user = User::factory()->commuter()->create();
        $this->configure('maintenance_mode', 'true');
        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'wrong-password'])
            ->assertUnauthorized()->assertJsonPath('message', 'Invalid credentials')->assertJsonMissingPath('code');
        $this->assertSame(0, $user->tokens()->count());
        $this->configure('maintenance_mode', 'false');
        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'password'])->assertOk();
    }

    public function test_legacy_settings_default_to_both_roles_and_default_message(): void
    {
        $this->configure('maintenance_mode', 'true');
        $this->getJson('/api/v1/system-status')->assertOk()
            ->assertJsonPath('data.maintenance_mode', true)
            ->assertJsonPath('data.maintenance_roles', ['COMMUTER', 'CONDUCTOR'])
            ->assertJsonPath('data.maintenance_message', MaintenanceStatus::DEFAULT_MESSAGE);
        $user = User::factory()->commuter()->create();
        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'password'])
            ->assertStatus(503)->assertJsonPath('message', MaintenanceStatus::DEFAULT_MESSAGE);
    }

    public function test_admin_can_save_roles_and_public_status_reflects_them(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->putJson('/api/v1/admin/settings/maintenance_roles', [
            'value' => '["COMMUTER"]', 'category' => 'app',
        ])->assertOk();
        $this->getJson('/api/v1/system-status')->assertOk()->assertJsonPath('data.maintenance_roles', ['COMMUTER']);
    }

    public static function invalidRoles(): array
    {
        return array_map(fn ($value) => [$value], ['[]', '["ADMIN"]', '["COMMUTER","ADMIN"]', '["COMMUTER","COMMUTER"]', 'null', '{}', 'broken', '[["COMMUTER"]]']);
    }

    #[DataProvider('invalidRoles')]
    public function test_invalid_role_selection_is_rejected(string $value): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->putJson('/api/v1/admin/settings/maintenance_roles', [
            'value' => $value, 'category' => 'app',
        ])->assertUnprocessable()->assertJsonValidationErrors('value');
    }

    public static function signedInCases(): array
    {
        return [
            'commuter web'          => ['commuter', 'GET', '/api/v1/commuter/profile'],
            'commuter mobile'       => ['commuter', 'GET', '/api/v1/mobile/commuter/profile'],
            'commuter shared feed'  => ['commuter', 'GET', '/api/v1/announcements'],
            'commuter lost found'   => ['commuter', 'GET', '/api/v1/lost-found'],
            'commuter vehicles'     => ['commuter', 'GET', '/api/v1/vehicles/locations'],
            'commuter hail'         => ['commuter', 'POST', '/api/v1/commuter/hail'],
            'conductor web'         => ['conductor', 'GET', '/api/v1/conductor/shift'],
            'conductor mobile'      => ['conductor', 'GET', '/api/v1/mobile/conductor/shift'],
            'conductor start shift' => ['conductor', 'POST', '/api/v1/conductor/shifts/start'],
            'conductor remittance'  => ['conductor', 'POST', '/api/v1/conductor/remittances'],
            'conductor payments'    => ['conductor', 'GET', '/api/v1/payments/1/status'],
        ];
    }

    #[DataProvider('signedInCases')]
    public function test_signed_in_users_of_an_affected_role_cannot_use_any_account_route(string $role, string $method, string $uri): void
    {
        $this->configure('maintenance_mode', 'true');
        $this->configure('maintenance_roles', json_encode([strtoupper($role)]));
        $user = User::factory()->{$role}()->create();

        $this->actingAs($user)->json($method, $uri)
            ->assertStatus(503)
            ->assertJsonPath('code', 'MAINTENANCE')
            ->assertJsonPath('message', MaintenanceStatus::DEFAULT_MESSAGE);
    }

    #[DataProvider('signedInCases')]
    public function test_unaffected_role_and_disabled_maintenance_keep_routes_open(string $role, string $method, string $uri): void
    {
        $user = User::factory()->{$role}()->create();
        $other = $role === 'commuter' ? 'CONDUCTOR' : 'COMMUTER';

        $this->configure('maintenance_mode', 'true');
        $this->configure('maintenance_roles', json_encode([$other]));
        $this->assertNotSame(503, $this->actingAs($user)->json($method, $uri)->getStatusCode());

        $this->configure('maintenance_roles', json_encode(['COMMUTER', 'CONDUCTOR']));
        $this->configure('maintenance_mode', 'false');
        $this->assertNotSame(503, $this->actingAs($user)->json($method, $uri)->getStatusCode());
    }

    public function test_session_check_and_logout_stay_available_so_the_app_can_show_the_screen(): void
    {
        $this->configure('maintenance_mode', 'true');

        // Real token first — actingAs() below would leave a cached guard user
        // with no access token for logout to delete.
        $commuter = User::factory()->commuter()->create();
        $token = $commuter->createToken('auth-token')->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertSame(0, $commuter->tokens()->count());

        foreach (['commuter', 'conductor'] as $role) {
            $user = User::factory()->{$role}()->create();
            $this->actingAs($user)->getJson('/api/v1/user')->assertOk();
            $this->actingAs($user)->getJson('/api/v1/mobile/user')->assertOk();
        }

        $this->getJson('/api/v1/system-status')->assertOk();
    }

    public function test_admin_keeps_admin_and_shared_routes_during_maintenance(): void
    {
        $this->configure('maintenance_mode', 'true');
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->getJson('/api/v1/admin/settings?category=app')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/announcements')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/lost-found')->assertOk();
    }

    public static function registrationCases(): array
    {
        $cases = [];
        foreach (['/api/v1/auth', '/api/v1/mobile/auth'] as $prefix) {
            foreach (['/register', '/register/send-code', '/register/verify-code'] as $path) {
                $cases[$prefix.$path] = [$prefix.$path];
            }
        }
        return $cases;
    }

    #[DataProvider('registrationCases')]
    public function test_sign_up_follows_commuter_maintenance_only(string $endpoint): void
    {
        $this->configure('maintenance_mode', 'true');

        $this->configure('maintenance_roles', json_encode(['COMMUTER']));
        $this->postJson($endpoint, [])
            ->assertStatus(503)
            ->assertJsonPath('code', 'MAINTENANCE')
            ->assertJsonPath('message', MaintenanceStatus::DEFAULT_MESSAGE);

        // Sign-up only creates commuters, so conductor-only maintenance leaves
        // it open (the empty body then fails normal validation instead).
        $this->configure('maintenance_roles', json_encode(['CONDUCTOR']));
        $this->postJson($endpoint, [])->assertUnprocessable();
    }

    public function test_existing_session_middleware_respects_role_selection(): void
    {
        $this->configure('maintenance_mode', 'true');
        foreach (['commuter', 'conductor', 'admin'] as $role) {
            $user = User::factory()->{$role}()->create();
            $request = Request::create('/test', 'POST');
            $request->setUserResolver(fn () => $user);
            foreach (['COMMUTER', 'CONDUCTOR'] as $selected) {
                $this->configure('maintenance_roles', json_encode([$selected]));
                $response = app(BlockDuringMaintenance::class)->handle($request, fn () => response()->json(['allowed' => true]));
                $this->assertSame(strtoupper($role) === $selected ? 503 : 200, $response->getStatusCode());
            }
        }
    }
}
