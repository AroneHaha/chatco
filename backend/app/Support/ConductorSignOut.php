<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Events\FaresUpdated;
use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Ends every conductor session (web and mobile) after a fare change (Financial
 * Rules or Fare Matrix places), so each signs back in on the new fares and
 * places. Tokens expire after a short grace instead of being deleted, so an
 * open app first gets FaresUpdated and shows why it is signing out rather than
 * failing on a bare 401 mid-poll. Active shifts are untouched; the conductor
 * resumes on the next sign-in. Inside a transaction the event is sent after
 * commit, so a rolled-back change never signs anyone out.
 */
final class ConductorSignOut
{
    /** How long an open conductor app has to show its notice before its token stops working. */
    public const GRACE_SECONDS = 20;

    public static function afterFareChange(): void
    {
        $expiresAt = now()->addSeconds(self::GRACE_SECONDS);
        PersonalAccessToken::query()
            ->where('tokenable_type', (new User)->getMorphClass())
            ->whereIn('tokenable_id', User::where('role', UserRole::CONDUCTOR)->select('id'))
            // Never extend a token that already expires sooner.
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', $expiresAt))
            ->update(['expires_at' => $expiresAt]);

        DB::afterCommit(fn () => broadcast(new FaresUpdated(self::GRACE_SECONDS)));
    }
}
