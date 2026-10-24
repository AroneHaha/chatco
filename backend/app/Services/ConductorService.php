<?php

namespace App\Services;

use App\Models\Remittance;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ConductorService
{
    /**
     * Store and replace the authenticated conductor's public profile photo.
     * Upload storage stays outside the DB transaction; failed profile writes
     * remove the newly stored object, while the prior image is deleted only
     * after the replacement commits.
     */
    public function uploadProfilePhoto(User $conductor, UploadedFile $photo): ?string
    {
        if (! $conductor->conductorProfile()->exists()) {
            return null;
        }

        $media = app(MediaStorageService::class);
        try {
            $url = $media->storeProfileImage($photo, 'conductor', $conductor->id);
        } catch (\Throwable $error) {
            report($error);
            abort(502, 'The photo could not be stored. Please try again.');
        }

        try {
            $profile = DB::transaction(function () use ($conductor, $url, $media) {
                $profile = $conductor->conductorProfile()->lockForUpdate()->firstOrFail();
                $previous = $profile->profile_picture_url;
                $profile->profile_picture_url = $url;
                $profile->save();
                DB::afterCommit(fn () => $media->deletePublicUrl($previous));

                return $profile;
            });
        } catch (\Throwable $error) {
            $media->deletePublicUrl($url);
            throw $error;
        }

        return $profile->profile_picture_url;
    }

    /**
     * List the authenticated conductor's own remittances, ordered by date desc.
     *
     * Scoped strictly to the auth conductor's conductor_id — never returns
     * another conductor's records. Each row eager-loads the shift, vehicle,
     * and route relationships so the controller can return the denormalized
     * info the spec requires without N+1 queries.
     *
     * @param  User  $conductor  The authenticated conductor user.
     * @param  int  $perPage  Page size (defaults to 15, matching the other
     *                        list endpoints like ShiftService::getShiftLogs).
     */
    public function listRemittances(User $conductor, int $perPage = 15, string $filter = 'ALL'): LengthAwarePaginator
    {
        $conductorId = $conductor->conductorProfile?->id ?? $conductor->id;

        $paginator = Remittance::where('conductor_id', $conductorId)
            ->when($filter !== 'ALL', fn ($query) => $query->where('date', '>=', now()->subDays($filter === 'WEEK' ? 7 : 31)->toDateString()))
            ->with([
                'shift:shift_id,conductor_id,driver_id,vehicle_id,route_id,time_in,time_out,status',
                'vehicle:id,unit_number,plate_number,route_id',
                'vehicle.route:id,name',
                'driver:id,first_name,last_name',
            ])
            ->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->paginate(min(max($perPage, 1), 100));

        $paginator->through(function (Remittance $remittance): Remittance {
            $remittance->setAttribute(
                'is_overdue',
                $remittance->remittance_status === Remittance::STATUS_PENDING
                    && $remittance->remittance_due_at?->isPast(),
            );

            return $remittance;
        });

        return $paginator;
    }
}
