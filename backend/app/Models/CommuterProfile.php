<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CommuterProfile extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'suffix',
        'surname',
        'birthdate',
        'gender',
        'email',
        'contact_number',
        'commuter_type',
        'applied_type',
        'username',
        'language_preference',
        'account_status',
        'id_image_url',
        'verified_at',
        'rejection_reason',
        'terms_version',
        'privacy_version',
        'terms_accepted_at',
        'privacy_acknowledged_at',
        'registration_confirmed_at',
        'student_discount_expires_at',
        'renewal_reminder_snoozed_until',
        'renewal_reminder_dismissed_cycle',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'privacy_acknowledged_at' => 'datetime',
            'registration_confirmed_at' => 'datetime',
            'student_discount_expires_at' => 'datetime',
            'renewal_reminder_snoozed_until' => 'datetime',
            'renewal_reminder_dismissed_cycle' => 'integer',
        ];
    }

    protected function firstName(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => Str::title(Str::squish($value)),
        );
    }

    protected function middleName(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => $value === null ? null : Str::title(Str::squish($value)),
        );
    }

    protected function surname(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => Str::title(Str::squish($value)),
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    public function discountApplications()
    {
        return $this->hasMany(DiscountApplication::class, 'commuter_id');
    }

    public static function initialStudentExpiry(): \Illuminate\Support\Carbon
    {
        $today = now('Asia/Manila');
        $month = (int) config('registration.student_renewal_month', 9);
        $year = max((int) config('registration.student_renewal_first_year', 2027), $today->year + ($today->month >= $month - 1 ? 1 : 0));

        return \Illuminate\Support\Carbon::create($year, $month + 1, 1, 0, 0, 0, 'Asia/Manila');
    }

    public function effectiveFareType(): string
    {
        if (strtoupper($this->commuter_type) !== 'STUDENT') {
            return $this->commuter_type;
        }
        $expiry = $this->student_discount_expires_at
            ?? \Illuminate\Support\Carbon::create((int) config('registration.student_renewal_first_year', 2027), (int) config('registration.student_renewal_month', 9) + 1, 1, 0, 0, 0, 'Asia/Manila');

        return now('Asia/Manila')->lt($expiry) ? 'STUDENT' : 'REGULAR';
    }

    public function latestLocation()
    {
        return $this->hasOne(CommuterLocation::class, 'commuter_id');
    }
}
