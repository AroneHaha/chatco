<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DiscountApplication extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    // Status screens and queue pages never need document paths or revision history.
    public const SUMMARY_COLUMNS = [
        'id', 'commuter_id', 'request_type', 'requested_type', 'cycle_year', 'revision', 'status',
        'school_name', 'education_level', 'grade_level', 'school_year', 'enrollment_term',
        'reason', 'reviewed_by', 'document_mime', 'submitted_at', 'first_submitted_at', 'reviewed_at', 'correction_due_at',
    ];

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

    // A renewal correction lapses at its deadline; an application correction
    // has no deadline and stays open until the commuter resubmits.
    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->where(fn ($q) => $q->where('status', 'PENDING')
            ->orWhere(fn ($q) => $q->where('status', 'NEEDS_CORRECTION')->where(fn ($q) => $q
                ->where('request_type', 'APPLICATION')->orWhere('correction_due_at', '>', now()))));
    }
}
