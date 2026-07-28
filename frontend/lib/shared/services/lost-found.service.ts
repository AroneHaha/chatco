/**
 * Shared Lost & Found service (S6-T8).
 *
 * Single CRUD gateway used by BOTH the commuter lost-and-found page and the
 * admin lost-found page. Calls the Next.js proxy routes (which forward to
 * Laravel with the httpOnly `chatco_session` cookie) — never Laravel directly.
 *
 *   COMMUTER (role:COMMUTER for claim/watch; any auth role for browse):
 *     GET  /api/lost-found                         → list({ status?, category?, search?, page? })
 *     GET  /api/lost-found/{id}                    → show(id)
 *     POST /api/lost-found/{id}/claim              → claim(id, { proof, contact?, email? })
 *
 *   ADMIN (role:ADMIN):
 *     GET  /api/admin/lost-items                   → listForAdmin({ status?, category?, page? })
 *     POST /api/admin/lost-items                   → report({ itemName, description, ... })
 *     GET  /api/admin/lost-items/{id}/claims       → claimsForItem(id)
 *     PATCH /api/admin/lost-items/{id}/claims/{cid}/approve   → approveClaim(id, cid)
 *     PATCH /api/admin/lost-items/{id}/claims/{cid}/release   → releaseClaim(id, cid)
 *     PATCH /api/admin/lost-items/{id}/claims/{cid}/reject    → rejectClaim(id, cid, reason?)
 *     PATCH /api/admin/lost-items/{id}/close                  → close(id)
 *
 * Responsibilities:
 *   - Map snake_case Laravel rows → camelCase view-models the existing UI uses.
 *   - Translate backend HTTP codes (404/409/422/403/401) into typed error
 *     codes so the UI can branch without parsing strings.
 *   - Map the backend's status enum (AVAILABLE/CLAIMED/APPROVED/RELEASED/
 *     CLOSED for items; PENDING/APPROVED/REJECTED for claims) to the
 *     display strings the existing admin UI expects (Unmatched/Claimed/
 *     Released/Returned/Rejected for items; Pending/Approved/Rejected/
 *     Released/Returned for claims).
 *
 * Mirrors the pattern established by lib/commuter/services/feedback.service.ts.
 */

import { api, ApiError } from "@/lib/api/client";

// ─── Backend status enums ────────────────────────────────────────────

/**
 * Backend lost_items.status values (LostItemService constants).
 * The commuter list defaults to AVAILABLE/CLAIMED (active items).
 */
export type BackendItemStatus =
  | "AVAILABLE"
  | "CLAIMED"
  | "APPROVED"
  | "RELEASED"
  | "CLOSED";

/** Backend claims.status values. */
export type BackendClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

// ─── Raw backend shapes ─────────────────────────────────────────────

/** A lost_items row as returned by Laravel (snake_case). */
interface RawLostItem {
  id: string;
  item_name: string;
  description: string;
  image_url: string | null;
  plate_number: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  vehicle_id: string | null;
  estimated_time_lost: string | null;
  category: string | null;
  reported_by_id: string | null;
  reported_by_role: string | null;
  reporter_name: string | null;
  status: string;
  claimed_by: string | null;
  released_to: string | null;
  released_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Eager-loaded only on the admin list (listForAdmin)
  claims?: RawClaim[];
}

/** A claims row as returned by Laravel (snake_case). */
interface RawClaim {
  id: string;
  item_id: string;
  claimant_id: string | null;
  claimant_name: string | null;
  claimant_contact: string | null;
  claimant_email: string | null;
  status: string;
  proof: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Eager-loaded on GET /commuter/claims (myClaims)
  item?: RawLostItem | null;
}

/** A lost_item_watchlists row as returned by Laravel (snake_case). */
interface RawWatchlistEntry {
  id: string;
  item_id: string;
  commuter_id: string;
  created_at: string;
  // Eager-loaded on GET /commuter/watchlist
  item?: RawLostItem | null;
}

/** Laravel ApiResponse envelope. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

/** Laravel paginator shape (data is the array of rows). */
interface PaginatedEnvelope<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

// ─── Frontend view-models (camelCase) ───────────────────────────────

/**
 * A lost item, in the shape the existing commuter + admin UIs consume.
 * Kept compatible with the legacy `LostItem` / `LostFoundItem` interfaces
 * so we don't have to rewrite the card/grid components.
 */
export interface LostFoundItem {
  id: string;
  itemName: string;
  description: string;
  imageUrl: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  vehicleId: string | null;
  estimatedTimeLost: string;
  category: string;
  datePosted: string;
  reporterName: string;
  /** Raw backend status (AVAILABLE/CLAIMED/APPROVED/RELEASED/CLOSED). */
  status: string;
  /** Display status for the admin UI (Unmatched/Claimed/Released/Returned/Closed). */
  displayStatus: string;
  /** Claimant name (admin-only; null for commuters — privacy). */
  claimedBy: string | null;
  /** Who the item was released to (admin-only). */
  releasedTo: string | null;
  releasedAt: string | null;
  closedAt: string | null;
}

/** A claim on a lost item. */
export interface LostFoundClaim {
  id: string;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  claimantEmail: string | null;
  claimDate: string;
  /** Raw backend status (PENDING/APPROVED/REJECTED). */
  status: string;
  /** Display status for the admin UI (Pending/Approved/Rejected). */
  displayStatus: string;
  proof: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
}

/** Paginated list result. */
export interface LostFoundPage {
  items: LostFoundItem[];
  page: number;
  lastPage: number;
  total: number;
}

/** One of the commuter's own claims, with the claimed item attached. */
export type MyClaim = LostFoundClaim & { item: LostFoundItem | null };

// ─── Typed errors ───────────────────────────────────────────────────

export type LostFoundErrorCode =
  /** 404 — item or claim not found. */
  | "not_found"
  /** 409 — conflict (e.g. claiming an already-CLAIMED/APPROVED item). */
  | "conflict"
  /** 422 — validation (missing proof, bad field, etc.). */
  | "validation"
  /** 403 — caller lacks the role (e.g. commuter hitting admin endpoint). */
  | "forbidden"
  /** 401 — session expired. */
  | "unauthenticated"
  /** 5xx / network failure. */
  | "network";

/**
 * Thrown by any service method on a non-success response. Carries a stable
 * `code` so the UI can branch (e.g. 409 conflict → "Item already claimed"
 * inline; 401 → redirect to login).
 */
export class LostFoundOperationError extends Error {
  constructor(
    public code: LostFoundErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LostFoundOperationError";
  }
}

// ─── Status mappers ─────────────────────────────────────────────────

/**
 * Map a backend item status → the display string the admin UI badge expects.
 *
 * Backend → Admin display:
 *   AVAILABLE → Unmatched (no claims yet)
 *   CLAIMED   → Claimed    (≥1 pending claim)
 *   APPROVED  → Claimed    (a claim was approved; transient — release follows)
 *   RELEASED  → Released   (handed over to the claimant)
 *   CLOSED    → Closed     (admin closed the item after handover)
 *
 * The commuter UI uses its own status badge logic (it only sees AVAILABLE
 * vs CLAIMED in the default list, both shown as "active").
 */
function mapItemDisplayStatus(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "Unmatched";
    case "CLAIMED":
    case "APPROVED":
      return "Claimed";
    case "RELEASED":
      return "Released";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

/** Map a backend claim status → the display string the admin UI expects. */
function mapClaimDisplayStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

// ─── Row mappers ────────────────────────────────────────────────────

function mapItem(raw: RawLostItem): LostFoundItem {
  return {
    id: raw.id,
    itemName: raw.item_name ?? "Unknown item",
    description: raw.description ?? "",
    imageUrl: raw.image_url ?? "",
    plateNumber: raw.plate_number ?? "—",
    driverName: raw.driver_name ?? "—",
    conductorName: raw.conductor_name ?? "—",
    vehicleId: raw.vehicle_id ?? null,
    estimatedTimeLost: raw.estimated_time_lost ?? "—",
    category: raw.category ?? "OTHER",
    datePosted: raw.created_at,
    reporterName: raw.reporter_name ?? "Admin",
    status: raw.status,
    displayStatus: mapItemDisplayStatus(raw.status),
    claimedBy: raw.claimed_by,
    releasedTo: raw.released_to,
    releasedAt: raw.released_at,
    closedAt: raw.closed_at,
  };
}

function mapClaim(raw: RawClaim): LostFoundClaim {
  return {
    id: raw.id,
    itemId: raw.item_id,
    claimantName: raw.claimant_name ?? "Unknown",
    claimantContact: raw.claimant_contact ?? "—",
    claimantEmail: raw.claimant_email ?? null,
    claimDate: raw.created_at,
    status: raw.status,
    displayStatus: mapClaimDisplayStatus(raw.status),
    proof: raw.proof ?? "",
    rejectionReason: raw.rejection_reason ?? null,
    reviewedAt: raw.reviewed_at,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Extract the human message from an ApiError body (Laravel envelope). */
function readMessage(err: ApiError, fallback: string): string {
  const body = err.body as { message?: string } | null;
  return body?.message ?? fallback;
}

/** Map an ApiError to a typed LostFoundOperationError. */
function classifyError(err: ApiError, fallback: string): LostFoundOperationError {
  const message = readMessage(err, fallback);
  switch (err.status) {
    case 404:
      return new LostFoundOperationError("not_found", message);
    case 409:
      return new LostFoundOperationError("conflict", message);
    case 422:
      return new LostFoundOperationError("validation", message);
    case 403:
      return new LostFoundOperationError("forbidden", message);
    case 401:
      return new LostFoundOperationError("unauthenticated", message);
    default:
      return new LostFoundOperationError("network", message);
  }
}

/** Build a query string from an optional params object, skipping empties. */
function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Service: browse (any auth role) ────────────────────────────────

/**
 * Fetch a paginated list of lost items (the public browse endpoint).
 *
 * @throws {LostFoundOperationError} 401/403/5xx
 */
export async function list(params: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<LostFoundPage> {
  const qs = buildQuery({
    status: params.status,
    category: params.category === "ALL" ? undefined : params.category,
    search: params.search,
    page: params.page,
    per_page: params.perPage,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawLostItem>>>(
      `/api/lost-found${qs}`
    );
    const p = response.data;
    return {
      items: (p?.data ?? []).map(mapItem),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load lost & found items.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Fetch a paginated list of lost items WITH claims eager-loaded (admin view).
 *
 * @throws {LostFoundOperationError} 401/403/5xx
 */
export async function listForAdmin(params: {
  status?: string;
  category?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<LostFoundPage & { items: (LostFoundItem & { claims: LostFoundClaim[] })[] }> {
  const qs = buildQuery({
    status: params.status,
    category: params.category === "ALL" ? undefined : params.category,
    page: params.page,
    per_page: params.perPage,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawLostItem>>>(
      `/api/admin/lost-items${qs}`
    );
    const p = response.data;
    return {
      items: (p?.data ?? []).map((raw) => ({
        ...mapItem(raw),
        claims: (raw.claims ?? []).map(mapClaim),
      })),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load lost & found items.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Fetch a single lost item by ID (detail view).
 * @throws {LostFoundOperationError} 404/401/5xx
 */
export async function show(id: string): Promise<LostFoundItem> {
  try {
    const response = await api.get<ApiResponseEnvelope<RawLostItem>>(`/api/lost-found/${id}`);
    return mapItem(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load this item.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Service: commuter watchlist + own claims (DB-backed) ───────────

/**
 * Add an item to the commuter's watchlist (idempotent on the backend).
 * @throws {LostFoundOperationError} 404/401/403/5xx
 */
export async function watch(itemId: string): Promise<void> {
  try {
    await api.post<ApiResponseEnvelope<unknown>>(`/api/lost-found/${itemId}/watchlist`);
  } catch (err) {
    if (err instanceof ApiError) throw classifyError(err, "Unable to add to watchlist.");
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Remove an item from the commuter's watchlist (idempotent on the backend).
 * @throws {LostFoundOperationError} 401/403/5xx
 */
export async function unwatch(itemId: string): Promise<void> {
  try {
    await api.delete<ApiResponseEnvelope<unknown>>(`/api/lost-found/${itemId}/watchlist`);
  } catch (err) {
    if (err instanceof ApiError) throw classifyError(err, "Unable to remove from watchlist.");
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * The commuter's watchlisted items (paginated, newest first). Entries whose
 * item was deleted are dropped.
 * @throws {LostFoundOperationError} 401/403/5xx
 */
export async function myWatchlist(params: {
  page?: number;
  perPage?: number;
} = {}): Promise<LostFoundPage> {
  const qs = buildQuery({ page: params.page, per_page: params.perPage });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawWatchlistEntry>>>(
      `/api/commuter/watchlist${qs}`
    );
    const p = response.data;
    return {
      items: (p?.data ?? [])
        .map((entry) => (entry.item ? mapItem(entry.item) : null))
        .filter((item): item is LostFoundItem => item !== null),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof ApiError) throw classifyError(err, "Unable to load your watchlist.");
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * The commuter's own claims (item eager-loaded), newest first. Powers the
 * "My Claims" tab + per-card badges — claim state lives in the DB, not React.
 * @throws {LostFoundOperationError} 401/403/5xx
 */
export async function myClaims(): Promise<MyClaim[]> {
  try {
    const response = await api.get<ApiResponseEnvelope<RawClaim[]>>(`/api/commuter/claims`);
    return (response.data ?? []).map((raw) => ({
      ...mapClaim(raw),
      item: raw.item ? mapItem(raw.item) : null,
    }));
  } catch (err) {
    if (err instanceof ApiError) throw classifyError(err, "Unable to load your claims.");
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Withdraw the commuter's own PENDING claim (deletes the claim row; the item
 * reverts to AVAILABLE when it was the last pending claim).
 * @throws {LostFoundOperationError} 404 (not found/not owned)/422 (not PENDING)/401/403/5xx
 */
export async function cancelClaim(claimId: string): Promise<void> {
  try {
    await api.delete<ApiResponseEnvelope<unknown>>(`/api/lost-found/claims/${claimId}`);
  } catch (err) {
    if (err instanceof ApiError) throw classifyError(err, "Unable to cancel this claim.");
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Service: admin report (POST /admin/lost-items) ─────────────────

/**
 * Admin reports a new lost item.
 *
 * @throws {LostFoundOperationError} 422/401/403/5xx
 */
export async function report(params: {
  itemName: string;
  description: string;
  imageUrl?: string;
  plateNumber?: string;
  driverName?: string;
  conductorName?: string;
  vehicleId?: string;
  estimatedTimeLost?: string;
  category?: string;
}): Promise<LostFoundItem> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawLostItem>>(`/api/admin/lost-items`, {
      item_name: params.itemName,
      description: params.description,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      ...(params.plateNumber ? { plate_number: params.plateNumber } : {}),
      ...(params.driverName ? { driver_name: params.driverName } : {}),
      ...(params.conductorName ? { conductor_name: params.conductorName } : {}),
      ...(params.vehicleId ? { vehicle_id: params.vehicleId } : {}),
      ...(params.estimatedTimeLost ? { estimated_time_lost: params.estimatedTimeLost } : {}),
      ...(params.category ? { category: params.category } : {}),
    });
    return mapItem(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to report this item.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Admin uploads/replaces the photo of a lost item (multipart).
 *
 * Uses raw fetch instead of the shared api client — the client always sends
 * `Content-Type: application/json`, which breaks multipart (the browser must
 * set the boundary itself). Field name + limits per the backend
 * UploadLostItemImageRequest: `image`, jpg/jpeg/png/webp, max 5MB.
 *
 * @throws {LostFoundOperationError} 404/422 (bad type or >5MB)/401/403/5xx
 */
export async function uploadImage(itemId: string, file: File): Promise<LostFoundItem> {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await fetch(`/api/admin/lost-items/${itemId}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw classifyError(
        new ApiError(res.status, res.statusText, body),
        "Unable to upload the item photo."
      );
    }
    const envelope = body as ApiResponseEnvelope<RawLostItem>;
    return mapItem(envelope.data);
  } catch (err) {
    if (err instanceof LostFoundOperationError) throw err;
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Service: commuter claim (POST /lost-found/{id}/claim) ──────────

/**
 * Commuter submits a claim on a lost item with proof of ownership.
 *
 * @throws {LostFoundOperationError}
 *   - 409 → conflict (item already CLAIMED/APPROVED/RELEASED/CLOSED)
 *   - 422 → validation (proof missing/too long)
 *   - 403 → non-commuter
 *   - 401 → unauthenticated
 */
export async function claim(
  itemId: string,
  params: { proof: string; contact?: string; email?: string }
): Promise<LostFoundClaim> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawClaim>>(
      `/api/lost-found/${itemId}/claim`,
      {
        proof: params.proof,
        ...(params.contact ? { claimant_contact: params.contact } : {}),
        ...(params.email ? { claimant_email: params.email } : {}),
      }
    );
    return mapClaim(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to submit this claim.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Service: admin claim review (PATCH /admin/lost-items/{id}/claims/{cid}/...) ─

/**
 * Fetch all claims for an item (admin view — shows claimant info).
 * @throws {LostFoundOperationError} 404/401/403/5xx
 */
export async function claimsForItem(itemId: string): Promise<LostFoundClaim[]> {
  try {
    const response = await api.get<ApiResponseEnvelope<RawClaim[]>>(
      `/api/admin/lost-items/${itemId}/claims`
    );
    return (response.data ?? []).map(mapClaim);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load claims for this item.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

export async function recordManualClaim(
  itemId: string,
  input: { name: string; contact?: string; email?: string; proof: string },
): Promise<LostFoundClaim> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawClaim>>(
      `/api/admin/lost-items/${itemId}/claims/manual`,
      {
        claimant_name: input.name,
        claimant_contact: input.contact || null,
        claimant_email: input.email || null,
        proof: input.proof,
      },
    );
    return mapClaim(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to record this walk-in claimant.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service.",
    );
  }
}

/**
 * Approve a pending claim. Flips the item → APPROVED (ready for release).
 * @throws {LostFoundOperationError} 404/422 (claim not PENDING)/401/403/5xx
 */
export async function approveClaim(itemId: string, claimId: string): Promise<LostFoundClaim> {
  try {
    const response = await api.patch<ApiResponseEnvelope<RawClaim>>(
      `/api/admin/lost-items/${itemId}/claims/${claimId}/approve`
    );
    return mapClaim(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to approve this claim.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Release an approved claim — records the handover (released_to + released_at).
 * Flips the item → RELEASED.
 * @throws {LostFoundOperationError} 404/422 (claim not APPROVED)/401/403/5xx
 */
export async function releaseClaim(itemId: string, claimId: string): Promise<LostFoundClaim> {
  try {
    const response = await api.patch<ApiResponseEnvelope<RawClaim>>(
      `/api/admin/lost-items/${itemId}/claims/${claimId}/release`
    );
    return mapClaim(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to release this claim.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Reject a pending or approved claim. Records an optional rejection_reason.
 * @throws {LostFoundOperationError} 404/422/401/403/5xx
 */
export async function rejectClaim(
  itemId: string,
  claimId: string,
  rejectionReason?: string
): Promise<LostFoundClaim> {
  try {
    const response = await api.patch<ApiResponseEnvelope<RawClaim>>(
      `/api/admin/lost-items/${itemId}/claims/${claimId}/reject`,
      {
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      }
    );
    return mapClaim(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to reject this claim.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Close a released item (admin finalizes after handover).
 * Flips the item → CLOSED.
 * @throws {LostFoundOperationError} 404/422 (item not RELEASED)/401/403/5xx
 */
export async function close(itemId: string): Promise<LostFoundItem> {
  try {
    const response = await api.patch<ApiResponseEnvelope<RawLostItem>>(
      `/api/admin/lost-items/${itemId}/close`
    );
    return mapItem(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to close this item.");
    }
    throw new LostFoundOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
