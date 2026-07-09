<?php

namespace App\Support\Qr;

use RuntimeException;

/**
 * Thrown by QrTokenService when a token is malformed, has an invalid
 * signature, or is expired. The QrController catches this and maps it to
 * HTTP 422 with the exception message as the response message.
 */
class QrTokenException extends RuntimeException
{
}
