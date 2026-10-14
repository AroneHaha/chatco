<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VoucherDistributionService
{
    public function __construct(private AnnouncementService $announcementService) {}

    /** @return array{vouchers: Collection, replayed: bool} */
    public function generate(User $admin, array $data): array
    {
        abort_unless($admin->isAdmin(), 403, 'Only administrators may generate vouchers.');

        $quantity = (int) ($data['quantity'] ?? 1);
        $duplicates = (bool) ($data['allow_duplicates'] ?? false);
        $validityHours = isset($data['validity_hours']) ? (int) $data['validity_hours'] : null;
        $details = [
            'type' => $data['type'],
            'amount' => $data['type'] === 'DISCOUNT' ? number_format((float) $data['amount'], 2, '.', '') : null,
            'expires_at' => isset($data['expires_at']) ? Carbon::parse($data['expires_at'])->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s') : null,
            'ride_origin' => $data['ride_origin'] ?? 'Any',
        ];
        $key = $data['idempotency_key'] ?? (string) Str::uuid();
        $hashDetails = $details;
        // Hash the requested duration, not a moving expiry date, so retries
        // return the original batch. Preserve hashes for existing requests.
        if ($validityHours !== null) {
            $hashDetails['validity_hours'] = $validityHours;
        }
        $hash = hash('sha256', json_encode([$quantity, $duplicates, $hashDetails], JSON_THROW_ON_ERROR));

        // A conflicting request key or code rolls back the whole insert. Handle
        // unique races outside the transaction (also safe on PostgreSQL).
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                return DB::transaction(function () use ($admin, $key, $hash, $quantity, $duplicates, $details, $validityHours): array {
                    $previous = DB::table('voucher_generation_batches')
                        ->where('admin_id', $admin->id)->where('idempotency_key', $key)->first();
                    if ($previous) {
                        return $this->replay($previous, $hash);
                    }

                    $batchId = (string) Str::uuid();
                    $now = now();
                    if ($validityHours !== null) {
                        $details['expires_at'] = $now->copy()->addHours($validityHours)->format('Y-m-d H:i:s');
                    }
                    DB::table('voucher_generation_batches')->insert([
                        'id' => $batchId,
                        'admin_id' => $admin->id,
                        'idempotency_key' => $key,
                        'request_hash' => $hash,
                        'quantity' => $quantity,
                        'allow_duplicates' => $duplicates,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                    $recipients = $this->recipients($quantity);
                    if ($recipients === [] || (! $duplicates && count($recipients) < $quantity)) {
                        throw ValidationException::withMessages([
                            'quantity' => ['Not enough eligible commuters. Available: '.count($recipients).'. No vouchers were distributed.'],
                        ]);
                    }

                    $rows = [];
                    for ($index = 0; $index < $quantity; $index++) {
                        $commuterId = $recipients[$index] ?? $recipients[random_int(0, count($recipients) - 1)];
                        $rows[] = $details + [
                            'id' => (string) Str::uuid(),
                            'code' => 'CHATCO-'.Str::upper(Str::random(3)).'-'.Str::upper(Str::random(6)),
                            'commuter_id' => $commuterId,
                            'status' => Voucher::STATUS_AVAILABLE,
                            'generation_batch_id' => $batchId,
                            // Slot zero enforces one voucher per recipient by default.
                            // Explicit repeat recipients use distinct slots instead.
                            'recipient_slot' => $duplicates ? $index : 0,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                    Voucher::insert($rows);

                    $category = $details['type'] === 'DISCOUNT' ? '₱'.$details['amount'].' discount' : 'free-ride';
                    $expiry = $details['expires_at']
                        ? 'Valid until '.Carbon::parse($details['expires_at'])->timezone('Asia/Manila')->format('M j, Y \\a\\t g:i A').' (Philippine time).'
                        : 'No time limit.';
                    // One private notice per recipient in this batch, even when
                    // repeat recipients are allowed. Insert notices in the same
                    // transaction so retries and failures cannot orphan them.
                    $this->announcementService->notifyUsers(
                        array_unique(array_column($rows, 'commuter_id')),
                        'voucher_received',
                        'Voucher received',
                        "You received a {$category} voucher. {$expiry} Each voucher can be used once. Open Rewards → Available to view your vouchers.",
                        $batchId,
                    );

                    return ['vouchers' => $this->batchVouchers($batchId), 'replayed' => false];
                }, 3);
            } catch (UniqueConstraintViolationException $exception) {
                $previous = DB::table('voucher_generation_batches')
                    ->where('admin_id', $admin->id)->where('idempotency_key', $key)->first();
                if ($previous) {
                    return $this->replay($previous, $hash);
                }
                if ($attempt === 2) {
                    throw $exception;
                }
            }
        }

        throw new \LogicException('Voucher generation did not complete.');
    }

    /**
     * Select at most the batch size using an indexed UUID seek and wraparound.
     * Existing account UUIDs are random: starting at a fresh random UUID avoids
     * registration-order preference, full-table random sorting and large offsets.
     * The locking join revalidates/locks both profiles and their user accounts.
     * Separate batches may share recipients; uniqueness is per batch.
     */
    private function recipients(int $quantity): array
    {
        $pivot = (string) Str::uuid();
        $eligible = $this->eligibleCommuters();
        $selected = (clone $eligible)->where('commuter_profiles.id', '>=', $pivot)
            ->orderBy('commuter_profiles.id')->limit($quantity)->lockForUpdate()
            ->pluck('commuter_profiles.id')->all();
        if (count($selected) < $quantity) {
            $selected = array_merge($selected, (clone $eligible)->where('commuter_profiles.id', '<', $pivot)
                ->orderBy('commuter_profiles.id')->limit($quantity - count($selected))->lockForUpdate()
                ->pluck('commuter_profiles.id')->all());
        }

        shuffle($selected);

        return $selected;
    }

    private function eligibleCommuters(): Builder
    {
        return DB::table('commuter_profiles')
            ->join('users', 'users.id', '=', 'commuter_profiles.id')
            ->where('commuter_profiles.account_status', 'ACTIVE')
            ->whereNotNull('commuter_profiles.verified_at')
            ->whereNull('commuter_profiles.deleted_at')
            ->where('users.role', UserRole::COMMUTER->value)
            ->whereNull('users.deleted_at')
            ->whereNotExists(function (Builder $query): void {
                $query->selectRaw('1')->from('user_suspensions')
                    ->whereColumn('user_suspensions.user_id', 'users.id')
                    ->whereNull('lifted_at')
                    ->where(fn (Builder $active) => $active->where('is_permanent', true)->orWhere('ends_at', '>', now()));
            });
    }

    private function replay(object $batch, string $hash): array
    {
        abort_unless(hash_equals($batch->request_hash, $hash), 409, 'This generation request was already used with different voucher details.');

        return ['vouchers' => $this->batchVouchers($batch->id), 'replayed' => true];
    }

    private function batchVouchers(string $batchId): Collection
    {
        return Voucher::withTrashed()->with('commuter:id,first_name,surname')
            ->where('generation_batch_id', $batchId)->orderBy('id')->get();
    }
}
