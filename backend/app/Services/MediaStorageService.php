<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Centralizes object-key conventions for user-facing media.
 *
 * R2 uses object-key prefixes rather than real directories. Keep government
 * IDs on the private disk and profile/lost-and-found media on the public disk.
 */
class MediaStorageService
{
    public function storeProfileImage(UploadedFile $file, string $role, string $ownerId): string
    {
        $prefix = match (strtolower($role)) {
            'conductor' => 'profiles/conductors',
            'driver' => 'profiles/drivers',
            default => throw new \InvalidArgumentException('Unsupported profile image role.'),
        };

        return $this->storePublic($file, "{$prefix}/{$ownerId}", config('filesystems.uploads.profile_disk', config('filesystems.uploads.public_media_disk', 'r2_public')));
    }

    public function storeLostAndFoundImage(UploadedFile $file, string $itemId): string
    {
        return $this->storePublic($file, "lost-and-found/{$itemId}");
    }

    public function storeLostAndFoundClaimImage(UploadedFile $file, string $itemId): string
    {
        return $this->storePublic($file, "lost-and-found/{$itemId}/claims");
    }

    public function storeCommuterId(UploadedFile $file, string $userId): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = $userId.'-'.Str::random(16).'.'.$extension;

        return $file->storeAs(
            "ids/commuters/{$userId}",
            $filename,
            config('filesystems.uploads.private_id_disk', 'r2_private'),
        );
    }

    /** Store a public object and return its URL for the existing API contract. */
    private function storePublic(UploadedFile $file, string $directory, ?string $disk = null): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid().'.'.$extension;
        $disk ??= config('filesystems.uploads.public_media_disk', 'r2_public');
        $path = $file->storeAs($directory, $filename, $disk);

        return Storage::disk($disk)->url($path);
    }

    /** Best-effort deletion of a public object represented by a stored URL. */
    public function deletePublicUrl(?string $url): void
    {
        $object = $this->objectFromUrl($url);
        if ($object === null) {
            return;
        }
        [$disk, $path] = $object;

        try {
            Storage::disk($disk)->delete($path);
        } catch (\Throwable $e) {
            Log::warning('Unable to delete replaced public media object.', [
                'path' => $path,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function objectFromUrl(?string $url): ?array
    {
        if (! $url || str_starts_with($url, 'data:')) {
            return null;
        }

        // Laravel's local public disk also issues relative /storage/... URLs.
        if (str_starts_with($url, '/storage/')) {
            $path = explode('?', substr($url, strlen('/storage/')), 2)[0];
            return $path !== '' && ! str_contains($path, '..') ? ['public', $path] : null;
        }

        // Match the complete configured URL boundary, not just /storage/ in an
        // arbitrary URL. Old media URLs continue targeting their original disk.
        $disks = array_unique([
            config('filesystems.uploads.profile_disk', 'r2_profiles'),
            config('filesystems.uploads.public_media_disk', 'r2_public'),
            'r2_profiles', 'r2_public', 'public',
        ]);
        foreach ($disks as $disk) {
            $base = rtrim((string) config("filesystems.disks.{$disk}.url", ''), '/');
            if ($base !== '' && str_starts_with($url, $base.'/')) {
                $path = explode('?', substr($url, strlen($base) + 1), 2)[0];
                if ($path !== '' && ! str_contains($path, '..')) {
                    return [$disk, $path];
                }
            }
        }
        return null; // Never delete objects for external/unrecognized URLs.
    }
}
