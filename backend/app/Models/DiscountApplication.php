<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DiscountApplication extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'cycle_year' => 'integer',
            'revision' => 'integer',
            'grade_level' => 'integer',
            'submission_history' => 'array',
            'submitted_at' => 'datetime',
            'first_submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'correction_due_at' => 'datetime',
        ];
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }

    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->where(fn ($q) => $q->where('status', 'PENDING')
            ->orWhere(fn ($q) => $q->where('status', 'NEEDS_CORRECTION')->where('correction_due_at', '>', now())));
    }
}
