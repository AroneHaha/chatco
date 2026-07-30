<?php

namespace App\Support\LostFound;

use RuntimeException;

/**
 * Sprint 6 (T3) — Domain exception for Lost & Found business-rule violations.
 *
 * Thrown by LostItemService when an operation violates a state-transition or
 * ownership rule (e.g. claiming an already-released item, approving a claim
 * on a CLOSED item). The controller maps the message to the appropriate HTTP
 * status code.
 */
class LostFoundException extends RuntimeException
{
    public static function itemNotClaimable(string $reason = 'Item is not available for claiming'): self
    {
        return new self($reason);
    }

    public static function claimNotReviewable(string $reason): self
    {
        return new self($reason);
    }

    public static function notFound(string $entity = 'Item'): self
    {
        return new self("{$entity} not found");
    }

    public static function invalid(string $reason): self
    {
        return new self($reason);
    }
}
