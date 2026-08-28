<?php

namespace App\Enums;

enum ActivityLogCategory: string
{
    case MEMBER = 'MEMBER';
    case PERSONNEL = 'PERSONNEL';
    case VEHICLE = 'VEHICLE';
    case ROUTE = 'ROUTE';
    case FARE_POINT = 'FARE_POINT';
    case SETTINGS = 'SETTINGS';
    case VOUCHER = 'VOUCHER';
    case REMITTANCE_OPTION = 'REMITTANCE_OPTION';
    case FAQ = 'FAQ';
    case ANNOUNCEMENT = 'ANNOUNCEMENT';
    case LOST_FOUND = 'LOST_FOUND';
    case SOS = 'SOS';
    case SHIFT_DEVICE = 'SHIFT_DEVICE';
}
