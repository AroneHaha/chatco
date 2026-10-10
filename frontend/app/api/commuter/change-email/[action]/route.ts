import { NextResponse, type NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

const actions = new Set(["start", "send-code", "verify-identity", "confirm", "cancel"]);

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action)) return NextResponse.json({ message: "Not found." }, { status: 404 });
  return proxyToLaravel(request, `${API_V1}/commuter/change-email/${action}`, {
    method: "POST",
    body: await request.text(),
  });
}
