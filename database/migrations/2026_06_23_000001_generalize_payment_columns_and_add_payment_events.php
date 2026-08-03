<?php

/**
 * Provider-agnostic payment schema.
 *
 * WHY:
 *   The Sprint 4 columns were PayMongo-specific (paymongo_intent_id,
 *   paymongo_checkout_url). To make the system integration-ready for any
 *   gateway with minimal future change, generalize them:
 *     - payment_provider   : which gateway settled it ("paymongo", "fake", …)
 *     - payment_reference  : provider intent/charge reference (was paymongo_intent_id)
 *     - payment_checkout_url: hosted authorize URL (was paymongo_checkout_url)
 *     - payment_metadata   : extensible JSON for provider-specific data
 *
 *   Plus a payment_events table: an append-only audit + idempotency log of
 *   every webhook event, keyed unique on (provider, event_id) so a replayed
 *   webhook is processed exactly once.
 *
 * Additive + guarded (MySQL dev + SQLite tests). Existing PayMongo data is
 * backfilled into the generic columns before the old ones are dropped.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add generic payment columns.
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'payment_provider')) {
                $table->string('payment_provider', 50)->nullable();
            }
            if (! Schema::hasColumn('transactions', 'payment_reference')) {
                $table->string('payment_reference')->nullable();
            }
            if (! Schema::hasColumn('transactions', 'payment_checkout_url')) {
                $table->text('payment_checkout_url')->nullable();
            }
            if (! Schema::hasColumn('transactions', 'payment_metadata')) {
                $table->json('payment_metadata')->nullable();
            }
        });

        // 2. Backfill from the old PayMongo-specific columns (no-op on fresh DBs).
        if (Schema::hasColumn('transactions', 'paymongo_intent_id')
            && Schema::hasColumn('transactions', 'payment_reference')) {
            DB::table('transactions')
                ->whereNotNull('paymongo_intent_id')
                ->update([
                    'payment_reference' => DB::raw('paymongo_intent_id'),
                    'payment_checkout_url' => DB::raw('paymongo_checkout_url'),
                    'payment_provider' => 'paymongo',
                ]);
        }

        // 3. Index the new lookup column (webhook/status correlation).
        $this->safelyAddIndex('transactions', ['payment_reference'], 'transactions_payment_reference_index');

        // 4. Drop the old PayMongo-specific index + columns.
        $this->safelyDropIndex('transactions', 'transactions_paymongo_intent_id_index');
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'paymongo_intent_id')) {
                $table->dropColumn('paymongo_intent_id');
            }
            if (Schema::hasColumn('transactions', 'paymongo_checkout_url')) {
                $table->dropColumn('paymongo_checkout_url');
            }
        });

        // 5. Webhook audit + idempotency log.
        if (! Schema::hasTable('payment_events')) {
            Schema::create('payment_events', function (Blueprint $table) {
                $table->id();
                $table->string('provider', 50);
                $table->string('event_id');               // provider event id (idempotency key)
                $table->string('transaction_id', 30)->nullable();
                $table->string('type', 100);              // raw provider event type
                $table->string('status', 20);             // canonical PaymentStatus applied
                $table->json('payload')->nullable();      // raw event for audit
                $table->timestamps();

                $table->unique(['provider', 'event_id']); // exactly-once processing
                $table->index('transaction_id');
                $table->foreign('transaction_id')
                    ->references('transaction_id')->on('transactions')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');

        // Restore the old PayMongo-specific columns + backfill back.
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'paymongo_intent_id')) {
                $table->string('paymongo_intent_id')->nullable();
            }
            if (! Schema::hasColumn('transactions', 'paymongo_checkout_url')) {
                $table->text('paymongo_checkout_url')->nullable();
            }
        });

        if (Schema::hasColumn('transactions', 'payment_reference')) {
            DB::table('transactions')
                ->whereNotNull('payment_reference')
                ->update([
                    'paymongo_intent_id' => DB::raw('payment_reference'),
                    'paymongo_checkout_url' => DB::raw('payment_checkout_url'),
                ]);
        }

        $this->safelyAddIndex('transactions', ['paymongo_intent_id'], 'transactions_paymongo_intent_id_index');
        $this->safelyDropIndex('transactions', 'transactions_payment_reference_index');

        Schema::table('transactions', function (Blueprint $table) {
            foreach (['payment_metadata', 'payment_checkout_url', 'payment_reference', 'payment_provider'] as $col) {
                if (Schema::hasColumn('transactions', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    private function safelyAddIndex(string $table, array $columns, string $name): void
    {
        try {
            Schema::table($table, fn (Blueprint $t) => $t->index($columns, $name));
        } catch (\Throwable $e) {
            // already exists — no-op
        }
    }

    private function safelyDropIndex(string $table, string $name): void
    {
        try {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex($name));
        } catch (\Throwable $e) {
            // does not exist — no-op
        }
    }
};
