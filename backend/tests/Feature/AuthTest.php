<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\AdminProfile;
use App\Models\CommuterProfile;
use App\Models\ConductorProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function seedAdmin(): User
    {
        $admin = User::create([
            'email'    => 'admin@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::ADMIN,
        ]);

        AdminProfile::create([
            'id'         => $admin->id,
            'first_name' => 'System',
            'last_name'  => 'Admin',
        ]);

        return $admin;
    }

    private function seedCommuter(): User
    {
        $commuter = User::create([
            'email'    => 'commuter1@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::COMMUTER,
        ]);

        CommuterProfile::create([
            'id'                  => $commuter->id,
            'first_name'          => 'Jose',
            'surname'             => 'Mendoza',
            'birthdate'           => '1998-05-12',
            'gender'              => 'Male',
            'email'               => 'commuter1@gmail.com',
            'contact_number'      => '+639171234567',
            'commuter_type'       => 'Regular',
            'username'            => 'commuter001',
            'language_preference' => 'en',
            'account_status'      => 'ACTIVE',
            'verified_at'         => now(),
        ]);

        return $commuter;
    }

    private function seedConductor(): User
    {
        $conductor = User::create([
            'email'    => 'conductor1@gmail.com',
            'password' => Hash::make('password123'),
            'role'     => UserRole::CONDUCTOR,
        ]);

        ConductorProfile::create([
            'id'                 => $conductor->id,
            'first_name'         => 'Juan',
            'last_name'          => 'Dela Cruz',
            'birthday'           => '1990-03-15',
            'generated_username' => 'conductor001',
            'generated_password' => Hash::make('password123'),
        ]);

        return $conductor;
    }

    // ── Login Tests ──────────────────────────────────────────────

    public function test_login_with_valid_admin_credentials_returns_200(): void
    {
        $this->seedAdmin();

        $response = $this->postJson('/api/v1/auth/login', [
            'login'    => 'admin@gmail.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => ['id', 'email', 'role', 'name', 'token'],
            'message',
            'errors',
            'meta',
        ]);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('ADMIN', $response->json('data.role'));
        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_login_with_wrong_password_returns_401(): void
    {
        $this->seedAdmin();

        $response = $this->postJson('/api/v1/auth/login', [
            'login'    => 'admin@gmail.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
        $this->assertFalse($response->json('success'));
        $this->assertEquals('Invalid credentials', $response->json('message'));
    }

    public function test_login_with_nonexistent_email_returns_401(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'login'    => 'nobody@gmail.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
        $this->assertFalse($response->json('success'));
    }

    public function test_login_with_missing_fields_returns_422(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertStatus(422);
        $this->assertFalse($response->json('success'));
        $this->assertEquals('Validation failed', $response->json('message'));
        $response->assertJsonStructure(['errors']);
    }

    public function test_login_with_conductor_username(): void
    {
        $this->seedConductor();

        $response = $this->postJson('/api/v1/auth/login', [
            'login'    => 'conductor001',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('CONDUCTOR', $response->json('data.role'));
    }

    // ── Logout Tests ─────────────────────────────────────────────

    public function test_logout_with_valid_token_returns_200(): void
    {
        $admin = $this->seedAdmin();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('Logged out successfully', $response->json('message'));
    }

    public function test_logout_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(401);
    }

    // ── User Endpoint Tests ──────────────────────────────────────

    public function test_get_user_with_valid_token_returns_200(): void
    {
        $admin = $this->seedAdmin();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/user');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $response->assertJsonStructure([
            'data' => ['user', 'profile'],
        ]);
    }

    public function test_get_user_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/v1/user');

        $response->assertStatus(401);
    }

    public function test_get_user_commuter_returns_profile_data(): void
    {
        $commuter = $this->seedCommuter();
        $token = $commuter->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/user');

        $response->assertStatus(200);
        $this->assertEquals('COMMUTER', $response->json('data.user.role'));
        $this->assertEquals('Jose', $response->json('data.profile.first_name'));
    }
}
