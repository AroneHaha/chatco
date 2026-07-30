<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case CONDUCTOR = 'CONDUCTOR';
    case COMMUTER = 'COMMUTER';
}
