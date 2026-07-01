// src/app/api/admin/sos/route.ts
//
// Admin-facing SOS feed.
//
//   GET /api/admin/sos?status=ACTIVE
//     - Auth: role ADMIN
//     - Returns SOS alerts, newest first.
//     - status filter: ACTIVE (default) | ACKNOWLEDGED | RESOLVED | ALL
//
// The admin monitoring page polls this every 5s and renders each active alert
// as a card + a marker on the live map.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/server/session";

export async function GET(request: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return NextResponse.json({ message: auth.response.statusText }, { status: auth.response.status });

  const { searchParams } = new URL(request.url);
  const statusParam = (searchParams.get("status") ?? "ACTIVE").toUpperCase();

  const where =
    statusParam === "ALL" ? {} : { status: statusParam };

  const alerts = await db.sosAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
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
    })),
  });
}
