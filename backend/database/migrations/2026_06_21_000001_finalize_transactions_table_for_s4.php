<?php

/**
 * S4-T1: Finalize transactions table for cash + GCash fare persistence.
 *
 * Design (per Sprint 4 clarified flow):
 *   - Cash fares: recorded IMMEDIATELY as PAID from the fare matrix.
 *     No fare_point UUIDs (driver/conductor picks up/dropoff by name only).
 *     => pickup_stop_id and dropoff_stop_id become NULLABLE.
 *   - GCash fares: row starts PENDING, flips to PAID via PayMongo webhook.
 *     Conductor generates an in-app binding QR with an opaque qr_token;
 *     commuter scans it to claim the transaction. NEVER put the raw
 *     transaction_id in the QR.
 *   - GCash earnings are record-only (not physically remitted).
 *   - Cash earnings are physically remitted.
 *   - NO wallet / balance anywhere.
 *
 * This migration is purely ADDITIVE: no columns dropped, no FKs removed.
 * Every column addition is guarded with Schema::hasColumn() so the
 * migration is idempotent and runs cleanly on both MySQL (dev) and
 * SQLite (tests) regardless of prior state.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // ─── 1. Make pickup_stop_id and dropoff_stop_id NULLABLE ───────
            // Cash fares have no fare_point UUID (fare is read from the
            // fare matrix by name only). Existing GCash rows may still
            // reference fare_points; we keep the FK, just relax the
            // NOT NULL constraint.
            //
            // Note: SQLite cannot use ->nullable()->change() on a FK
            // column without Doctrine DBAL, and Laravel 12's Schema
            // builder handles this transparently on MySQL. On SQLite
            // (used by RefreshDatabase in tests), the table is freshly
            // created from the original migration, so this change()
            // call is a no-op there. On MySQL (dev/prod), it alters
            // the existing column to drop the NOT NULL.
            if (Schema::hasColumn('transactions', 'pickup_stop_id')) {
                $table->foreignUuid('pickup_stop_id')
                    ->nullable()
                    ->constrained('fare_points')
                    ->nullOnDelete()
                    ->change();
            }
            if (Schema::hasColumn('transactions', 'dropoff_stop_id')) {
                $table->foreignUuid('dropoff_stop_id')
                    ->nullable()
                    ->constrained('fare_points')
                    ->nullOnDelete()
                    ->change();
            }

            // ─── 2. payment_method: set default 'CASH' ────────────────────
            // Column already exists (string 20). We only add a default so
            // legacy code that omits payment_method gets CASH (the common
            // case). Old values GCash_Scanned / GCash_Direct / Voucher
            // are NOT migrated here -- they will be collapsed to GCASH
            // in a separate data-repair task if any exist. New writes
            // should use only CASH or GCASH.
            if (Schema::hasColumn('transactions', 'payment_method')) {
                $table->string('payment_method', 20)->default('CASH')->change();
            }

            // ─── 3. status: NEW column ────────────────────────────────────
            // Values: PENDING | PAID | FAILED
            // - Cash inserts as PAID (recorded immediately)
            // - GCash inserts as PENDING, flips to PAID via webhook
            // - FAILED captures PayMongo authorize failures
            // Not a DB-level enum (avoids MySQL/SQLite divergence);
            // enforced at the app layer.
            if (! Schema::hasColumn('transactions', 'status')) {
                $table->string('status', 20)->default('PENDING')->index();
            }

            // ─── 4. paymongo_intent_id: NEW column ────────────────────────
            // The PayMongo PaymentIntent id (e.g., "pi_abc123"). Null for
            // cash transactions. Used by the webhook to correlate the
            // PayMongo event back to this transaction row.
            if (! Schema::hasColumn('transactions', 'paymongo_intent_id')) {
                $table->string('paymongo_intent_id')->nullable();
            }

            // ─── 5. paymongo_checkout_url: NEW column ─────────────────────
            // The PayMongo hosted authorize URL returned by /attach.
            // The commuter is redirected here to authorize the GCash
            // payment. Stored as TEXT because PayMongo URLs can exceed
            // the 255-char varchar limit.
            if (! Schema::hasColumn('transactions', 'paymongo_checkout_url')) {
                $table->text('paymongo_checkout_url')->nullable();
            }

            // ─── 6. qr_token: NEW column ──────────────────────────────────
            // Opaque random token (32-char hex) embedded in the conductor
            // binding QR. The commuter app scans the QR and sends the
            // qr_token to claim the transaction (sets passenger_id).
            //
            // SECURITY: NEVER put the raw transaction_id in the QR.
            // The qr_token is a single-use, opaque handle that cannot
            // be guessed and does not leak the transaction id. Unique
            // + indexed so lookups are O(1) and duplicates are
            // impossible at the DB layer.
            if (! Schema::hasColumn('transactions', 'qr_token')) {
                $table->string('qr_token')->nullable()->unique();
            }

            // ─── 7. paid_at: NEW column ───────────────────────────────────
            // Timestamp when the transaction transitioned to PAID.
            // For cash: set at insert time (= created_at).
            // For GCash: set by the webhook when PayMongo confirms.
            // Null for FAILED transactions.
            if (! Schema::hasColumn('transactions', 'paid_at')) {
                $table->timestamp('paid_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Drop new columns (reverse of up())
            if (Schema::hasColumn('transactions', 'paid_at')) {
                $table->dropColumn('paid_at');
            }
            if (Schema::hasColumn('transactions', 'qr_token')) {
                // SQLite needs the index dropped before the column;
                // MySQL handles both in one call. Drop unique first.
                try {
                    $table->dropUnique(['qr_token']);
                } catch (\Throwable $e) {
                    // Index may not exist on SQLite; safe to ignore.
                }
                $table->dropColumn('qr_token');
            }
            if (Schema::hasColumn('transactions', 'paymongo_checkout_url')) {
                $table->dropColumn('paymongo_checkout_url');
            }
            if (Schema::hasColumn('transactions', 'paymongo_intent_id')) {
                $table->dropColumn('paymongo_intent_id');
            }
            if (Schema::hasColumn('transactions', 'status')) {
                $table->dropIndex(['status']);
                $table->dropColumn('status');
            }

            // Restore NOT NULL on pickup_stop_id / dropoff_stop_id
            // (Only meaningful on MySQL; SQLite tests use RefreshDatabase
            // and recreate the table from scratch, so this is a no-op there.)
            if (Schema::hasColumn('transactions', 'pickup_stop_id')) {
                $table->foreignUuid('pickup_stop_id')->constrained('fare_points')->change();
            }
            if (Schema::hasColumn('transactions', 'dropoff_stop_id')) {
                $table->foreignUuid('dropoff_stop_id')->constrained('fare_points')->change();
            }

            // Remove default on payment_method (restore to plain string)
            if (Schema::hasColumn('transactions', 'payment_method')) {
                $table->string('payment_method', 20)->default(null)->change();
            }
        });
    }
};
