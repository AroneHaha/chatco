// src/app/api/admin/sos/[id]/acknowledge/route.ts
//
//   PATCH /api/admin/sos/{id}/acknowledge
//     - Auth: role ADMIN
//     - Flips status ACTIVE -> ACKNOWLEDGED, stamps acknowledgedBy/At.
//     - Idempotent: acknowledging an already-acknowledged alert is a no-op.
//     - Resolved alerts cannot be re-acknowledged (409).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/session";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return NextResponse.json({ message: auth.response.statusText }, { status: auth.response.status });
  const admin = auth.user;

  const { id } = await params;
  const alert = await db.sosAlert.findUnique({ where: { id } });

  if (!alert) {
    return NextResponse.json(
      { message: "SOS alert not found." },
      { status: 404 }
    );
  }

  if (alert.status === "RESOLVED") {
    return NextResponse.json(
      { message: "This SOS alert has already been resolved." },
      { status: 409 }
    );
  }

  if (alert.status === "ACKNOWLEDGED") {
    // Idempotent — return current state.
    return NextResponse.json({ alert: serialize(alert) });
  }

  const updated = await db.sosAlert.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedBy: admin.id,
      acknowledgedAt: new Date(),
    },
  });

  return NextResponse.json({ alert: serialize(updated) });
}

function serialize(a: {
  id: string;
  commuterId: string;
  commuterName: string;
  lat: number;
  lng: number;
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
    message: a.message,
    status: a.status as "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED",
    acknowledgedBy: a.acknowledgedBy,
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    resolvedBy: a.resolvedBy,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}
