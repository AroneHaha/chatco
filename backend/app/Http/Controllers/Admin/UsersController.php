<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\User;
use App\Models\CommuterProfile;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/users
     */
    public function index(Request $request): JsonResponse
    {
        $activeUsers = User::where('role', 'COMMUTER')
            ->with('commuterProfile')
            ->whereHas('commuterProfile', fn ($q) => $q->where('account_status', 'Active'))
            ->get()
            ->map(fn ($u) => [
                'id'                 => $u->id,
                'name'               => trim("{$u->commuterProfile->first_name} {$u->commuterProfile->middle_name} {$u->commuterProfile->surname}"),
                'email'              => $u->email,
                'phoneNumber'        => $u->commuterProfile->contact_number,
                'status'             => $u->commuterProfile->account_status,
                'commuterType'       => $u->commuterProfile->commuter_type,
                'languagePreference' => $u->commuterProfile->language_preference,
                'idImageUrl'         => $u->commuterProfile->id_image_url,
            ]);

        $pendingRequests = User::where('role', 'COMMUTER')
            ->with('commuterProfile')
            ->whereHas('commuterProfile', fn ($q) => $q->where('account_status', 'Pending Verification'))
            ->get()
            ->map(fn ($u) => [
                'id'                 => $u->id,
                'name'               => trim("{$u->commuterProfile->first_name} {$u->commuterProfile->middle_name} {$u->commuterProfile->surname}"),
                'email'              => $u->email,
                'phoneNumber'        => $u->commuterProfile->contact_number,
                'commuterType'       => $u->commuterProfile->commuter_type,
                'languagePreference' => $u->commuterProfile->language_preference,
                'idImageUrl'         => $u->commuterProfile->id_image_url,
                'status'             => 'Pending Verification',
            ]);

        $rejectedUsers = User::where('role', 'COMMUTER')
            ->with('commuterProfile')
            ->whereHas('commuterProfile', fn ($q) => $q->where('account_status', 'Rejected'))
            ->get()
            ->map(fn ($u) => [
                'id'                 => $u->id,
                'name'               => trim("{$u->commuterProfile->first_name} {$u->commuterProfile->middle_name} {$u->commuterProfile->surname}"),
                'email'              => $u->email,
                'phoneNumber'        => $u->commuterProfile->contact_number,
                'commuterType'       => $u->commuterProfile->commuter_type,
                'languagePreference' => $u->commuterProfile->language_preference,
                'idImageUrl'         => $u->commuterProfile->id_image_url,
                'status'             => 'Rejected',
                'rejectionReason'    => $u->commuterProfile->rejection_reason ?? 'Not specified',
            ]);

        return $this->successResponse([
            'activeUsers'      => $activeUsers,
            'pendingRequests'  => $pendingRequests,
            'rejectedUsers'    => $rejectedUsers,
        ], 'Users list');
    }

    /**
     * GET /api/admin/users/{id}/history
     */
    public function history(string $id): JsonResponse
    {
        $transactions = Transaction::where('commuter_id', $id)
            ->orderBy('trip_date', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($t) => [
                'id'      => $t->id,
                'date'    => $t->trip_date?->format('Y-m-d h:i A'),
                'action'  => 'Trip Payment',
                'details' => "Paid {$t->fare_amount} via {$t->payment_method}.",
            ]);

        return $this->successResponse([
            'historyLogs' => $transactions,
        ], 'User history');
    }

    /**
     * PATCH /api/admin/users/{id}/approve
     */
    public function approve(string $id): JsonResponse
    {
        $profile = CommuterProfile::findOrFail($id);
        $profile->update(['account_status' => 'Active']);

        return $this->successResponse(null, 'User approved');
    }

    /**
     * PATCH /api/admin/users/{id}/reject
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        $profile = CommuterProfile::findOrFail($id);
        $profile->update([
            'account_status'   => 'Rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return $this->successResponse(null, 'User rejected');
    }
}