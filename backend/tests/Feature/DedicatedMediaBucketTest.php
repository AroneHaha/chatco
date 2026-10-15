<?php

namespace Tests\Feature;

use App\Models\CommuterProfile;
use App\Models\DiscountApplication;
use App\Models\User;
use App\Services\DiscountApplicationService;
use App\Services\MediaStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DedicatedMediaBucketTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'filesystems.uploads.renewal_disk' => 'r2_renewals',
            'filesystems.uploads.profile_disk' => 'r2_profiles',
            'filesystems.uploads.public_media_disk' => 'r2_public',
            'filesystems.disks.r2_profiles.url' => 'https://profiles.example.test/photos',
            'filesystems.disks.r2_public.url' => 'https://media.example.test',
        ]);
        foreach (['r2_renewals', 'r2_private', 'r2_profiles', 'r2_public', 'public'] as $disk) {
            Storage::fake($disk);
        }
    }

    public function test_new_proofs_use_private_dedicated_bucket_and_legacy_paths_keep_original_disk(): void
    {
        $service = app(DiscountApplicationService::class);
        $profile = new CommuterProfile;
        $profile->id = 'commuter-test';
        foreach (['renewals', 'applications'] as $folder) {
            $path = $service->storeDocument($profile, UploadedFile::fake()->image('proof.jpg'), $folder);
            $this->assertStringStartsWith("discount-proofs/commuters/commuter-test/{$folder}/", $path);
            Storage::disk('r2_renewals')->assertExists($path);
            Storage::disk('r2_private')->assertMissing($path);
            $this->assertSame('r2_renewals', $service->documentDisk($path));
        }
        $this->assertSame('r2_private', $service->documentDisk('ids/commuters/old/renewals/proof.jpg'));
    }

    public function test_unconfigured_renewal_bucket_preserves_old_upload_routing(): void
    {
        config(['filesystems.uploads.renewal_disk' => 'r2_private']);
        $profile = new CommuterProfile;
        $profile->id = 'legacy';
        $service = app(DiscountApplicationService::class);
        $path = $service->storeDocument($profile, UploadedFile::fake()->image('proof.jpg'), 'renewals');
        $this->assertStringStartsWith('ids/', $path);
        Storage::disk('r2_private')->assertExists($path);
        $this->assertSame('r2_private', $service->documentDisk($path));
    }

    public function test_proof_upload_explicitly_requests_private_visibility(): void
    {
        // Windows local fake disks cannot emulate Unix private permissions.
        // Assert the actual cloud storage options rather than host file modes.
        $profile = new CommuterProfile;
        $profile->id = 'owner';
        $file = \Mockery::mock(UploadedFile::class);
        $file->shouldReceive('store')->once()->with(
            'discount-proofs/commuters/owner/renewals',
            ['disk' => 'r2_renewals', 'visibility' => 'private']
        )->andReturn('discount-proofs/commuters/owner/renewals/proof.jpg');
        $this->assertStringStartsWith('discount-proofs/', app(DiscountApplicationService::class)->storeDocument($profile, $file, 'renewals'));
    }

    public function test_admin_signed_urls_use_correct_bucket_and_commuter_response_omits_document(): void
    {
        foreach (['r2_private', 'r2_renewals'] as $disk) {
            Storage::disk($disk)->buildTemporaryUrlsUsing(
                fn ($path, $expiry, $options) => "https://{$disk}.example.test/{$path}?temporary=1"
            );
        }
        $profile = new CommuterProfile;
        $profile->setRelation('user', new User(['email' => 'owner@example.test']));
        $application = new DiscountApplication;
        $application->setRelation('commuter', $profile);
        $service = app(DiscountApplicationService::class);
        foreach (['ids/old.jpg' => 'r2_private', 'discount-proofs/new.jpg' => 'r2_renewals'] as $path => $disk) {
            $application->document_path = $path;
            $this->assertStringStartsWith("https://{$disk}.example.test/", $service->present($application, true)['document_url']);
            $this->assertArrayNotHasKey('document_url', $service->present($application));
            $this->assertArrayNotHasKey('document_url', $service->present($application, true, false));
        }
    }

    public function test_cleanup_uses_original_proof_bucket(): void
    {
        $service = app(DiscountApplicationService::class);
        foreach (['ids/old.jpg' => 'r2_private', 'discount-proofs/new.jpg' => 'r2_renewals'] as $path => $disk) {
            Storage::disk($disk)->put($path, 'proof');
            $service->deleteDocument($path);
            Storage::disk($disk)->assertMissing($path);
        }
    }

    public function test_personnel_photos_are_separate_from_lost_and_found(): void
    {
        $service = app(MediaStorageService::class);
        foreach (['driver', 'conductor'] as $role) {
            $service->storeProfileImage(UploadedFile::fake()->image('photo.jpg'), $role, 'owner');
        }
        $this->assertCount(2, Storage::disk('r2_profiles')->allFiles());
        $this->assertCount(0, Storage::disk('r2_public')->allFiles());
        $service->storeLostAndFoundImage(UploadedFile::fake()->image('item.jpg'), 'item');
        $this->assertCount(1, Storage::disk('r2_public')->allFiles());
        $this->assertCount(2, Storage::disk('r2_profiles')->allFiles());
    }

    public function test_replacement_deletion_matches_bucket_url_and_preserves_other_bucket_object(): void
    {
        $service = app(MediaStorageService::class);
        $path = 'profiles/drivers/old.jpg';
        foreach (['r2_profiles', 'r2_public', 'public'] as $disk) {
            Storage::disk($disk)->put($path, 'photo');
        }
        $service->deletePublicUrl('https://profiles.example.test/photos/'.$path);
        Storage::disk('r2_profiles')->assertMissing($path);
        Storage::disk('r2_public')->assertExists($path);
        $service->deletePublicUrl('https://media.example.test/'.$path);
        Storage::disk('r2_public')->assertMissing($path);
        Storage::disk('public')->assertExists($path);
        $service->deletePublicUrl(config('filesystems.disks.public.url').'/'.$path);
        Storage::disk('public')->assertMissing($path);
        Storage::disk('public')->put($path, 'legacy photo');
        $service->deletePublicUrl('/storage/'.$path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_untrusted_photo_url_does_not_delete_local_or_remote_objects(): void
    {
        $path = 'profiles/drivers/old.jpg';
        Storage::disk('public')->put($path, 'photo');
        Storage::disk('r2_profiles')->put($path, 'photo');
        app(MediaStorageService::class)->deletePublicUrl('https://untrusted.example/storage/'.$path);
        app(MediaStorageService::class)->deletePublicUrl('https://profiles.example.test.evil.test/photos/'.$path);
        Storage::disk('public')->assertExists($path);
        Storage::disk('r2_profiles')->assertExists($path);
    }
}
