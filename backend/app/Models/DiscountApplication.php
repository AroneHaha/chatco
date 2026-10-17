<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class DiscountApplication extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    /** Free-text school fields, trimmed before validation. */
    public const STUDENT_TEXT_FIELDS = ['school_name', 'school_year', 'enrollment_term'];

    /**
     * The school details a Student discount asks for, shared by renewal,
     * discount applications and the admin's onsite registration so all three
     * ask the same questions. Every rule is skipped when $student is false.
     */
    public static function studentDetailRules(bool $student): array
    {
        return [
            'school_name' => [Rule::excludeIf(! $student), 'required', 'string', 'max:150'],
            'education_level' => [Rule::excludeIf(! $student), 'required', Rule::in(['HIGH_SCHOOL', 'COLLEGE'])],
            'grade_level' => [Rule::excludeIf(! $student), 'exclude_unless:education_level,HIGH_SCHOOL', 'required', 'integer', 'between:7,12'],
            'school_year' => [Rule::excludeIf(! $student), 'required', 'string', 'max:20'],
            'enrollment_term' => [Rule::excludeIf(! $student), 'required_if:education_level,COLLEGE', 'nullable', 'string', 'max:50'],
        ];
    }

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
