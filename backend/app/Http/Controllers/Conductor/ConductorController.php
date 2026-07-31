<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Http\ApiResponse;
use App\Http\Requests\Conductor\InitiateGcashRequest;
use App\Http\Requests\Conductor\RecordCashRequest;
use App\Http\Requests\Conductor\StartShiftRequest;
use App\Http\Requests\Conductor\UpdateLocationRequest;
use App\Http\Requests\Conductor\SubmitRemittanceRequest;
use App\Models\Driver;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\ConductorService;
use App\Services\FeedbackService;
use App\Services\LocationService;
use App\Services\ShiftService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConductorController extends Controller
{
    use ApiResponse;

    protected ShiftService $shiftService;
    protected LocationService $locationService;
    protected TransactionService $transactionService;
    protected ConductorService $conductorService;
    protected FeedbackService $feedbackService;

    public function __construct(
        ShiftService $shiftService,
        LocationService $locationService,
        TransactionService $transactionService,
        ConductorService $conductorService,
        FeedbackService $feedbackService
    ) {
        $this->shiftService = $shiftService;
        $this->locationService = $locationService;
        $this->transactionService = $transactionService;
        $this->conductorService = $conductorService;
        $this->feedbackService = $feedbackService;
    }

    /**
     * GET /api/conductor/shift
     */
    public function shiftStatus(Request $request): JsonResponse
    {
        $activeShift = $this->shiftService->getActiveShift($request->user());

        if (! $activeShift) {
            return $this->successResponse(null, 'No active shift');
        }

        return $this->successResponse($activeShift, 'Active shift retrieved');
    }

    /**
     * POST /api/conductor/shifts/start
     */
    public function startShift(StartShiftRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $shiftLog = $this->shiftService->startShift(
            $request->user(),
            $validated['vehicle_id'],
            $validated['driver_id'],
            $validated['route_id'] ?? null,
        );

        return $this->successResponse(
            $shiftLog->load(['vehicle', 'driver', 'route']),
            'Shift started',
            201,
        );
    }

    /**
     * POST /api/conductor/remittances
     * This is the ONLY way to end a shift.
     */
    public function remittances(SubmitRemittanceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $shiftLog = $this->shiftService->endShiftViaRemittance(
            $request->user(),
            $validated['shift_id'],
            (float) $validated['total_collected'],
            (float) $validated['remitted_amount'],
        );

        return $this->successResponse(
            $shiftLog->load(['vehicle', 'driver', 'route', 'remittance']),
            'Shift ended via remittance',
        );
    }

    /**
     * GET /api/conductor/remittances
     * List the authenticated conductor's own submitted remittances (read-only).
     * Scoped strictly to the auth conductor — never returns another conductor's
     * records. Delegates the query to ConductorService::listRemittances().
     */
    public function remittancesIndex(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 15);

        $remittances = $this->conductorService->listRemittances(
            $request->user(),
            $perPage,
        );

        return $this->successResponse($remittances, 'Remittance history retrieved');
    }

    /**
     * GET /api/conductor/ratings?shift_id=…
     *
     * Feedback for one of the conductor's shifts — powers the metrics page.
     * Each row carries BOTH the driver rating and the (independent) conductor
     * rating; the frontend splits each into a DRIVER + CONDUCTOR entry. Scoped
     * to the authenticated conductor in the service (a conductor can only read
     * feedback for shifts they crewed).
     */
    public function ratings(Request $request): JsonResponse
    {
        $shiftId = $request->query('shift_id');
        if (! $shiftId) {
            return $this->errorResponse('shift_id query parameter is required.', 422);
        }

        $ratings = $this->feedbackService->listForShift($shiftId, $request->user());

        return $this->successResponse($ratings, 'Ratings retrieved');
    }

    /**
     * Read-only receipt configuration for the conductor's completed-fare UI.
     * The general admin settings store remains protected by role:ADMIN.
     */
    public function receiptSettings(): JsonResponse
    {
        $defaults = [
            'receipt_business_name' => 'CHATCO',
            'receipt_address_line' => '',
            'receipt_footer_note' => 'Thank you for riding with Chatco!',
            'receipt_paper_width' => '58',
            'receipt_auto_print' => 'true',
            'receipt_show_datetime' => 'true',
            'receipt_show_transaction_id' => 'true',
            'receipt_show_route' => 'true',
            'receipt_show_unit' => 'true',
            'receipt_show_conductor' => 'true',
            'receipt_show_passenger' => 'true',
            'receipt_show_fare_breakdown' => 'true',
        ];

        $saved = Setting::where('category', 'receipt')
            ->whereIn('key', array_keys($defaults))
            ->pluck('value', 'key')
            ->all();

        return $this->successResponse(
            array_replace($defaults, $saved),
            'Receipt settings retrieved',
        );
    }

    /**
     * POST /api/conductor/break-status
     */
    public function updateBreakStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_on_break' => ['required', 'boolean'],
        ]);

        $shift = $this->shiftService->setBreakStatus(
            $request->user(),
            (bool) $validated['is_on_break'],
        );

        return $this->successResponse(
            $shift,
            $shift->is_on_break ? 'Break started' : 'Break ended',
        );
    }
    /**
     * POST /api/conductor/location
     * GPS update — triggers VehicleLocationUpdated broadcast.
     */
    public function updateLocation(UpdateLocationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $location = $this->locationService->updateLocation(
            $request->user(),
            (float) $validated['lat'],
            (float) $validated['lng'],
            isset($validated['speed']) ? (float) $validated['speed'] : null,
            isset($validated['heading']) ? (float) $validated['heading'] : null,
            $validated['capacity_status'] ?? null,
        );

        return $this->successResponse($location, 'Location updated');
    }

    /**
     * POST /api/conductor/capacity-status
     */
    public function updateCapacityStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'capacity_status' => 'required|string|in:AVAILABLE,STANDING,FULL',
        ]);

        $location = $this->locationService->updateCapacityStatus(
            $request->user(),
            $validated['capacity_status'],
        );

        return $this->successResponse($location, 'Capacity status updated');
    }

    /**
     * GET /api/conductor/shift-logs
     */
    public function shiftLogs(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);

        $shiftLogs = $this->shiftService->getShiftLogs($request->user(), $perPage);

        return $this->successResponse($shiftLogs, 'Shift history retrieved');
    }

    /**
     * GET /api/conductor/transactions?shift_id={id}
     *
     * Lists all transactions for the given shift. The shift_id query
     * param is required; the service enforces that the shift belongs
     * to the authenticated conductor (403 otherwise).
     */
    public function transactions(Request $request): JsonResponse
    {
        $shiftId = $request->query('shift_id');

        if (! $shiftId) {
            return $this->errorResponse('shift_id query parameter is required', 422);
        }

        $transactions = $this->transactionService->getShiftTransactions(
            $request->user(),
            $shiftId,
        );

        return $this->successResponse($transactions, 'Shift transactions retrieved');
    }

    /**
     * POST /api/conductor/transactions
     *
     * Records a cash fare immediately as PAID. Delegates to
     * TransactionService::recordCashFare() which handles:
     *   - Active shift resolution (422 if none)
     *   - Idempotency check (natural key within 60s window)
     *   - Denormalization of conductor_name/unit_number/driver_name
     *
     * Returns 201 Created on success.
     */
    public function storeTransaction(RecordCashRequest $request): JsonResponse
    {
        $transaction = $this->transactionService->recordCashFare(
            $request->user(),
            $request->validated(),
        );

        return $this->successResponse(
            $transaction,
            'Cash fare recorded',
            201,
        );
    }

    /**
     * POST /api/conductor/payments/gcash/initiate
     *
     * Initiates a GCash fare: creates a PENDING transaction with a
     * unique qr_token and asks the configured payment gateway (via
     * TransactionService::initiateGcashFare) for a hosted checkout_url.
     * Returns the binding-QR payload that the conductor app displays.
     *
     * Delegates to TransactionService::initiateGcashFare().
     */
    public function initiateGcash(InitiateGcashRequest $request): JsonResponse
    {
        $result = $this->transactionService->initiateGcashFare(
            $request->user(),
            $request->validated(),
        );

        // Return the spec-mandated payload shape (NOT the full transaction)
        return $this->successResponse([
            'transaction_id' => $result['transaction']->transaction_id,
            'qr_token'       => $result['qr_token'],
            'checkout_url'   => $result['checkout_url'],
            'amount'         => $result['amount'],
            'expires_at'     => $result['expires_at'],
        ], 'GCash fare initiated', 201);
    }

    /**
     * GET /api/conductor/payments/gcash/pending
     *
     * The conductor's resumable PENDING GCash transaction for their active
     * shift, or null. Lets the frontend re-display the SAME QR + details
     * after the conductor navigated away or refreshed mid-payment, instead
     * of minting a duplicate. Stale rows are lazily expired by the lookup,
     * so a QR past its TTL is never offered for resume.
     */
    public function pendingGcash(Request $request): JsonResponse
    {
        $result = $this->transactionService->findPendingGcashForConductor($request->user());

        if (! $result) {
            return $this->successResponse(null, 'No pending GCash payment');
        }

        $transaction = $result['transaction'];

        return $this->successResponse([
            'transaction_id' => $transaction->transaction_id,
            'qr_token'       => $result['qr_token'],
            'checkout_url'   => $result['checkout_url'],
            'amount'         => $result['amount'],
            'expires_at'     => $result['expires_at'],
            // Route names so the resumed QR screen can show the trip.
            'pickup_name'    => $transaction->pickup_name,
            'dropoff_name'   => $transaction->dropoff_name,
        ], 'Pending GCash payment found');
    }

    /**
     * GET /api/conductor/earnings?shift_id={id}
     *
     * Returns the cash vs GCash earnings breakdown for the given shift.
     * cash_total = sum of CASH+PAID (the physically-remitted figure).
     * gcash_total = sum of GCASH+PAID (record-only, NOT remitted).
     * total = cash_total + gcash_total.
     *
     * PENDING GCash is excluded (may still FAIL).
     */
    public function earnings(Request $request): JsonResponse
    {
        $shiftId = $request->query('shift_id');

        if (! $shiftId) {
            return $this->errorResponse('shift_id query parameter is required', 422);
        }

        $earnings = $this->transactionService->getShiftEarnings(
            $request->user(),
            $shiftId,
        );

        return $this->successResponse($earnings, 'Shift earnings retrieved');
    }

    /**
     * GET /api/conductor/profile
     *
     * Note: first_name / last_name live on the ConductorProfile relation,
     * not on the User model itself. Eager-load the profile to avoid
     * returning a single-space name.
     */
    public function profile(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = User::with('conductorProfile')->find(Auth::id());

        $profile = $user->conductorProfile;
        $name = $profile
            ? trim($profile->first_name . ' ' . $profile->last_name)
            : null;

        return $this->successResponse([
            'id' => $user->id,
            'name' => $name,
            'email' => $user->email,
            'role' => $user->role,
            'username' => $profile?->generated_username,
        ], 'Conductor profile retrieved');
    }

    /**
     * GET /api/conductor/units
     * Returns available vehicles for shift assignment.
     *
     * Eager-loads `route` so the frontend proxy can map the route name
     * into `ConductorUnit.route` without a second round-trip.
     * Excludes vehicles already on an active shift (same pattern as
     * `drivers()`) — the UI should only show vehicles a conductor can
     * actually select.
     */
    public function units(): JsonResponse
    {
        $units = Vehicle::with('route')
            ->where('status', 'ACTIVE')
            ->whereDoesntHave('activeShift')
            ->get();

        return $this->successResponse($units, 'Available vehicles retrieved');
    }

    /**
     * GET /api/conductor/drivers
     * Returns drivers not currently on an active shift.
     */
    public function drivers(): JsonResponse
    {
        $drivers = Driver::whereDoesntHave('activeShift')->get();

        return $this->successResponse($drivers, 'Available drivers retrieved');
    }
}