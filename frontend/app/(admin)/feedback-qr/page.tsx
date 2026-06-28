'use client';

import { useState, useEffect, useMemo } from 'react';
import { QrCode, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { QrDisplay } from '@/components/admin/feedback-qr/qr-display';
import {
  list as listVehicles,
  type AdminVehicle,
  type VehicleListResult,
} from '@/lib/admin/services/vehicle.service';
import {
  generate as generateQr,
  type GeneratedQr,
  QrGenerateError,
} from '@/lib/admin/services/feedback-qr.service';

/**
 * Sprint 6 — Admin Feedback-QR generation page (S6-T6, admin half).
 *
 * Flow:
 *  1. Fetch the active vehicle fleet on mount (vehicleService.list — same
 *     data the Fleet Management page uses, so the dropdown is always in sync).
 *  2. Admin picks a vehicle from the dropdown (or via a search box for fleets
 *     too large to scan).
 *  3. Admin clicks "Generate QR" → feedbackQrService.generate(vehicleId) →
 *     backend issues an HMAC-signed token encoding vehicle_id + TTL.
 *  4. The QrDisplay component renders the token as a QR (qrcode.react),
 *     shows the expiry countdown, and offers Download PNG + Print buttons.
 *
 * The QR is stateless (no DB row at issue time) — revocation is via TTL
 * expiry (default 7 days, configurable via QR_FEEDBACK_TTL_MINUTES on the
 * backend). Admin can click "Regenerate" to issue a fresh token if needed
 * (e.g. if the QR was physically damaged or the secret was rotated).
 */
export default function AdminFeedbackQrPage() {
  // ─── Vehicle list state ────────────────────────────────────────
  const [vehicleList, setVehicleList] = useState<VehicleListResult | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ─── Selection + search state ──────────────────────────────────
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── QR generation state ───────────────────────────────────────
  const [generatedQr, setGeneratedQr] = useState<GeneratedQr | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genFieldErrors, setGenFieldErrors] = useState<Record<string, string[]> | undefined>();

  // ─── Fetch the active vehicle list on mount ────────────────────
  // Pull a large page (perPage=200) — even the biggest operators in the
  // region run <100 units. If this ever needs pagination, switch to an
  // infinite-scroll combobox.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const result = await listVehicles({ perPage: 200, status: 'ACTIVE' });
        if (!cancelled) {
          setVehicleList(result);
          // Pre-select the first vehicle so the admin can generate immediately
          // without an extra click on a fresh page load.
          if (result.vehicles.length > 0) {
            setSelectedVehicleId(result.vehicles[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setListError(
            err instanceof Error ? err.message : 'Failed to load vehicles.'
          );
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Filtered vehicle list (search box) ────────────────────────
  const filteredVehicles = useMemo<AdminVehicle[]>(() => {
    const all = vehicleList?.vehicles ?? [];
    if (!searchQuery.trim()) return all;
    const q = searchQuery.trim().toLowerCase();
    return all.filter((v) => {
      const unit = (v.unitNumber ?? '').toLowerCase();
      const plate = (v.plateNumber ?? '').toLowerCase();
      const route = (v.route?.name ?? '').toLowerCase();
      return unit.includes(q) || plate.includes(q) || route.includes(q);
    });
  }, [vehicleList, searchQuery]);

  const selectedVehicle = useMemo<AdminVehicle | null>(() => {
    if (!selectedVehicleId || !vehicleList) return null;
    return vehicleList.vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  }, [selectedVehicleId, vehicleList]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedVehicleId) return;
    setGenLoading(true);
    setGenError(null);
    setGenFieldErrors(undefined);
    try {
      const qr = await generateQr(selectedVehicleId);
      setGeneratedQr(qr);
    } catch (err) {
      if (err instanceof QrGenerateError) {
        setGenError(err.message);
        setGenFieldErrors(err.errors);
        if (err.code === 'unauthenticated') {
          // Session expired — kick to login. The middleware also guards this
          // route, but the API may return 401 before the page-level guard
          // fires if the cookie expired mid-session.
          window.location.href = '/login';
        }
      } else {
        setGenError(
          err instanceof Error ? err.message : 'Failed to generate QR token.'
        );
      }
    } finally {
      setGenLoading(false);
    }
  };

  const handleRegenerate = () => {
    // Re-run the same generate flow — the backend will issue a brand-new
    // token (different `issued_at`, different `expires_at`). The previous
    // token remains valid until its own TTL elapses (stateless tokens can't
    // be revoked individually without rotating the secret).
    void handleGenerate();
  };

  // ─── Render helpers ────────────────────────────────────────────
  const vehicleLabel = selectedVehicle
    ? `Unit ${selectedVehicle.unitNumber ?? '—'} · ${selectedVehicle.plateNumber ?? 'No plate'}${
        selectedVehicle.route?.name ? ` · ${selectedVehicle.route.name}` : ''
      }`
    : '';

  // ─── Loading state ─────────────────────────────────────────────
  if (listLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-[#62A0EA] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading fleet…</p>
      </div>
    );
  }

  // ─── Error state (couldn't load vehicles) ──────────────────────
  if (listError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-slate-300 text-center">Failed to load vehicles.</p>
        <p className="text-slate-500 text-sm text-center">{listError}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-[#62A0EA] text-white rounded-md hover:bg-[#4A8BD4] transition-colors"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  // ─── Empty state (no active vehicles in fleet) ─────────────────
  if (vehicleList && vehicleList.vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <QrCode size={40} className="text-slate-500" />
        <p className="text-slate-300 text-center">No active vehicles in the fleet.</p>
        <p className="text-slate-500 text-sm text-center max-w-md">
          Add vehicles in Fleet Management first — feedback QRs are issued
          per vehicle (jeepney unit).
        </p>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <QrCode size={24} className="text-[#62A0EA]" />
            Feedback QR Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Issue a signed QR per jeepney unit. Place it inside the unit so
            commuters can scan it after their ride to leave feedback.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ─── Left: vehicle picker + generate button ─── */}
        <div className="bg-[#0F1A2E] border border-white/10 rounded-2xl p-6 space-y-5">
          <div>
            <label
              htmlFor="vehicle-search"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Search vehicle
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              />
              <input
                id="vehicle-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by unit, plate, or route…"
                className="w-full bg-[#0B1120] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="vehicle-select"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Select vehicle
            </label>
            <select
              id="vehicle-select"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#62A0EA] transition-colors"
              size={8}
            >
              {filteredVehicles.length === 0 && (
                <option disabled>No vehicles match your search</option>
              )}
              {filteredVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  Unit {v.unitNumber ?? '—'} · {v.plateNumber ?? 'No plate'}
                  {v.route?.name ? ` · ${v.route.name}` : ''}
                </option>
              ))}
            </select>
            <p className="text-white/30 text-xs mt-2">
              {filteredVehicles.length} of {vehicleList?.vehicles.length ?? 0} vehicles shown
            </p>
          </div>

          {/* Selected vehicle preview */}
          {selectedVehicle && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-2">
                Selected unit
              </p>
              <p className="text-white font-semibold text-sm">
                Unit {selectedVehicle.unitNumber ?? '—'}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                Plate: {selectedVehicle.plateNumber ?? 'No plate'}
              </p>
              {selectedVehicle.route && (
                <p className="text-[#62A0EA] text-xs mt-0.5">
                  Route: {selectedVehicle.route.name}
                </p>
              )}
              {selectedVehicle.driver && (
                <p className="text-white/40 text-xs mt-1">
                  Driver: {selectedVehicle.driver.name}
                </p>
              )}
              {selectedVehicle.conductor && (
                <p className="text-white/40 text-xs mt-0.5">
                  Conductor: {selectedVehicle.conductor.name}
                </p>
              )}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedVehicleId || genLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors shadow-lg shadow-[#1A5FB4]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {genLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <QrCode size={16} />
                Generate Feedback QR
              </>
            )}
          </button>

          {/* Generation errors */}
          {genError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-red-300 text-xs font-medium">{genError}</p>
                {genFieldErrors?.vehicle_id && (
                  <ul className="text-red-400/80 text-xs mt-1 list-disc list-inside">
                    {genFieldErrors.vehicle_id.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: QR display (or empty state) ─── */}
        <div>
          {generatedQr ? (
            <QrDisplay
              qr={generatedQr}
              vehicleLabel={vehicleLabel}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <div className="bg-[#0F1A2E] border border-dashed border-white/10 rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <QrCode size={28} className="text-white/30" />
              </div>
              <h3 className="text-white/70 font-semibold text-sm mb-1">
                No QR generated yet
              </h3>
              <p className="text-white/40 text-xs max-w-xs">
                Select a vehicle and click &ldquo;Generate Feedback QR&rdquo;
                to issue a signed QR token.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
