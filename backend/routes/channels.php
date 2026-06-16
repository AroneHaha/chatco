<?php

use Illuminate\Support\Facades\Broadcast;

// Public channel — any authenticated user can listen
Broadcast::channel('vehicles', function () {
    return true;
});