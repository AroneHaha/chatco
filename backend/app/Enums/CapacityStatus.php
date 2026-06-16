<?php

namespace App\Enums;

enum CapacityStatus: string
{
    case AVAILABLE = 'AVAILABLE';
    case STANDING = 'STANDING';
    case FULL = 'FULL';
}