<?php

use App\Models\ShiftLog;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('admin.notifications', function (User $user): bool {
    return $user->isAdmin();
});

// Every signed-in conductor; carries FaresUpdated (fare change → sign out).
Broadcast::channel('conductors', function (User $user): bool {
    return $user->isConductor();
});

// Public channel — any authenticated user can listen
Broadcast::channel('vehicles', function () {
    return true;
});

// Public channel — carries AnnouncementCreated events so every signed-in
// user's "Latest Updates" feed + unread badge update in real time.
Broadcast::channel('announcements', function () {
    return true;
});

Broadcast::channel('vehicle.{vehicleId}.hails', function (User $user, string $vehicleId): bool {
    return $user->isConductor()
        && ShiftLog::query()
            ->where('vehicle_id', $vehicleId)
            ->where('conductor_id', $user->conductorProfile?->id)
            ->active()
            ->exists();
});

Broadcast::channel('commuter.{commuterId}.hails', function (User $user, string $commuterId): bool {
    return $user->isCommuter() && $user->id === $commuterId;
});
