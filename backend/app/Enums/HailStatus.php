<?php

namespace App\Enums;

enum HailStatus: string
{
    case PENDING = 'PENDING';
    case ACCEPTED = 'ACCEPTED';
    case REJECTED = 'REJECTED';
    case CANCELLED = 'CANCELLED';
    case EXPIRED = 'EXPIRED';
}
