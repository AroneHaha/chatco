// src/app/api/admin/sos/[id]/resolve/route.ts
//
//   PATCH /api/admin/sos/{id}/resolve
//     - Auth: role ADMIN
//     - Flips status -> RESOLVED, stamps resolvedBy/At.
//     - Idempotent: resolving an already-resolved alert is a no-op.
//     - Moves the alert off the active feed (admin poll no longer returns it
//       when status=ACTIVE) and into the SOS History panel.

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
    return NextResponse.json({ alert: serialize(alert) });
  }

  const now = new Date();
  const updated = await db.sosAlert.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedBy: admin.id,
      resolvedAt: now,
      // Auto-stamp acknowledgedAt if the admin skipped straight to resolve.
      acknowledgedBy: alert.acknowledgedBy ?? admin.id,
      acknowledgedAt: alert.acknowledgedAt ?? now,
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
    acknowledgedBy: a.acknowledgedBy,
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    resolvedBy: a.resolvedBy,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}
