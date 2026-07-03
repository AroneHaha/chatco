<?php

namespace App\Support\Feedback;

use RuntimeException;

/**
 * Thrown by FeedbackService when the resolved crew is not found for today,
 * the submitted shift_id is invalid, or duplicate feedback is attempted.
 * The controller catches this and maps it to HTTP 422 (or 404 for
 * crew-not-found) with the exception message.
 */
class FeedbackException extends RuntimeException
{
}
