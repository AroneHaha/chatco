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

        return $this->storePublic($file, "{$prefix}/{$ownerId}");
    }

    public function storeLostAndFoundImage(UploadedFile $file, string $itemId): string
    {
        return $this->storePublic($file, "lost-and-found/{$itemId}");
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
    private function storePublic(UploadedFile $file, string $directory): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid().'.'.$extension;
        $disk = config('filesystems.uploads.public_media_disk', 'r2_public');
        $path = $file->storeAs($directory, $filename, $disk);

        return Storage::disk($disk)->url($path);
    }

    /** Best-effort deletion of a public object represented by a stored URL. */
    public function deletePublicUrl(?string $url): void
    {
        $path = $this->pathFromUrl($url);
        if ($path === null) {
            return;
        }

        // Legacy local-public URLs were issued before R2 was enabled. Keep
        // deleting those from the local public disk while new R2 URLs use the
        // configured public media disk.
        $disk = str_contains($url, '/storage/')
            ? 'public'
            : config('filesystems.uploads.public_media_disk', 'r2_public');

        try {
            Storage::disk($disk)->delete($path);
        } catch (\Throwable $e) {
            Log::warning('Unable to delete replaced public media object.', [
                'path' => $path,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function pathFromUrl(?string $url): ?string
    {
        if (! $url || str_starts_with($url, 'data:')) {
            return null;
        }

        $path = ltrim((string) (parse_url($url, PHP_URL_PATH) ?? ''), '/');
        if ($path === '') {
            return null;
        }

        $publicUrl = trim((string) config('filesystems.disks.'.config('filesystems.uploads.public_media_disk', 'r2_public').'.url', ''), '/');
        if ($publicUrl !== '') {
            $publicPath = ltrim((string) (parse_url($publicUrl, PHP_URL_PATH) ?? ''), '/');
            if ($publicPath !== '' && str_starts_with($path, $publicPath.'/')) {
                $path = substr($path, strlen($publicPath) + 1);
            }
        }

        // Keep compatibility with URLs produced by Laravel's local public disk.
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path !== '' ? $path : null;
    }
}
