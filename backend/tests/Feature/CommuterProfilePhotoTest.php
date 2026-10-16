<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CommuterProfile;
use App\Models\User;
use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommuterProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.uploads.profile_disk' => 'r2_public', 'filesystems.disks.r2_public.url' => 'https://media.example.test']);
        Storage::fake('r2_public', ['url' => 'https://media.example.test']);
        Storage::fake('r2_private');
    }

    private function commuter(string $name = 'owner'): User
    {
        $user = User::factory()->create(['role' => UserRole::COMMUTER]);
        CommuterProfile::create([
            'id' => $user->id, 'first_name' => 'Real', 'surname' => 'User',
            'birthdate' => '2000-01-01', 'gender' => 'Male', 'email' => $user->email,
            'username' => $name, 'commuter_type' => 'REGULAR', 'account_status' => 'ACTIVE',
            'contact_number' => '09171234567', 'language_preference' => 'English',
        ]);
        return $user;
    }

    private function upload(string $path = '/api/v1/commuter/profile/photo')
    {
        return $this->withHeader('Accept', 'application/json')->post($path, [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 120, 120),
        ]);
    }

    public function test_web_upload_is_visible_from_mobile_and_keeps_private_id_untouched(): void
    {
        $user = $this->commuter();
        Storage::disk('r2_private')->put('ids/original.jpg', 'private identity');
        $user->commuterProfile()->update(['id_image_url' => 'ids/original.jpg']);
        Sanctum::actingAs($user);
        $response = $this->upload()->assertOk();
        $url = $response->json('data.profile.profile_image_url');
        $this->assertStringContainsString('/profiles/commuters/'.$user->id.'/', $url);
        $this->getJson('/api/v1/mobile/commuter/profile')->assertOk()->assertJsonPath('data.profile.profile_image_url', $url);
        Storage::disk('r2_private')->assertExists('ids/original.jpg');
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }

    public function test_mobile_upload_is_visible_from_web(): void
    {
        Sanctum::actingAs($this->commuter());
        $url = $this->upload('/api/v1/mobile/commuter/profile/photo')->assertOk()->json('data.profile.profile_image_url');
        $this->getJson('/api/v1/commuter/profile')->assertOk()->assertJsonPath('data.profile.profile_image_url', $url);
    }

    public function test_replacement_deletes_only_the_previous_photo_after_commit(): void
    {
        $user = $this->commuter();
        Sanctum::actingAs($user);
        $first = $this->upload()->assertOk()->json('data.profile.profile_image_url');
        $second = $this->upload()->assertOk()->json('data.profile.profile_image_url');
        $this->assertNotSame($first, $second);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
        $this->assertSame($second, $user->commuterProfile()->first()->profile_image_url);
    }

    public function test_failed_database_save_preserves_previous_photo_and_removes_new_upload(): void
    {
        $user = $this->commuter();
        Sanctum::actingAs($user);
        $original = $this->upload()->assertOk()->json('data.profile.profile_image_url');
        CommuterProfile::updating(fn () => throw new \RuntimeException('Simulated profile save failure'));
        try {
            $this->upload()->assertStatus(500);
        } finally {
            Event::forget('eloquent.updating: '.CommuterProfile::class);
        }
        $this->assertSame($original, $user->commuterProfile()->first()->profile_image_url);
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
    }

    public function test_storage_failure_does_not_change_profile(): void
    {
        $user = $this->commuter();
        Sanctum::actingAs($user);
        $this->mock(MediaStorageService::class, function ($mock) {
            $mock->shouldReceive('storeProfileImage')->once()->andThrow(new \RuntimeException('Unavailable'));
        });
        $this->upload()->assertStatus(502);
        $this->assertNull($user->commuterProfile()->first()->profile_image_url);
    }

    public function test_upload_ignores_other_owner_and_identity_fields(): void
    {
        $user = $this->commuter();
        $other = $this->commuter('other');
        Sanctum::actingAs($user);
        $this->withHeader('Accept', 'application/json')->post('/api/v1/commuter/profile/photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'), 'user_id' => $other->id,
            'commuter_type' => 'PWD', 'profile_image_url' => 'https://external.example/other.jpg',
        ])->assertOk();
        $this->assertNull($other->commuterProfile()->first()->profile_image_url);
        $this->assertSame('REGULAR', $user->commuterProfile()->first()->commuter_type);
    }

    public function test_normal_profile_edit_cannot_inject_photo_url(): void
    {
        $user = $this->commuter();
        Sanctum::actingAs($user);
        $this->putJson('/api/v1/commuter/profile', ['profile_image_url' => 'https://external.example/other.jpg'])->assertOk();
        $this->assertNull($user->commuterProfile()->first()->profile_image_url);
    }

    public function test_authentication_and_commuter_role_are_required_on_both_routes(): void
    {
        foreach (['/api/v1/commuter/profile/photo', '/api/v1/mobile/commuter/profile/photo'] as $path) {
            $this->upload($path)->assertUnauthorized();
        }
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::ADMIN]));
        foreach (['/api/v1/commuter/profile/photo', '/api/v1/mobile/commuter/profile/photo'] as $path) {
            $this->upload($path)->assertForbidden();
        }
    }

    public function test_missing_and_non_image_uploads_are_rejected_without_storing_files(): void
    {
        Sanctum::actingAs($this->commuter());
        $this->postJson('/api/v1/commuter/profile/photo', [])->assertUnprocessable()->assertJsonValidationErrors('photo');
        foreach (['proof.pdf', 'photo.svg', 'script.php'] as $name) {
            $this->withHeader('Accept', 'application/json')->post('/api/v1/commuter/profile/photo', [
                'photo' => UploadedFile::fake()->create($name, 10),
            ])->assertUnprocessable()->assertJsonValidationErrors('photo');
        }
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
    }

    public function test_oversized_files_and_dimensions_are_rejected(): void
    {
        Sanctum::actingAs($this->commuter());
        foreach ([UploadedFile::fake()->image('large.jpg')->size(3073), UploadedFile::fake()->image('wide.png', 4097, 1)] as $photo) {
            $this->withHeader('Accept', 'application/json')->post('/api/v1/commuter/profile/photo', ['photo' => $photo])
                ->assertUnprocessable()->assertJsonValidationErrors('photo');
        }
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
    }

    public function test_missing_profile_returns_404_without_an_orphan_upload(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::COMMUTER]));
        $this->upload()->assertNotFound();
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
    }

    public function test_uploaded_object_extension_comes_from_image_content_not_untrusted_filename(): void
    {
        Sanctum::actingAs($this->commuter());
        $png = UploadedFile::fake()->image('original.png');
        $url = $this->withHeader('Accept', 'application/json')->post('/api/v1/commuter/profile/photo', [
            'photo' => new UploadedFile($png->getPathname(), 'photo.jpg', 'image/jpeg', null, true),
        ])->assertOk()->json('data.profile.profile_image_url');
        $this->assertStringEndsWith('.png', $url);
    }

    public function test_php_extension_is_rejected_even_with_image_content(): void
    {
        Sanctum::actingAs($this->commuter());
        $png = UploadedFile::fake()->image('original.png');
        $this->withHeader('Accept', 'application/json')->post('/api/v1/commuter/profile/photo', [
            'photo' => new UploadedFile($png->getPathname(), 'photo.php', 'image/png', null, true),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
    }
}
