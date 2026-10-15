<?php

// One local-only switch makes the October 2026 renewal window available for debugging.
$debugOctober = env('APP_ENV') === 'local' && env('STUDENT_RENEWAL_DEBUG_OCTOBER', false);

return [

    'terms_version' => '2026-10-12',
    'privacy_version' => '2026-10-12',

    // Announce the first full renewal window; existing students are not expired retroactively.
    'student_renewal_first_year' => $debugOctober ? 2026 : (int) env('STUDENT_RENEWAL_FIRST_YEAR', 2027),
    'student_renewal_month' => $debugOctober ? 10 : 9,

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
