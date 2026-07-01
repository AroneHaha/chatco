// src/app/api/commuter/sos/[id]/route.ts
//
// Commuter polls their own SOS alert to learn when the admin responds.
//
//   GET /api/commuter/sos/{id}
//     - Auth: role COMMUTER, must own the alert.
//     - Returns the alert (status ACTIVE / ACKNOWLEDGED / RESOLVED).
//
// The commuter modal polls this every few seconds after triggering; when the
// status flips to ACKNOWLEDGED or RESOLVED, the modal switches to the
// "responded" screen.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("COMMUTER");
  if (!auth.ok) return NextResponse.json({ message: auth.response.statusText }, { status: auth.response.status });
  const commuter = auth.user;

  const { id } = await params;
  const alert = await db.sosAlert.findUnique({ where: { id } });

  if (!alert) {
    return NextResponse.json(
      { message: "SOS alert not found." },
      { status: 404 }
    );
  }

  // Privacy: a commuter may only read their own alert.
  if (alert.commuterId !== commuter.id) {
    return NextResponse.json(
      { message: "SOS alert not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    alert: {
      id: alert.id,
      commuterId: alert.commuterId,
      commuterName: alert.commuterName,
      lat: alert.lat,
      lng: alert.lng,
      approximate: alert.approximate,
      message: alert.message,
      status: alert.status as "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED",
      acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      createdAt: alert.createdAt.toISOString(),
    },
  });
}
