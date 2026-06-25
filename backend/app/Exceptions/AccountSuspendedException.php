<?php

namespace App\Exceptions;

/**
 * Thrown by AuthService::login when a commuter whose account_status is
 * SUSPENDED (set by an admin via S5-T3) attempts to log in.
 *
 * Caught by AuthController::login and surfaced as a 403 in the project's
 * ApiResponse envelope. Credentials are still verified BEFORE this is thrown,
 * so it never leaks whether an email exists.
 */
class AccountSuspendedException extends \Exception
{
    public function __construct(string $message = 'This account has been suspended.')
    {
        parent::__construct($message);
    }
}
