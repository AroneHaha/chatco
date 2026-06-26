<?php

namespace App\Services;

use App\Models\Remittance;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ConductorService
{
    /**
     * List the authenticated conductor's own remittances, ordered by date desc.
     *
     * Scoped strictly to the auth conductor's conductor_id — never returns
     * another conductor's records. Each row eager-loads the shift, vehicle,
     * and route relationships so the controller can return the denormalized
     * info the spec requires without N+1 queries.
     *
     * @param  User  $conductor  The authenticated conductor user.
     * @param  int   $perPage   Page size (defaults to 15, matching the other
     *                          list endpoints like ShiftService::getShiftLogs).
     */
    public function listRemittances(User $conductor, int $perPage = 15): LengthAwarePaginator
    {
        return Remittance::where('conductor_id', $conductor->id)
            ->with([
                'shift:id,shift_id,conductor_id,driver_id,vehicle_id,route_id,time_in,time_out,status',
                'vehicle:id,unit_number,plate_number,route_id',
                'vehicle.route:id,name',
                'driver:id,first_name,last_name',
            ])
            ->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->paginate($perPage);
    }
}
