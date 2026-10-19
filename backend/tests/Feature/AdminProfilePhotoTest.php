<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AdminProfile;
use App\Models\User;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.uploads.profile_disk' => 'r2_public', 'filesystems.disks.r2_public.url' => 'https://media.example.test']);
        Storage::fake('r2_public', ['url' => 'https://media.example.test']);
    }

    private function admin(): User
    {
        $user = User::factory()->create(['role' => UserRole::ADMIN]);
        AdminProfile::create(['id' => $user->id, 'first_name' => 'Photo', 'last_name' => 'Admin']);

        return $user;
    }

    private function upload(array $extra = [])
    {
        return $this->withHeader('Accept', 'application/json')->post('/api/v1/admin/account/profile/photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 120, 120), ...$extra,
        ]);
    }

    public function test_upload_persists_self_owned_photo_and_auth_read_returns_it(): void
    {
        $owner = $this->admin();
        $other = $this->admin();
        Sanctum::actingAs($owner);
        $url = $this->upload(['user_id' => $other->id])->assertOk()->json('data.profile_picture_url');
        $this->assertStringContainsString('/profiles/admins/'.$owner->id.'/', $url);
        $this->assertSame($url, $owner->adminProfile()->first()->profile_picture_url);
        $this->assertNull($other->adminProfile()->first()->profile_picture_url);
        $this->getJson('/api/v1/user')->assertOk()->assertJsonPath('data.user.profile_picture_url', $url);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }

    public function test_replacement_removes_previous_object_only_after_success(): void
    {
        Sanctum::actingAs($this->admin());
        $first = $this->upload()->assertOk()->json('data.profile_picture_url');
        $second = $this->upload()->assertOk()->json('data.profile_picture_url');
        $this->assertNotSame($first, $second);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }

    public function test_failed_save_preserves_old_photo_and_removes_the_new_object(): void
    {
        $user = $this->admin();
        Sanctum::actingAs($user);
        $previous = $this->upload()->assertOk()->json('data.profile_picture_url');
        AdminProfile::updating(fn () => throw new \RuntimeException('Simulated save failure'));
        try {
            $this->upload()->assertStatus(500);
        } finally {
            Event::forget('eloquent.updating: '.AdminProfile::class);
        }
        $this->assertSame($previous, $user->adminProfile()->first()->profile_picture_url);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }

    public function test_storage_error_leaves_profile_unchanged(): void
    {
        $user = $this->admin();
        Sanctum::actingAs($user);
        $this->mock(MediaStorageService::class, fn ($mock) => $mock->shouldReceive('storeProfileImage')->once()->andThrow(new \RuntimeException('Unavailable')));
        $this->upload()->assertStatus(503)->assertJsonPath('message', 'The photo could not be stored. Please try again.');
        $this->assertNull($user->adminProfile()->first()->profile_picture_url);
    }

    public function test_invalid_and_oversized_images_are_rejected_before_storage(): void
    {
        Sanctum::actingAs($this->admin());
        $this->upload(['photo' => UploadedFile::fake()->create('document.pdf', 12, 'application/pdf')])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->upload(['photo' => UploadedFile::fake()->image('large.jpg')->size(3073)])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertEmpty(Storage::disk('r2_public')->allFiles());
    }

    public function test_other_roles_and_guests_cannot_upload_admin_photos(): void
    {
        $this->upload()->assertUnauthorized();
        foreach ([UserRole::COMMUTER, UserRole::CONDUCTOR] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->upload()->assertForbidden();
        }
        $this->assertEmpty(Storage::disk('r2_public')->allFiles());
    }
}
