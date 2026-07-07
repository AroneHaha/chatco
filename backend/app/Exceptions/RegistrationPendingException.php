<?php

namespace App\Exceptions;

/**
 * Thrown by AuthService::login when a commuter attempts to log in before an
 * admin has approved their registration (account_status=PENDING) or after
 * their registration was rejected (account_status=REJECTED).
 *
 * Caught by AuthController::login and surfaced as a 403 in the project's
 * ApiResponse envelope. Credentials are still verified BEFORE this is thrown,
 * so it never leaks whether an email exists — same defensive pattern as
 * AccountSuspendedException.
 *
 * Note: in practice REJECTED accounts are also soft-deleted on rejection
 * (AdminService::rejectRegistration), so they would already fail the "user
 * not found" path. The REJECTED case is kept here as a second line of
 * defence in case a future change stops soft-deleting on reject.
 */
class RegistrationPendingException extends \Exception
{
    public function __construct(string $message = 'Your account is pending admin approval.')
    {
        parent::__construct($message);
    }
}
