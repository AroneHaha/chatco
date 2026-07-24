<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Registration Rejection Safety Net
    |--------------------------------------------------------------------------
    |
    | A commuter whose registration is rejected may re-register with the same
    | email/username (the account is soft-deleted and the identifiers freed).
    | To stop abuse of that re-registration path, every rejection is logged and
    | counted against the applicant's identity (email OR contact number). Once
    | the count reaches `rejection_threshold`, a cooldown of `cooldown_days` is
    | applied — the applicant cannot create a new account until it elapses.
    |
    | Both values are tunable via env so operations can loosen/tighten the
    | policy without a code change.
    |
    */

    // Number of rejections (inclusive) at which a cooldown block is triggered.
    'rejection_threshold' => (int) env('REGISTRATION_REJECTION_THRESHOLD', 3),

    // How many days the applicant is blocked from re-registering once the
    // threshold is reached.
    'cooldown_days' => (int) env('REGISTRATION_COOLDOWN_DAYS', 3),

];
