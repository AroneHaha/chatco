<?php

namespace App\Enums;

enum PassengerType: string
{
    case REGULAR = 'REGULAR';
    case STUDENT = 'STUDENT';
    case SENIOR = 'SENIOR';
    case PWD = 'PWD';

    public static function normalize(string $value): self
    {
        $normalized = strtoupper(trim($value));

        return self::from($normalized === 'SENIOR_CITIZEN' ? 'SENIOR' : $normalized);
    }

    public function isDiscounted(): bool
    {
        return $this !== self::REGULAR;
    }

    public static function acceptedValues(): array
    {
        return ['REGULAR', 'STUDENT', 'SENIOR', 'SENIOR_CITIZEN', 'PWD'];
    }
}
