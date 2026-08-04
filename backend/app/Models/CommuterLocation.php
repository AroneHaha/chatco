<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommuterLocation extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'commuter_id';

    protected $keyType = 'string';

    protected $fillable = ['commuter_id', 'latitude', 'longitude', 'accuracy'];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'float',
        ];
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class, 'commuter_id');
    }
}
