<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ConductorProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConductorProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.uploads.profile_disk' => 'r2_public', 'filesystems.disks.r2_public.url' => 'https://media.test']);
        Storage::fake('r2_public', ['url' => 'https://media.test']);
    }

    private function conductor(): User
    {
        $user = User::factory()->create(['role' => UserRole::CONDUCTOR]);
        ConductorProfile::create(['id' => $user->id, 'first_name' => 'Photo', 'last_name' => 'Owner', 'birthday' => '1995-01-01', 'contact' => '09171234567', 'address' => 'Test address', 'generated_username' => 'photo.'.substr($user->id, 0, 8), 'generated_password' => 'test-fixture-only', 'status' => 'ACTIVE']);
        return $user;
    }

    private function upload(string $prefix = '/api/v1/mobile/conductor')
    {
        return $this->withHeader('Accept', 'application/json')->post($prefix.'/profile/photo', ['photo' => UploadedFile::fake()->image('avatar.jpg', 120, 120)]);
    }

    public function test_mobile_photo_is_visible_from_web_and_does_not_modify_other_conductors(): void
    {
        $user = $this->conductor();
        $other = $this->conductor();
        Sanctum::actingAs($user);
        $url = $this->upload()->assertOk()->json('data.profile_picture_url');
        $this->assertStringContainsString('/profiles/conductors/'.$user->id.'/', $url);
        $this->getJson('/api/v1/conductor/profile')->assertOk()->assertJsonPath('data.profile_picture_url', $url)->assertJsonPath('data.contact_number', '09171234567');
        $this->assertNull($other->conductorProfile()->first()->profile_picture_url);
    }

    public function test_web_upload_is_visible_on_mobile(): void
    {
        Sanctum::actingAs($this->conductor());
        $url = $this->upload('/api/v1/conductor')->assertOk()->json('data.profile_picture_url');
        $this->getJson('/api/v1/mobile/conductor/profile')->assertOk()->assertJsonPath('data.profile_picture_url', $url);
    }

    public function test_upload_is_authenticated_and_role_scoped(): void
    {
        $this->upload()->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::COMMUTER]));
        $this->upload()->assertForbidden();
    }

    public function test_invalid_photo_is_rejected_before_storage(): void
    {
        Sanctum::actingAs($this->conductor());
        $this->withHeader('Accept', 'application/json')->post('/api/v1/mobile/conductor/profile/photo', ['photo' => UploadedFile::fake()->create('not-image.pdf')])->assertUnprocessable();
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
    }

    public function test_database_failure_preserves_the_original_and_cleans_the_new_upload(): void
    {
        $user = $this->conductor();
        Sanctum::actingAs($user);
        $original = $this->upload()->assertOk()->json('data.profile_picture_url');
        ConductorProfile::updating(fn () => throw new \RuntimeException('Simulated save failure'));
        try { $this->upload()->assertStatus(500); }
        finally { Event::forget('eloquent.updating: '.ConductorProfile::class); }
        $this->assertSame($original, $user->conductorProfile()->first()->profile_picture_url);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }
}
