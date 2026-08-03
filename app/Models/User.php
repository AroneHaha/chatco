<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    // SoftDeletes: the users table already ships a deleted_at column. Enabling
    // the trait makes admin deletes reversible/auditable, prevents a hard
    // delete from cascading away a user's financial history (transactions,
    // shift_logs, remittances) and profile, and — via the global scope —
    // automatically locks soft-deleted users out of authentication.
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->id)) {
                $user->id = (string) Str::uuid();
            }
        });
    }

    // Relationships

    public function adminProfile()
    {
        return $this->hasOne(AdminProfile::class, 'id', 'id');
    }

    public function conductorProfile()
    {
        return $this->hasOne(ConductorProfile::class, 'id', 'id');
    }

    public function commuterProfile()
    {
        return $this->hasOne(CommuterProfile::class, 'id', 'id');
    }

    public function suspensions()
    {
        return $this->hasMany(UserSuspension::class);
    }

    public function activeSuspension()
    {
        return $this->hasOne(UserSuspension::class)
            ->whereNull('lifted_at')
            ->where(function ($query) {
                $query->where('is_permanent', true)
                    ->orWhere('ends_at', '>', now());
            })
            ->latestOfMany('starts_at');
    }

    // Helper Methods

    public function hasRole(UserRole $role): bool
    {
        return $this->role === $role;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::ADMIN;
    }

    public function isConductor(): bool
    {
        return $this->role === UserRole::CONDUCTOR;
    }

    public function isCommuter(): bool
    {
        return $this->role === UserRole::COMMUTER;
    }

    public function getDisplayName(): string
    {
        return match ($this->role) {
            UserRole::ADMIN => $this->adminProfile
                ? trim($this->adminProfile->first_name . ' ' . $this->adminProfile->last_name)
                : $this->email,

            UserRole::CONDUCTOR => $this->conductorProfile
                ? trim($this->conductorProfile->first_name . ' ' . $this->conductorProfile->last_name)
                : $this->email,

            UserRole::COMMUTER => $this->commuterProfile
                ? trim($this->commuterProfile->first_name . ' ' . $this->commuterProfile->surname)
                : $this->email,
        };
    }
}
