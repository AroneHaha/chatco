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
 *
 * IMPORTANT: When modifying existing columns (pickup_stop_id,
 * dropoff_stop_id, payment_method), we use ->change() WITHOUT
 * ->constrained() because ->constrained() triggers an ADD COLUMN
 * instead of MODIFY COLUMN on MySQL. The existing FK constraints
 * from the original migration are preserved automatically.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Make pickup_stop_id and dropoff_stop_id NULLABLE ───────
        // Use uuid()->nullable()->change() NOT foreignUuid()->constrained()->change()
        // because the latter tries to ADD a new column (MySQL duplicate column error).
        // The existing FK from the original migration is preserved by MySQL's
        // ALTER TABLE MODIFY -- it only changes the NULL constraint, not the FK.
        if (Schema::hasColumn('transactions', 'pickup_stop_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->uuid('pickup_stop_id')->nullable()->change();
            });
        }
        if (Schema::hasColumn('transactions', 'dropoff_stop_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->uuid('dropoff_stop_id')->nullable()->change();
            });
        }

        // ─── 2. payment_method: set default 'CASH' ────────────────────
        // Column already exists (string 20). We only add a default so
        // legacy code that omits payment_method gets CASH (the common
        // case). Old values GCash_Scanned / GCash_Direct / Voucher
        // are NOT migrated here -- they will be collapsed to GCASH
        // in a separate data-repair task if any exist. New writes
        // should use only CASH or GCASH.
        if (Schema::hasColumn('transactions', 'payment_method')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->string('payment_method', 20)->default('CASH')->change();
            });
        }

        // ─── 3-7. Add new columns (all guarded with hasColumn) ────────
        Schema::table('transactions', function (Blueprint $table) {
            // status: PENDING | PAID | FAILED
            // Cash inserts as PAID (recorded immediately)
            // GCash inserts as PENDING, flips to PAID via webhook
            // FAILED captures PayMongo authorize failures
            // Not a DB-level enum (avoids MySQL/SQLite divergence);
            // enforced at the app layer.
            if (! Schema::hasColumn('transactions', 'status')) {
                $table->string('status', 20)->default('PENDING')->index();
            }

            // paymongo_intent_id: The PayMongo PaymentIntent id (e.g., "pi_abc123").
            // Null for cash transactions. Used by the webhook to correlate the
            // PayMongo event back to this transaction row.
            if (! Schema::hasColumn('transactions', 'paymongo_intent_id')) {
                $table->string('paymongo_intent_id')->nullable();
            }

            // paymongo_checkout_url: The PayMongo hosted authorize URL returned
            // by /attach. The commuter is redirected here to authorize the GCash
            // payment. Stored as TEXT because PayMongo URLs can exceed 255 chars.
            if (! Schema::hasColumn('transactions', 'paymongo_checkout_url')) {
                $table->text('paymongo_checkout_url')->nullable();
            }

            // qr_token: Opaque random token (32-char hex) embedded in the conductor
            // binding QR. The commuter app scans the QR and sends the qr_token to
            // claim the transaction (sets passenger_id).
            //
            // SECURITY: NEVER put the raw transaction_id in the QR.
            // The qr_token is a single-use, opaque handle that cannot be guessed
            // and does not leak the transaction id. Unique + indexed so lookups
            // are O(1) and duplicates are impossible at the DB layer.
            if (! Schema::hasColumn('transactions', 'qr_token')) {
                $table->string('qr_token')->nullable()->unique();
            }

            // paid_at: Timestamp when the transaction transitioned to PAID.
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
        });

        // Restore NOT NULL on pickup_stop_id / dropoff_stop_id
        // (Only meaningful on MySQL; SQLite tests use RefreshDatabase
        // and recreate the table from scratch, so this is a no-op there.)
        if (Schema::hasColumn('transactions', 'pickup_stop_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->uuid('pickup_stop_id')->nullable(false)->change();
            });
        }
        if (Schema::hasColumn('transactions', 'dropoff_stop_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->uuid('dropoff_stop_id')->nullable(false)->change();
            });
        }

        // Remove default on payment_method (restore to plain string)
        if (Schema::hasColumn('transactions', 'payment_method')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->string('payment_method', 20)->default(null)->change();
            });
        }
    }
};
