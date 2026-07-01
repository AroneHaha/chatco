// src/app/api/commuter/sos/route.ts
//
// Commuter-facing SOS endpoint.
//
//   POST /api/commuter/sos
//     - Auth: role COMMUTER (parsed from chatco_session cookie)
//     - Body: { lat: number, lng: number, message?: string }
//     - Creates an SosAlert with status ACTIVE.
//     - If the commuter already has an ACTIVE/ACKNOWLEDGED alert, returns the
//       existing one (200) so the modal can resume polling instead of creating
//       duplicates (one active SOS per commuter at a time).
//     - Returns 201 (new) or 200 (resumed) with the alert payload.
//
// Coordinates are captured client-side via navigator.geolocation before the
// POST — see src/components/commuter/modals/sos-modal.tsx.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/session";

// Commuter profile is a mock in the auth context (src/contexts/auth-context.tsx).
// For the admin feed we want a friendly name. We keep a small mirror here so the
// admin sees "Arone Dela Cruz" instead of "u_1". When the real user table lands,
// this lookup is replaced by a DB join.
const COMMUTER_NAMES: Record<string, string> = {
  u_1: "Arone Dela Cruz",
};

function nameFor(id: string): string {
  return COMMUTER_NAMES[id] ?? `Commuter ${id}`;
}

export async function POST(request: Request) {
  const auth = await requireRole("COMMUTER");
  if (!auth.ok) return NextResponse.json({ message: auth.response.statusText }, { status: auth.response.status });
  const commuter = auth.user;

  // ── Parse + validate body ──
  let body: { lat?: unknown; lng?: unknown; message?: unknown; approximate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { lat, lng, message, approximate } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json(
      { message: "Valid lat and lng coordinates are required." },
      { status: 422 }
    );
  }

  const messageStr =
    typeof message === "string" ? message.trim().slice(0, 500) : null;
  // `approximate` is true when the commuter's GPS was unavailable and the
  // client fell back to a default route-centre coordinate. Defaults to false.
  const approximateBool = approximate === true;

  // ── One active SOS per commuter ──
  const existing = await db.sosAlert.findFirst({
    where: {
      commuterId: commuter.id,
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    // Resume the existing alert — don't create a duplicate.
    return NextResponse.json({ alert: serializeAlert(existing) }, { status: 200 });
  }

  // ── Create the new alert ──
  const alert = await db.sosAlert.create({
    data: {
      commuterId: commuter.id,
      commuterName: nameFor(commuter.id),
      lat,
      lng,
      approximate: approximateBool,
      message: messageStr,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ alert: serializeAlert(alert) }, { status: 201 });
}

function serializeAlert(a: {
  id: string;
  commuterId: string;
  commuterName: string;
  lat: number;
  lng: number;
  approximate: boolean;
  message: string | null;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    commuterId: a.commuterId,
    commuterName: a.commuterName,
    lat: a.lat,
    lng: a.lng,
    approximate: a.approximate,
    message: a.message,
    status: a.status as "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED",
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}
