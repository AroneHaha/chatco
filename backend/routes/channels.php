<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application may use. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// 'vehicles' channel — public, any authenticated user can subscribe
// No authorization callback needed for public channels
Broadcast::channel('vehicles', function () {
    return true;
});